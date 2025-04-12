const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Deploy ve8020LotteryIntegrator
 */
async function main() {
  console.log("🚀 Deploying ve8020LotteryIntegrator...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);
    
    // Load existing addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    let addresses = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    
    console.log("\n📋 Loaded addresses:");
    console.log(`- ve8020: ${addresses.ve8020}`);
    console.log(`- Lottery: ${addresses.lottery}`);
    console.log(`- MultiSig: ${addresses.multiSig}`);
    
    // Deploy ve8020LotteryIntegrator
    console.log("\n📦 Deploying ve8020LotteryIntegrator...");
    
    // Deploy a new version that doesn't require ve8020 owner permission
    const Ve8020LotteryIntegratorNoPermission = await hre.ethers.getContractFactory("ve8020LotteryIntegrator");
    
    // Constructor now uses ve8020 address as a parameter but doesn't require owner permission
    const lotteryIntegrator = await Ve8020LotteryIntegratorNoPermission.deploy(
      addresses.ve8020,
      addresses.lottery
    );
    
    await lotteryIntegrator.waitForDeployment();
    const lotteryIntegratorAddress = await lotteryIntegrator.getAddress();
    console.log("✅ ve8020LotteryIntegrator deployed to:", lotteryIntegratorAddress);
    addresses.ve8020LotteryIntegrator = lotteryIntegratorAddress;
    
    // Save addresses after integrator deployment
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    // Transfer ownership to multisig
    console.log("\n🔄 Transferring ownership to multisig:", addresses.multiSig);
    await lotteryIntegrator.transferOwnership(addresses.multiSig);
    console.log("✅ Ownership transferred to multisig");
    
    console.log("\n🎉 ve8020LotteryIntegrator deployment successful!");
    console.log(`📝 Contract address saved to ${deploymentFile}`);
    
    console.log("\n⚠️ Important Notes:");
    console.log("1. You will need to use the multisig to set the lottery integrator in the lottery");
    console.log("2. Verify the contract on block explorer");
    
  } catch (error) {
    console.error("❌ Deployment error:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Script error:", error);
    process.exit(1);
  }); 