const hre = require("hardhat");
const fs = require("fs");
require("dotenv").config();

/**
 * Deploy the RedDragonFeeManager contract for handling fee distribution
 */
async function main() {
  console.log("🚀 Deploying RedDragonFeeManager contract...");

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
    if (!addresses.redDragon) {
      console.error("❌ RedDragon token address not found in deployment addresses file.");
      console.error("Please deploy the RedDragon token first.");
      process.exit(1);
    }

    if (!addresses.ve8020FeeDistributor) {
      console.error("❌ Ve8020FeeDistributor address not found in deployment addresses file.");
      console.error("Please deploy the Ve8020FeeDistributor first.");
      process.exit(1);
    }

    if (!addresses.lottery) {
      console.error("❌ RedDragonSwapLottery address not found in deployment addresses file.");
      console.error("Please deploy the RedDragonSwapLottery first.");
      process.exit(1);
    }

    const redDragonAddress = addresses.redDragon;
    const ve8020FeeDistributorAddress = addresses.ve8020FeeDistributor;
    const burnAddress = process.env.BURN_ADDRESS || "0x000000000000000000000000000000000000dEaD";
    const jackpotAddress = addresses.jackpotVault || addresses.lottery || deployer.address;
    
    // Deploy RedDragonFeeManager contract
    console.log("\n📦 Deploying RedDragonFeeManager contract...");
    console.log("Using RedDragon token address:", redDragonAddress);
    console.log("Using Ve8020FeeDistributor address:", ve8020FeeDistributorAddress);
    console.log("Using Burn address:", burnAddress);
    console.log("Using Jackpot address:", jackpotAddress);
    
    const RedDragonFeeManager = await hre.ethers.getContractFactory("RedDragonFeeManager");
    const feeManager = await RedDragonFeeManager.deploy(
      redDragonAddress,
      ve8020FeeDistributorAddress,
      jackpotAddress,
      burnAddress
    );

    // Wait for deployment to complete
    await feeManager.waitForDeployment();
    const feeManagerAddress = await feeManager.getAddress();
    console.log("✅ RedDragonFeeManager contract deployed to:", feeManagerAddress);

    // Save the address to deployment file
    addresses.feeManager = feeManagerAddress;
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    console.log(`📝 Saved RedDragonFeeManager address to ${deploymentFile}`);

    console.log("\n🎉 RedDragonFeeManager deployment complete!");
    console.log("\nNext steps:");
    console.log("1. Deploy the ve8020LotteryIntegrator contract:");
    console.log("   npx hardhat run scripts/deployment/deploy-ve8020-lottery-integrator.js --network sonic");
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