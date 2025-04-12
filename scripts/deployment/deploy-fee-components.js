const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Deploy Fee-related Components
 * Deploys Ve8020FeeDistributor and RedDragonFeeManager
 */
async function main() {
  console.log("🚀 Deploying fee-related components...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);
    
    // Load existing addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    let addresses = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    
    console.log("\n📋 Loaded addresses:");
    console.log(`- RedDragon Token: ${addresses.redDragon}`);
    console.log(`- ve8020: ${addresses.ve8020}`);
    console.log(`- Lottery: ${addresses.lottery}`);
    console.log(`- MultiSig: ${addresses.multiSig}`);
    
    // Step 1: Deploy Ve8020FeeDistributor
    console.log("\n📦 Step 1: Deploying Ve8020FeeDistributor...");
    const Ve8020FeeDistributor = await hre.ethers.getContractFactory("Ve8020FeeDistributor");
    const feeDistributor = await Ve8020FeeDistributor.deploy(
      addresses.ve8020,
      addresses.redDragon
    );
    await feeDistributor.waitForDeployment();
    const feeDistributorAddress = await feeDistributor.getAddress();
    console.log("✅ Ve8020FeeDistributor deployed to:", feeDistributorAddress);
    addresses.ve8020FeeDistributor = feeDistributorAddress;
    
    // Save addresses after fee distributor deployment
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    // Step 2: Deploy RedDragonFeeManager
    console.log("\n📦 Step 2: Deploying RedDragonFeeManager...");
    const RedDragonFeeManager = await hre.ethers.getContractFactory("RedDragonFeeManager");
    const feeManager = await RedDragonFeeManager.deploy(
      addresses.redDragon,
      feeDistributorAddress,
      addresses.jackpotVault,
      addresses.burnAddress
    );
    await feeManager.waitForDeployment();
    const feeManagerAddress = await feeManager.getAddress();
    console.log("✅ RedDragonFeeManager deployed to:", feeManagerAddress);
    addresses.feeManager = feeManagerAddress;
    
    // Set lottery in fee manager
    console.log("Setting lottery in fee manager...");
    await feeManager.setLottery(addresses.lottery);
    
    // Save addresses after fee manager deployment
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    // Transfer ownership of new components to multisig (either old or new)
    // Use the first multisig address that exists in the addresses file
    const multisigAddress = addresses.multiSig;
    
    console.log("\n🔄 Transferring ownership to multisig:", multisigAddress);
    await feeDistributor.transferOwnership(multisigAddress);
    await feeManager.transferOwnership(multisigAddress);
    console.log("✅ Ownership transferred to multisig");
    
    console.log("\n🎉 Fee components deployment successful!");
    console.log(`📝 All contract addresses saved to ${deploymentFile}`);
    
    console.log("\n⚠️ Important Notes:");
    console.log("1. You will need to use the multisig to set the fee manager in the RedDragon token");
    console.log("2. Verify all contracts on block explorer");
    console.log("3. Your system is now ready for DEX screeners");
    
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