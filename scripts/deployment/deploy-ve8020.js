const hre = require("hardhat");
const fs = require("fs");
require("dotenv").config();

/**
 * Deploy the ve8020 contract for LP token locking system
 */
async function main() {
  console.log("🚀 Deploying ve8020 contract...");

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
        console.log("⚠️ No deployment addresses file found. Creating new one.");
      }
    } catch (error) {
      console.log("⚠️ Error reading deployment addresses:", error.message);
    }

    // Verify we have the LP token address
    const lpTokenAddress = process.env.LP_TOKEN_ADDRESS;
    if (!lpTokenAddress) {
      console.error("❌ LP_TOKEN_ADDRESS not found in .env file");
      console.error("Please set the LP token address in your .env file first.");
      process.exit(1);
    }

    // Deploy ve8020 contract
    console.log("\n📦 Deploying ve8020 contract...");
    const Ve8020 = await hre.ethers.getContractFactory("ve8020");
    const ve8020 = await Ve8020.deploy(
      lpTokenAddress
    );

    // Wait for deployment to complete
    await ve8020.waitForDeployment();
    const ve8020Address = await ve8020.getAddress();
    console.log("✅ ve8020 contract deployed to:", ve8020Address);

    // Save the address to deployment file
    addresses.ve8020 = ve8020Address;
    addresses.lpToken = lpTokenAddress;
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    console.log(`📝 Saved ve8020 address to ${deploymentFile}`);

    console.log("\n🎉 ve8020 deployment complete!");
    console.log("\nNext steps:");
    console.log("1. Deploy the Ve8020FeeDistributor contract:");
    console.log("   npx hardhat run scripts/deployment/deploy-ve8020-fee-distributor.js --network sonic");
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