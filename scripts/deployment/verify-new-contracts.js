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
 * Verify all newly deployed contracts on the Sonic blockchain explorer
 */
async function main() {
  console.log("🔍 Verifying newly deployed contracts on Sonic blockchain explorer...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);

    // Load deployment addresses
    const deploymentFile = "deployment-addresses-sonic-new.json";
    let addresses = {};
    
    try {
      if (fs.existsSync(deploymentFile)) {
        addresses = JSON.parse(fs.readFileSync(deploymentFile));
        console.log("📝 Loaded deployment addresses");
      } else {
        console.error("❌ No deployment addresses file found");
        console.log("👉 Please run complete-reddragon-redeployment.js first");
        return;
      }
    } catch (error) {
      console.error("❌ Error loading deployment addresses:", error);
      return;
    }
    
    // Check for required addresses
    const requiredAddresses = [
      "redDragon", "lottery", "verifier", "multiSig", 
      "jackpotVault", "liquidityVault", "developmentVault"
    ];
    
    const missingAddresses = [];
    for (const key of requiredAddresses) {
      if (!addresses[key]) missingAddresses.push(key);
    }
    
    if (missingAddresses.length > 0) {
      console.error(`❌ Missing required addresses: ${missingAddresses.join(", ")}`);
      return;
    }
    
    // Define contracts to verify with their constructor arguments
    const verificationTasks = [
      {
        name: "RedDragonMultiSig",
        address: addresses.multiSig,
        constructorArgs: [
          [
            process.env.MULTISIG_OWNER_1 || deployer.address,
            process.env.MULTISIG_OWNER_2 || "0xB05Cf01231cF2fF99499682E64D3780d57c80FdD",
            process.env.MULTISIG_OWNER_3 || "0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F"
          ],
          process.env.MULTISIG_REQUIRED_CONFIRMATIONS || 2
        ],
        contract: "contracts/RedDragonMultiSig.sol:RedDragonMultiSig"
      },
      {
        name: "RedDragonJackpotVault",
        address: addresses.jackpotVault,
        constructorArgs: [addresses.wrappedSonic, addresses.multiSig],
        contract: "contracts/RedDragonJackpotVault.sol:RedDragonJackpotVault"
      },
      {
        name: "RedDragonLiquidityVault",
        address: addresses.liquidityVault,
        constructorArgs: [addresses.wrappedSonic, addresses.router, addresses.multiSig],
        contract: "contracts/RedDragonLiquidityVault.sol:RedDragonLiquidityVault"
      },
      {
        name: "RedDragonDevelopmentVault",
        address: addresses.developmentVault,
        constructorArgs: [addresses.wrappedSonic, addresses.multiSig],
        contract: "contracts/RedDragonDevelopmentVault.sol:RedDragonDevelopmentVault"
      },
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
    
    console.log("\n⚠️ Important Next Steps:");
    console.log("1. Set up exchange pair for the new token");
    console.log("2. Enable trading on the token");
    console.log("3. Create a budget in the development vault");
    console.log("4. Test jackpot forwarding from the vault to the lottery");
    
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