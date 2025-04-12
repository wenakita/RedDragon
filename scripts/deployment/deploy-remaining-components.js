const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Deploy all remaining components before transferring ownership
 */
async function main() {
  console.log("🚀 Deploying remaining RedDragon components...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);
    
    // Load existing addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    let addresses = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    
    console.log("\n📋 Loaded addresses:");
    console.log(`- RedDragon Token: ${addresses.redDragon}`);
    console.log(`- LP Token: ${addresses.lpToken}`);
    console.log(`- LP Booster: ${addresses.lpBooster}`);
    console.log(`- ve8020: ${addresses.ve8020}`);
    
    // Step 1: Deploy ve8020LotteryIntegrator
    console.log("\n📦 Step 1: Deploying ve8020LotteryIntegrator...");
    const Ve8020LotteryIntegrator = await hre.ethers.getContractFactory("ve8020LotteryIntegrator");
    const lotteryIntegrator = await Ve8020LotteryIntegrator.deploy(
      addresses.ve8020,
      addresses.lottery
    );
    await lotteryIntegrator.waitForDeployment();
    const lotteryIntegratorAddress = await lotteryIntegrator.getAddress();
    console.log("✅ ve8020LotteryIntegrator deployed to:", lotteryIntegratorAddress);
    addresses.ve8020LotteryIntegrator = lotteryIntegratorAddress;
    
    // Save addresses after integrator deployment
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    // Step 2: Deploy Ve8020FeeDistributor
    console.log("\n📦 Step 2: Deploying Ve8020FeeDistributor...");
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
    
    // Step 3: Deploy RedDragonFeeManager
    console.log("\n📦 Step 3: Deploying RedDragonFeeManager...");
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
    
    // Step 4: Configure existing contracts to work with new components
    console.log("\n📦 Step 4: Configuring existing contracts...");
    
    // Set voting token in lottery
    console.log("Setting voting token in lottery...");
    const RedDragonSwapLottery = await hre.ethers.getContractFactory("RedDragonSwapLottery");
    const lottery = RedDragonSwapLottery.attach(addresses.lottery);
    await lottery.setVotingToken(lotteryIntegratorAddress);
    
    // Set fee manager in RedDragon
    console.log("Setting fee manager in RedDragon token...");
    const RedDragon = await hre.ethers.getContractFactory("RedDragon");
    const redDragon = RedDragon.attach(addresses.redDragon);
    await redDragon.setFeeManagerAddress(feeManagerAddress);
    
    // Configure token fees to use veDistributor
    console.log("Updating fee structure to use veDistributor...");
    
    // Get current fee details
    const feeInfo = await redDragon.getDetailedFeeInfo();
    
    // Update buy fees (redirect liquidity and dev fees to veDistributor)
    await redDragon.setBuyFees(
      0, // Liquidity fee (set to 0 as we're redirecting)
      feeInfo[1], // Jackpot fee (keep the same)
      feeInfo[2], // Burn fee (keep the same)
      Number(feeInfo[0]) + Number(feeInfo[3]) // Development fee now includes liquidity + old development
    );
    
    // Update sell fees
    await redDragon.setSellFees(
      0, // Liquidity fee (set to 0 as we're redirecting)
      feeInfo[6], // Jackpot fee (keep the same)
      feeInfo[7], // Burn fee (keep the same)
      Number(feeInfo[5]) + Number(feeInfo[8]) // Development fee now includes liquidity + old development
    );
    
    // Enable trading if needed
    if (await redDragon.tradingEnabled() === false) {
      console.log("Enabling trading on RedDragon token...");
      await redDragon.setTradingEnabled(true);
    }
    
    // Final configuration verification
    console.log("\n🔍 Verifying final configurations...");
    
    console.log("✓ RedDragon token:", addresses.redDragon);
    console.log("✓ RedDragonSwapLottery:", addresses.lottery);
    console.log("✓ RedDragonLPBooster:", addresses.lpBooster);
    console.log("✓ ve8020:", addresses.ve8020);
    console.log("✓ ve8020LotteryIntegrator:", lotteryIntegratorAddress);
    console.log("✓ Ve8020FeeDistributor:", feeDistributorAddress);
    console.log("✓ RedDragonFeeManager:", feeManagerAddress);
    console.log("✓ MultiSig wallet:", addresses.multiSig);

    console.log("\n🎉 Deployment of remaining components successful!");
    console.log(`📝 All contract addresses saved to ${deploymentFile}`);
    
    console.log("\n⚠️ Important Next Steps:");
    console.log("1. Run the transfer-ownership.js script to move all ownership to multisig");
    console.log("2. Verify all contracts on block explorer");
    console.log("3. Submit project to DEX screeners");
    
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