const hre = require("hardhat");
const fs = require("fs");
require("dotenv").config();

/**
 * Deploy the Ve8020FeeDistributor contract for distributing fees to ve8020 holders
 */
async function main() {
  console.log("🚀 Deploying Ve8020FeeDistributor contract...");

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
        console.error("Please deploy ve8020 contract first.");
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

    if (!addresses.redDragon) {
      console.error("❌ RedDragon token address not found in deployment addresses file.");
      console.error("Please deploy the RedDragon token first.");
      process.exit(1);
    }

    const ve8020Address = addresses.ve8020;
    const redDragonAddress = addresses.redDragon;
    
    // Deploy Ve8020FeeDistributor contract
    console.log("\n📦 Deploying Ve8020FeeDistributor contract...");
    console.log("Using ve8020 address:", ve8020Address);
    console.log("Using RedDragon token address:", redDragonAddress);
    
    const Ve8020FeeDistributor = await hre.ethers.getContractFactory("Ve8020FeeDistributor");
    const feeDistributor = await Ve8020FeeDistributor.deploy(
      ve8020Address,
      redDragonAddress
    );

    // Wait for deployment to complete
    await feeDistributor.waitForDeployment();
    const feeDistributorAddress = await feeDistributor.getAddress();
    console.log("✅ Ve8020FeeDistributor contract deployed to:", feeDistributorAddress);

    // Save the address to deployment file
    addresses.ve8020FeeDistributor = feeDistributorAddress;
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    console.log(`📝 Saved Ve8020FeeDistributor address to ${deploymentFile}`);

    console.log("\n🎉 Ve8020FeeDistributor deployment complete!");
    console.log("\nNext steps:");
    console.log("1. Deploy the RedDragonFeeManager contract:");
    console.log("   npx hardhat run scripts/deployment/deploy-fee-manager.js --network sonic");
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