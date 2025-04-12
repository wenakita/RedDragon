const hre = require("hardhat");
const fs = require("fs");
require("dotenv").config();

/**
 * Set the ve8020LotteryIntegrator as the booster for the RedDragonSwapLottery
 */
async function main() {
  console.log("🚀 Setting lottery booster...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);

    // Load the deployment addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    let addresses = {};
    
    try {
      if (fs.existsSync(deploymentFile)) {
        addresses = JSON.parse(fs.readFileSync(deploymentFile));
        console.log("📝 Loaded existing deployment addresses");
      } else {
        console.error("❌ No deployment addresses file found.");
        console.error("Please deploy the required contracts first.");
        process.exit(1);
      }
    } catch (error) {
      console.error("❌ Error reading deployment addresses:", error.message);
      process.exit(1);
    }

    // Verify we have the required addresses
    if (!addresses.lottery) {
      console.error("❌ RedDragonSwapLottery address not found in deployment addresses file.");
      console.error("Please deploy the RedDragonSwapLottery first.");
      process.exit(1);
    }

    if (!addresses.ve8020LotteryIntegrator) {
      console.error("❌ ve8020LotteryIntegrator address not found in deployment addresses file.");
      console.error("Please deploy the ve8020LotteryIntegrator first.");
      process.exit(1);
    }

    const lotteryAddress = addresses.lottery;
    const lotteryIntegratorAddress = addresses.ve8020LotteryIntegrator;
    
    // Connect to the lottery contract
    console.log("\n🔧 Setting up lottery booster...");
    console.log("Lottery address:", lotteryAddress);
    console.log("Lottery integrator address:", lotteryIntegratorAddress);
    
    const lottery = await hre.ethers.getContractAt("RedDragonSwapLottery", lotteryAddress);
    
    // Check if there's an existing booster
    const currentBooster = await lottery.booster();
    if (currentBooster !== hre.ethers.ZeroAddress && currentBooster.toLowerCase() === lotteryIntegratorAddress.toLowerCase()) {
      console.log("✅ Lottery booster is already set correctly");
      return;
    }
    
    // Set the lottery booster
    console.log("Setting lottery booster...");
    const tx = await lottery.setBooster(lotteryIntegratorAddress);
    await tx.wait();
    
    console.log("✅ Lottery booster set successfully");

    console.log("\n🎉 Lottery booster setup complete!");
    console.log("\nNext step:");
    console.log("1. Configure RedDragon for ve8020 system:");
    console.log("   npx hardhat run scripts/deployment/configure-reddragon-for-ve8020.js --network sonic");
  } catch (error) {
    console.error("❌ Setup error:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Script error:", error);
    process.exit(1);
  }); 