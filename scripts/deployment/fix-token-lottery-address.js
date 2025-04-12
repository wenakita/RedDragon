const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Fix the RedDragon token's lottery address to point to the fee manager
 */
async function main() {
  console.log("🔧 Fixing RedDragon token lottery address...");

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
        console.log("📝 Loaded deployment addresses");
      } else {
        console.error("❌ No deployment addresses file found");
        return;
      }
    } catch (error) {
      console.error("❌ Error loading deployment addresses:", error);
      return;
    }

    // Connect to RedDragon token
    console.log("\n📦 Connecting to RedDragon token at", addresses.redDragon);
    const redDragon = await hre.ethers.getContractAt("RedDragon", addresses.redDragon);
    
    // Get current configuration
    const config = await redDragon.getContractConfiguration();
    console.log("Current Lottery Address:", config[5]);
    
    if (config[5].toLowerCase() === addresses.feeManager.toLowerCase()) {
      console.log("✅ Lottery address is already set correctly to fee manager");
      return;
    }
    
    // Update lottery address to fee manager
    console.log("Setting lottery address to fee manager:", addresses.feeManager);
    await redDragon.setLotteryAddress(addresses.feeManager);
    console.log("✅ RedDragon token lottery address updated to fee manager");

    console.log("\n🎉 RedDragon token configuration fixed!");
  } catch (error) {
    console.error("❌ Fix failed:", error);
    console.error("If you see 'cannot estimate gas', the deployer account may not have permission to call setLotteryAddress");
    console.error("You need to call this function from the token owner account");
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 