const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Script to generate transaction data for transferring ownership to the new multisig
 * This script generates the data you would need to submit to the existing multisigs
 */
async function main() {
  console.log("🔧 Generating transfer ownership transaction data for multisigs...");

  try {
    // Load deployment addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    let addresses = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    
    if (!addresses.multiSig) {
      console.error("❌ MultiSig address not found in deployment file!");
      process.exit(1);
    }
    
    const newMultiSigAddress = addresses.multiSig;
    console.log(`📋 New MultiSig address: ${newMultiSigAddress}`);
    
    // Get the interface and function selectors for each contract type
    console.log("\n🔄 Creating contract interfaces...");
    
    // RedDragon Token
    const RedDragon = await ethers.getContractFactory("RedDragon");
    const redDragonInterface = RedDragon.interface;
    
    // Lottery
    const Lottery = await ethers.getContractFactory("RedDragonSwapLottery");
    const lotteryInterface = Lottery.interface;
    
    // PaintSwap Verifier
    const Verifier = await ethers.getContractFactory("RedDragonPaintSwapVerifier");
    const verifierInterface = Verifier.interface;
    
    // LP Booster
    const LPBooster = await ethers.getContractFactory("RedDragonLPBooster");
    const lpBoosterInterface = LPBooster.interface;
    
    // Ve8020FeeDistributor
    const FeeDistributor = await ethers.getContractFactory("Ve8020FeeDistributor");
    const feeDistributorInterface = FeeDistributor.interface;
    
    // FeeManager
    const FeeManager = await ethers.getContractFactory("RedDragonFeeManager");
    const feeManagerInterface = FeeManager.interface;
    
    // Group contracts by current owner
    console.log("\n📊 Generating transaction data for contracts owned by:");
    
    // First multisig: 0xCF74dB6120af38373290556a64f32016b5EB7486
    console.log("\n📝 Multisig #1: 0xCF74dB6120af38373290556a64f32016b5EB7486");
    console.log("Contracts to transfer:");
    
    // RedDragon Token
    if (addresses.redDragon) {
      const transferData = redDragonInterface.encodeFunctionData("transferOwnership", [newMultiSigAddress]);
      console.log(`\n- RedDragon Token (${addresses.redDragon}):`);
      console.log(`  • To: ${addresses.redDragon}`);
      console.log(`  • Data: ${transferData}`);
    }
    
    // Lottery
    if (addresses.lottery) {
      const transferData = lotteryInterface.encodeFunctionData("transferOwnership", [newMultiSigAddress]);
      console.log(`\n- Lottery (${addresses.lottery}):`);
      console.log(`  • To: ${addresses.lottery}`);
      console.log(`  • Data: ${transferData}`);
    }
    
    // LP Booster
    if (addresses.lpBooster) {
      const transferData = lpBoosterInterface.encodeFunctionData("transferOwnership", [newMultiSigAddress]);
      console.log(`\n- LP Booster (${addresses.lpBooster}):`);
      console.log(`  • To: ${addresses.lpBooster}`);
      console.log(`  • Data: ${transferData}`);
    }
    
    // Second multisig: 0x03bF2b1eC635783c88aD880D85F0c8c689EE962C
    console.log("\n📝 Multisig #2: 0x03bF2b1eC635783c88aD880D85F0c8c689EE962C");
    console.log("Contracts to transfer:");
    
    // PaintSwap Verifier
    if (addresses.paintswapVerifier) {
      const transferData = verifierInterface.encodeFunctionData("transferOwnership", [newMultiSigAddress]);
      console.log(`\n- PaintSwap Verifier (${addresses.paintswapVerifier}):`);
      console.log(`  • To: ${addresses.paintswapVerifier}`);
      console.log(`  • Data: ${transferData}`);
    }
    
    // ve8020 Fee Distributor
    if (addresses.ve8020FeeDistributor) {
      const transferData = feeDistributorInterface.encodeFunctionData("transferOwnership", [newMultiSigAddress]);
      console.log(`\n- ve8020 Fee Distributor (${addresses.ve8020FeeDistributor}):`);
      console.log(`  • To: ${addresses.ve8020FeeDistributor}`);
      console.log(`  • Data: ${transferData}`);
    }
    
    // Fee Manager
    if (addresses.feeManager) {
      const transferData = feeManagerInterface.encodeFunctionData("transferOwnership", [newMultiSigAddress]);
      console.log(`\n- Fee Manager (${addresses.feeManager}):`);
      console.log(`  • To: ${addresses.feeManager}`);
      console.log(`  • Data: ${transferData}`);
    }
    
    console.log("\n🔍 How to use this data:");
    console.log("1. Access the multisig interface (Gnosis Safe, etc.) for each owner address");
    console.log("2. Create a new transaction with the 'To' and 'Data' fields from above");
    console.log("3. Submit and confirm the transaction via the multisig interface");
    console.log("\n⚠️ Make sure to submit these transactions from the correct multisig address!");
    
  } catch (error) {
    console.error("❌ Script error:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Script error:", error);
    process.exit(1);
  }); 