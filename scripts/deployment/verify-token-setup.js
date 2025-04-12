const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

async function main() {
  console.log("🔍 Verifying RedDragon token setup...");

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

    // Check RedDragon Token Configuration
    console.log("\n🔷 Checking RedDragon Token Configuration...");
    if (addresses.redDragon) {
      const redDragon = await hre.ethers.getContractAt("RedDragon", addresses.redDragon);
      
      // Get configuration
      const config = await redDragon.getContractConfiguration();
      console.log("Jackpot Address:", config[5]); // This should be the fee manager
      
      // Verify lottery address is set to fee manager
      if (config[5].toLowerCase() === addresses.feeManager.toLowerCase()) {
        console.log("✅ Token is using fee manager as lottery address");
      } else {
        console.log("❌ Token lottery address mismatch:");
        console.log("  Expected:", addresses.feeManager);
        console.log("  Actual:", config[5]);
      }

      // Get fee info
      const feeInfo = await redDragon.getDetailedFeeInfo();
      console.log("Buy Fees - Jackpot: ", feeInfo[1].toString());
      console.log("Sell Fees - Jackpot: ", feeInfo[6].toString());
    } else {
      console.log("❌ No RedDragon address found");
    }

    console.log("✅ Verification complete!");
  } catch (error) {
    console.error("❌ Verification failed:", error);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 