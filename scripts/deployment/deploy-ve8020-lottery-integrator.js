const hre = require("hardhat");
const fs = require("fs");
require("dotenv").config();

/**
 * Deploy the ve8020LotteryIntegrator contract for connecting ve8020 with lottery boost
 */
async function main() {
  console.log("🚀 Deploying ve8020LotteryIntegrator contract...");

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
    if (!addresses.ve8020) {
      console.error("❌ ve8020 address not found in deployment addresses file.");
      console.error("Please deploy the ve8020 contract first.");
      process.exit(1);
    }

    if (!addresses.lottery) {
      console.error("❌ RedDragonSwapLottery address not found in deployment addresses file.");
      console.error("Please deploy the RedDragonSwapLottery first.");
      process.exit(1);
    }

    const ve8020Address = addresses.ve8020;
    const lotteryAddress = addresses.lottery;
    
    // Deploy ve8020LotteryIntegrator contract
    console.log("\n📦 Deploying ve8020LotteryIntegrator contract...");
    console.log("Using ve8020 address:", ve8020Address);
    console.log("Using RedDragonSwapLottery address:", lotteryAddress);
    
    const Ve8020LotteryIntegrator = await hre.ethers.getContractFactory("ve8020LotteryIntegrator");
    const lotteryIntegrator = await Ve8020LotteryIntegrator.deploy(
      ve8020Address,
      lotteryAddress
    );

    // Wait for deployment to complete
    await lotteryIntegrator.waitForDeployment();
    const lotteryIntegratorAddress = await lotteryIntegrator.getAddress();
    console.log("✅ ve8020LotteryIntegrator contract deployed to:", lotteryIntegratorAddress);

    // Save the address to deployment file
    addresses.ve8020LotteryIntegrator = lotteryIntegratorAddress;
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    console.log(`📝 Saved ve8020LotteryIntegrator address to ${deploymentFile}`);

    console.log("\n🎉 ve8020LotteryIntegrator deployment complete!");
    console.log("\nNext steps:");
    console.log("1. Set up lottery booster:");
    console.log("   npx hardhat run scripts/deployment/set-lottery-booster.js --network sonic");
    console.log("2. Configure RedDragon for ve8020 system:");
    console.log("   npx hardhat run scripts/deployment/configure-reddragon-for-ve8020.js --network sonic");
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