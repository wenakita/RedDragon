const hre = require("hardhat");
const fs = require('fs');
const path = require('path');
require("dotenv").config();

/**
 * Creates a verification argument file for a contract
 */
function createVerificationFile(contractName, args) {
  const dir = path.join(__dirname, '..', 'verification-arguments');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const filePath = path.join(dir, `${contractName.toLowerCase()}.js`);
  const content = `module.exports = ${JSON.stringify(args, null, 2)};`;
  
  fs.writeFileSync(filePath, content);
  return filePath;
}

/**
 * Verify all deployed contracts on the Sonic blockchain explorer
 */
async function main() {
  console.log("🔍 Verifying contracts on Sonic blockchain explorer...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);

    // Load deployment addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    let addresses = {};
    
    try {
      if (fs.existsSync(deploymentFile)) {
        addresses = JSON.parse(fs.readFileSync(deploymentFile));
        console.log("📝 Loaded existing deployment addresses");
      } else {
        console.error("❌ No deployment addresses file found");
        return;
      }
    } catch (error) {
      console.error("❌ Error loading deployment addresses:", error);
      return;
    }
    
    // Check for required addresses
    const missingAddresses = [];
    if (!addresses.redDragon) missingAddresses.push("redDragon");
    if (!addresses.lottery) missingAddresses.push("lottery");
    if (!addresses.verifier) missingAddresses.push("verifier");
    
    if (missingAddresses.length > 0) {
      console.error(`❌ Missing required addresses: ${missingAddresses.join(", ")}`);
      return;
    }
    
    // Define contracts to verify with their constructor arguments
    const verificationTasks = [
      {
        name: "RedDragonPaintSwapVerifier",
        address: addresses.verifier,
        constructorArgs: [],
        contract: "contracts/RedDragonPaintSwapVerifier.sol:RedDragonPaintSwapVerifier"
      },
      {
        name: "RedDragonSwapLottery",
        address: addresses.lottery,
        constructorArgs: [addresses.wrappedSonic, addresses.verifier],
        contract: "contracts/RedDragonSwapLottery.sol:RedDragonSwapLottery"
      },
      {
        name: "RedDragon",
        address: addresses.redDragon,
        constructorArgs: [
          addresses.jackpotVault,
          addresses.liquidityVault,
          addresses.burnAddress,
          addresses.developmentVault,
          addresses.wrappedSonic
        ],
        contract: "contracts/RedDragon.sol:RedDragon"
      }
    ];
    
    // Add optional contracts if they exist
    if (addresses.lpBooster) {
      verificationTasks.push({
        name: "RedDragonLPBooster",
        address: addresses.lpBooster,
        constructorArgs: [addresses.lottery],
        contract: "contracts/RedDragonLPBooster.sol:RedDragonLPBooster"
      });
    }
    
    if (addresses.ve8020) {
      verificationTasks.push({
        name: "ve8020",
        address: addresses.ve8020,
        constructorArgs: [addresses.redDragon],
        contract: "contracts/ve8020.sol:ve8020"
      });
    }
    
    if (addresses.feeManager) {
      verificationTasks.push({
        name: "RedDragonFeeManager",
        address: addresses.feeManager,
        constructorArgs: [addresses.redDragon, addresses.wrappedSonic, addresses.burnAddress],
        contract: "contracts/RedDragonFeeManager.sol:RedDragonFeeManager"
      });
    }
    
    if (addresses.ve8020FeeDistributor) {
      verificationTasks.push({
        name: "Ve8020FeeDistributor",
        address: addresses.ve8020FeeDistributor,
        constructorArgs: [addresses.ve8020, addresses.wrappedSonic],
        contract: "contracts/Ve8020FeeDistributor.sol:Ve8020FeeDistributor"
      });
    }
    
    if (addresses.multiSig) {
      // For MultiSig, we need to get the constructor arguments at runtime
      try {
        const multiSig = await hre.ethers.getContractAt("RedDragonMultiSig", addresses.multiSig);
        const owners = await Promise.all(Array.from({length: 10}, (_, i) => multiSig.owners(i).catch(() => null)));
        const validOwners = owners.filter(owner => owner !== null);
        const confirmations = await multiSig.required();
        
        verificationTasks.push({
          name: "RedDragonMultiSig",
          address: addresses.multiSig,
          constructorArgs: [validOwners, confirmations],
          contract: "contracts/RedDragonMultiSig.sol:RedDragonMultiSig"
        });
      } catch (error) {
        console.error(`❌ Error retrieving MultiSig constructor arguments: ${error.message}`);
      }
    }
    
    // Verify each contract
    console.log("\n🔄 Starting contract verification...");
    
    for (const task of verificationTasks) {
      try {
        console.log(`\nVerifying ${task.name} at ${task.address}...`);
        console.log(`Constructor arguments: ${JSON.stringify(task.constructorArgs)}`);
        
        // Create verification argument file
        const argsFile = createVerificationFile(task.name, task.constructorArgs);
        console.log(`Created verification arguments file at: ${argsFile}`);
        
        // First check if the contract is already verified
        const url = `https://sonicscan.org/address/${task.address}#code`;
        console.log(`Verification can be checked at: ${url}`);
        
        // Try to verify the contract
        try {
          await hre.run("verify:verify", {
            address: task.address,
            constructorArguments: task.constructorArgs,
            contract: task.contract
          });
          console.log(`✅ ${task.name} verified successfully!`);
        } catch (verifyError) {
          if (verifyError.message.includes("already verified") || verifyError.message.includes("Already Verified")) {
            console.log(`✅ ${task.name} is already verified.`);
          } else {
            console.log(`Attempting verification with explicit constructor arguments file...`);
            try {
              // Try using npx hardhat verify command instead
              const cmd = `npx hardhat verify --network sonic ${task.address} --constructor-args ${argsFile}`;
              console.log(`Running: ${cmd}`);
              require('child_process').execSync(cmd, { stdio: 'inherit' });
              console.log(`✅ ${task.name} verified successfully with explicit constructor args!`);
            } catch (cmdError) {
              console.error(`❌ Failed to verify ${task.name} with explicit constructor args: ${cmdError.message}`);
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error verifying ${task.name}: ${error.message}`);
      }
    }
    
    console.log("\n🎉 Contract verification process completed!");
    
  } catch (error) {
    console.error("❌ Verification failed:", error);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 