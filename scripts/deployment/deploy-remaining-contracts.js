const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Deploy Remaining Contracts
 * Deploys the remaining contracts after LP Booster has been set up
 */
async function main() {
  console.log("🚀 Starting deployment of remaining contracts...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);
    
    // Load existing addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    let addresses = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    
    console.log("\n📋 Loaded addresses:");
    console.log(`- RedDragon Token: ${addresses.redDragon}`);
    console.log(`- Lottery: ${addresses.lottery}`);
    console.log(`- LP Token: ${addresses.lpToken}`);
    console.log(`- LP Booster: ${addresses.lpBooster}`);
    
    // Step 6: Deploy ve8020 contract
    console.log("\n📦 Step 6: Deploying ve8020 contract...");
    const Ve8020 = await hre.ethers.getContractFactory("ve8020");
    const ve8020 = await Ve8020.deploy(addresses.lpToken);
    await ve8020.waitForDeployment();
    const ve8020Address = await ve8020.getAddress();
    console.log("✅ ve8020 contract deployed to:", ve8020Address);
    addresses.ve8020 = ve8020Address;
    
    // Save addresses after ve8020 deployment
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    // Step 7: Deploy ve8020LotteryIntegrator
    console.log("\n📦 Step 7: Deploying ve8020LotteryIntegrator...");
    const Ve8020LotteryIntegrator = await hre.ethers.getContractFactory("ve8020LotteryIntegrator");
    const lotteryIntegrator = await Ve8020LotteryIntegrator.deploy(
      ve8020Address,
      addresses.lottery
    );
    await lotteryIntegrator.waitForDeployment();
    const lotteryIntegratorAddress = await lotteryIntegrator.getAddress();
    console.log("✅ ve8020LotteryIntegrator deployed to:", lotteryIntegratorAddress);
    addresses.ve8020LotteryIntegrator = lotteryIntegratorAddress;
    
    // Save addresses after integrator deployment
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    // Step 8: Deploy Ve8020FeeDistributor
    console.log("\n📦 Step 8: Deploying Ve8020FeeDistributor...");
    const Ve8020FeeDistributor = await hre.ethers.getContractFactory("Ve8020FeeDistributor");
    const feeDistributor = await Ve8020FeeDistributor.deploy(
      ve8020Address,
      addresses.redDragon
    );
    await feeDistributor.waitForDeployment();
    const feeDistributorAddress = await feeDistributor.getAddress();
    console.log("✅ Ve8020FeeDistributor deployed to:", feeDistributorAddress);
    addresses.ve8020FeeDistributor = feeDistributorAddress;
    
    // Save addresses after fee distributor deployment
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    // Step 9: Deploy RedDragonFeeManager
    console.log("\n📦 Step 9: Deploying RedDragonFeeManager...");
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
    
    // Step 10: Configure RedDragon to use fee manager
    console.log("\n📦 Step 10: Configuring RedDragon token to use fee manager...");
    
    // Connect to existing RedDragon contract
    const RedDragon = await hre.ethers.getContractFactory("RedDragon");
    const redDragon = RedDragon.attach(addresses.redDragon);
    
    // Set fee manager in RedDragon
    console.log("Setting fee manager address in RedDragon token...");
    await redDragon.setFeeManagerAddress(feeManagerAddress);
    
    // Configure token fees to use veDistributor
    console.log("Updating fee structure to use veDistributor...");
    
    // Get current fee details
    const feeInfo = await redDragon.getDetailedFeeInfo();
    console.log("Current fee structure:", feeInfo);
    
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
    
    // Save addresses after token fee configuration
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    // Final Step: System Integration and Verification
    console.log("\n📦 Final Step: System Integration and Verification...");
    
    // Connect to existing lottery contract
    const RedDragonSwapLottery = await hre.ethers.getContractFactory("RedDragonSwapLottery");
    const lottery = RedDragonSwapLottery.attach(addresses.lottery);
    
    // Set voting token in lottery to ve8020LotteryIntegrator
    console.log("Setting voting token in lottery to ve8020LotteryIntegrator...");
    await lottery.setVotingToken(lotteryIntegratorAddress);
    
    // Enable trading on RedDragon token if not already enabled
    if (await redDragon.tradingEnabled() === false) {
      console.log("Enabling trading on RedDragon token...");
      await redDragon.setTradingEnabled(true);
    }
    
    // Final configuration verification
    console.log("\n🔍 Verifying final configurations...");
    
    console.log("✓ RedDragon token address:", addresses.redDragon);
    console.log("✓ RedDragonSwapLottery address:", addresses.lottery);
    console.log("✓ RedDragonLPBooster address:", addresses.lpBooster);
    console.log("✓ ve8020 address:", ve8020Address);
    console.log("✓ ve8020LotteryIntegrator address:", lotteryIntegratorAddress);
    console.log("✓ Ve8020FeeDistributor address:", feeDistributorAddress);
    console.log("✓ RedDragonFeeManager address:", feeManagerAddress);

    console.log("\n🎉 Deployment of remaining contracts successful!");
    console.log(`📝 All contract addresses saved to ${deploymentFile}`);
    
    console.log("\n⚠️ Important Next Steps:");
    console.log("1. Deploy the multisig wallet");
    console.log("2. Transfer ownership of all contracts to the multisig");
    console.log("3. Verify all contracts on block explorer");
    console.log("4. Submit project to DEX screeners");
    
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