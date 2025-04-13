const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Verify all deployed contracts in the vault system
 */
async function main() {
  console.log("🔍 Verifying vault system contracts...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("\n👤 Using account:", deployer.address);
    
    // Load deployment addresses
    const deploymentFile = "deployment-addresses-sonic-new.json";
    let addresses = {};
    
    try {
      if (fs.existsSync(deploymentFile)) {
        addresses = JSON.parse(fs.readFileSync(deploymentFile));
        console.log("📝 Loaded deployment addresses");
      } else {
        console.error("❌ No deployment addresses file found");
        return;
      }
    } catch (error) {
      console.error("❌ Error loading deployment addresses:", error);
      return;
    }
    
    // Define verification tasks
    const verificationTasks = [];
    
    // 1. JackpotVault
    if (addresses.jackpotVault) {
      verificationTasks.push({
        name: "JackpotVault",
        address: addresses.jackpotVault,
        constructorArgs: [
          addresses.wrappedSonic,
          addresses.multiSig
        ],
        contract: "contracts/RedDragonJackpotVault.sol:RedDragonJackpotVault"
      });
    }
    
    // 2. LiquidityVault
    if (addresses.liquidityVault) {
      verificationTasks.push({
        name: "LiquidityVault",
        address: addresses.liquidityVault,
        constructorArgs: [
          addresses.wrappedSonic,
          addresses.router,
          addresses.multiSig
        ],
        contract: "contracts/RedDragonLiquidityVault.sol:RedDragonLiquidityVault"
      });
    }
    
    // 3. DevelopmentVault
    if (addresses.developmentVault) {
      verificationTasks.push({
        name: "DevelopmentVault",
        address: addresses.developmentVault,
        constructorArgs: [
          addresses.wrappedSonic,
          addresses.multiSig
        ],
        contract: "contracts/RedDragonDevelopmentVault.sol:RedDragonDevelopmentVault"
      });
    }
    
    // 4. MultiSig
    if (addresses.multiSig) {
      // Get multisig owners and required confirmations
      const multiSig = await hre.ethers.getContractAt("RedDragonMultiSig", addresses.multiSig);
      const owners = [];
      let i = 0;
      let ownerAddress = null;
      
      try {
        while (i < 10) { // Reasonable limit to check for owners
          ownerAddress = await multiSig.owners(i);
          if (ownerAddress) owners.push(ownerAddress);
          i++;
        }
      } catch (e) {
        // Reached the end of owners array
      }
      
      const requiredConfirmations = await multiSig.required();
      
      verificationTasks.push({
        name: "MultiSig",
        address: addresses.multiSig,
        constructorArgs: [
          owners,
          requiredConfirmations
        ],
        contract: "contracts/RedDragonMultiSig.sol:RedDragonMultiSig"
      });
    }
    
    // 5. RedDragon Token
    if (addresses.redDragon) {
      verificationTasks.push({
        name: "RedDragon Token",
        address: addresses.redDragon,
        constructorArgs: [
          addresses.jackpotVault,
          addresses.liquidityVault,
          addresses.burnAddress,
          addresses.developmentVault,
          addresses.wrappedSonic
        ],
        contract: "contracts/RedDragon.sol:RedDragon"
      });
    }
    
    // 6. PaintSwap Verifier
    if (addresses.verifier) {
      verificationTasks.push({
        name: "PaintSwap Verifier",
        address: addresses.verifier,
        constructorArgs: [],
        contract: "contracts/RedDragonPaintSwapVerifier.sol:RedDragonPaintSwapVerifier"
      });
    }
    
    // 7. PaintSwap Lottery
    if (addresses.lottery) {
      verificationTasks.push({
        name: "PaintSwap Lottery",
        address: addresses.lottery,
        constructorArgs: [
          addresses.wrappedSonic,
          addresses.verifier
        ],
        contract: "contracts/RedDragonSwapLottery.sol:RedDragonSwapLottery"
      });
    }
    
    // Verify each contract
    console.log(`\n🔄 Starting verification of ${verificationTasks.length} contracts...`);
    
    for (const task of verificationTasks) {
      try {
        console.log(`\nVerifying ${task.name} at ${task.address}...`);
        console.log(`- Constructor arguments: ${JSON.stringify(task.constructorArgs)}`);
        
        await hre.run("verify:verify", {
          address: task.address,
          constructorArguments: task.constructorArgs,
          contract: task.contract
        });
        
        console.log(`✅ ${task.name} verified successfully!`);
      } catch (error) {
        if (error.message.includes("already verified") || error.message.includes("Already Verified")) {
          console.log(`✅ ${task.name} is already verified.`);
        } else {
          console.error(`❌ Error verifying ${task.name}:`, error.message);
        }
      }
    }
    
    console.log("\n🎉 Contract verification process completed!");
    
  } catch (error) {
    console.error("❌ Verification error:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Script error:", error);
    process.exit(1);
  }); 