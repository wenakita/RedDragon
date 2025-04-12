const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Transfer ownership of all contracts to the multisig wallet
 * This script should be run after deploying all contracts
 */
async function main() {
  console.log("🚀 Starting ownership transfer to MultiSig...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);
    
    // Load deployment addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    let addresses = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    
    // Check if multisig is deployed
    if (!addresses.multiSig) {
      console.error("❌ MultiSig address not found in deployment file!");
      console.error("Please deploy the multisig first using redeploy-multisig.js");
      process.exit(1);
    }
    
    console.log("\n📋 Target MultiSig address:", addresses.multiSig);
    
    // Array of contracts to transfer
    const contracts = [
      { name: "RedDragon", address: addresses.redDragon, factory: "RedDragon" },
      { name: "RedDragonSwapLottery", address: addresses.lottery, factory: "RedDragonSwapLottery" },
      { name: "RedDragonLPBooster", address: addresses.lpBooster, factory: "RedDragonLPBooster" },
      { name: "ve8020", address: addresses.ve8020, factory: "ve8020" },
      { name: "RedDragonPaintSwapVerifier", address: addresses.paintswapVerifier, factory: "RedDragonPaintSwapVerifier" }
    ];
    
    // Add optional contracts if they exist
    if (addresses.ve8020LotteryIntegrator) {
      contracts.push({ 
        name: "ve8020LotteryIntegrator", 
        address: addresses.ve8020LotteryIntegrator, 
        factory: "ve8020LotteryIntegrator" 
      });
    }
    
    if (addresses.ve8020FeeDistributor) {
      contracts.push({ 
        name: "Ve8020FeeDistributor", 
        address: addresses.ve8020FeeDistributor, 
        factory: "Ve8020FeeDistributor" 
      });
    }
    
    if (addresses.feeManager) {
      contracts.push({ 
        name: "RedDragonFeeManager", 
        address: addresses.feeManager, 
        factory: "RedDragonFeeManager" 
      });
    }
    
    // Transfer ownership of each contract
    for (const contract of contracts) {
      try {
        console.log(`\n🔄 Transferring ownership of ${contract.name}...`);
        const ContractFactory = await hre.ethers.getContractFactory(contract.factory);
        const deployedContract = ContractFactory.attach(contract.address);
        await deployedContract.transferOwnership(addresses.multiSig);
        console.log(`✅ ${contract.name} ownership transferred`);
      } catch (error) {
        console.error(`❌ Error transferring ownership of ${contract.name}:`, error.message);
        console.log("Continuing with next contract...");
      }
    }
    
    console.log("\n🎉 Ownership transfer process completed!");
    console.log("📝 MultiSig address:", addresses.multiSig);
    
    console.log("\n⚠️ Important Next Steps:");
    console.log("1. Verify all contracts on block explorer");
    console.log("2. Test multisig functionality by submitting a simple transaction");
    console.log("3. Submit the project to DEX screeners");
    
  } catch (error) {
    console.error("❌ Transfer error:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Script error:", error);
    process.exit(1);
  }); 