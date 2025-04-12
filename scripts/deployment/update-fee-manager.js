const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Update the fee manager to use the new lottery address
 */
async function main() {
  console.log("💸 Updating fee manager with new lottery address...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);

    // Load deployment addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    let addresses = {};
    
    try {
      if (fs.existsSync(deploymentFile)) {
        addresses = JSON.parse(fs.readFileSync(deploymentFile));
        console.log("📝 Loaded existing deployment addresses");
      } else {
        console.error("❌ No deployment addresses file found");
        return;
      }
    } catch (error) {
      console.error("❌ Error loading deployment addresses:", error);
      return;
    }

    if (!addresses.feeManager) {
      console.error("❌ No fee manager address found in deployment file");
      return;
    }

    if (!addresses.lottery) {
      console.error("❌ No lottery address found in deployment file");
      return;
    }

    // Connect to fee manager
    console.log("\n📦 Connecting to fee manager at", addresses.feeManager);
    const feeManager = await hre.ethers.getContractAt("RedDragonFeeManager", addresses.feeManager);
    
    // Set the lottery address
    console.log("Setting lottery address to", addresses.lottery);
    await feeManager.setLottery(addresses.lottery);
    console.log("✅ Fee manager updated with new lottery address");

    console.log("\n🎉 Fee manager successfully updated!");
  } catch (error) {
    console.error("❌ Update failed:", error);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 