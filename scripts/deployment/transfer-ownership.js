const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Transfer ownership of all contracts to the multisig wallet
 */
async function main() {
  console.log("🔑 Transferring ownership to MultSig wallet...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);
    
    // Load deployment addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    let addresses = {};
    try {
      addresses = JSON.parse(fs.readFileSync(deploymentFile));
      console.log("📝 Loaded deployment addresses");
    } catch (error) {
      console.error("❌ Error loading deployment addresses:", error);
      return;
    }
    
    // Check for required addresses
    if (!addresses.multiSig) {
      console.error("❌ MultiSig address not found in deployment file");
      console.log("👉 Please deploy the multisig first using 'deploy-multisig.js'");
      return;
    }
    
    if (!addresses.redDragon) {
      console.error("❌ RedDragon token address not found in deployment file");
      return;
    }
    
    if (!addresses.lottery) {
      console.error("❌ Lottery address not found in deployment file");
      return;
    }
    
    if (!addresses.verifier) {
      console.error("❌ Verifier address not found in deployment file");
      return;
    }
    
    console.log("\n📋 Contract addresses:");
    console.log(`- RedDragon: ${addresses.redDragon}`);
    console.log(`- Lottery: ${addresses.lottery}`);
    console.log(`- Verifier: ${addresses.verifier}`);
    console.log(`- MultiSig: ${addresses.multiSig}`);
    
    // Connect to contracts
    const redDragon = await hre.ethers.getContractAt("RedDragon", addresses.redDragon);
    const lottery = await hre.ethers.getContractAt("RedDragonSwapLottery", addresses.lottery);
    const verifier = await hre.ethers.getContractAt("RedDragonPaintSwapVerifier", addresses.verifier);
    
    // Check current owners
    const redDragonOwner = await redDragon.owner();
    const lotteryOwner = await lottery.owner();
    const verifierOwner = await verifier.owner();
    
    console.log("\n👤 Current owners:");
    console.log(`- RedDragon: ${redDragonOwner}`);
    console.log(`- Lottery: ${lotteryOwner}`);
    console.log(`- Verifier: ${verifierOwner}`);
    
    // Check if deployer is the owner
    if (redDragonOwner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.error("❌ You are not the owner of the RedDragon token");
      return;
    }
    
    if (lotteryOwner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.error("❌ You are not the owner of the Lottery contract");
      return;
    }
    
    if (verifierOwner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.error("❌ You are not the owner of the Verifier contract");
      return;
    }
    
    // Transfer ownership to multisig
    console.log("\n🔄 Transferring ownership to MultiSig...");
    
    console.log("- Transferring RedDragon ownership...");
    const redDragonTx = await redDragon.transferOwnership(addresses.multiSig);
    await redDragonTx.wait();
    console.log("✅ RedDragon ownership transferred");
    
    console.log("- Transferring Lottery ownership...");
    const lotteryTx = await lottery.transferOwnership(addresses.multiSig);
    await lotteryTx.wait();
    console.log("✅ Lottery ownership transferred");
    
    console.log("- Transferring Verifier ownership...");
    const verifierTx = await verifier.transferOwnership(addresses.multiSig);
    await verifierTx.wait();
    console.log("✅ Verifier ownership transferred");
    
    // Verify ownership transfer
    const newRedDragonOwner = await redDragon.owner();
    const newLotteryOwner = await lottery.owner();
    const newVerifierOwner = await verifier.owner();
    
    console.log("\n👤 New owners:");
    console.log(`- RedDragon: ${newRedDragonOwner}`);
    console.log(`- Lottery: ${newLotteryOwner}`);
    console.log(`- Verifier: ${newVerifierOwner}`);
    
    if (newRedDragonOwner.toLowerCase() === addresses.multiSig.toLowerCase() &&
        newLotteryOwner.toLowerCase() === addresses.multiSig.toLowerCase() &&
        newVerifierOwner.toLowerCase() === addresses.multiSig.toLowerCase()) {
      console.log("\n🎉 Ownership transfer successful!");
    } else {
      console.error("\n❌ Ownership transfer failed or incomplete");
      console.log("Please check the contract ownership manually");
    }
    
    console.log("\n⚠️ Important Next Steps:");
    console.log("1. Verify the multisig contract on block explorer");
    console.log("2. Test multisig functionality with a small transaction");
    console.log("3. Create a jackpot distribution process from your wallet");
    
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