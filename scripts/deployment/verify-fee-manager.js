const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

async function main() {
  console.log("🔍 Verifying Fee Manager setup...");

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

    // Check Fee Manager Configuration
    console.log("\n🔷 Checking Fee Manager Configuration...");
    if (addresses.feeManager) {
      const feeManager = await hre.ethers.getContractAt("RedDragonFeeManager", addresses.feeManager);
      
      // Get lottery address
      const lotteryAddress = await feeManager.lottery();
      console.log("Lottery Address:", lotteryAddress);
      
      // Verify lottery address
      if (lotteryAddress.toLowerCase() === addresses.lottery.toLowerCase()) {
        console.log("✅ Fee Manager is using correct lottery address");
      } else {
        console.log("❌ Fee Manager lottery address mismatch:");
        console.log("  Expected:", addresses.lottery);
        console.log("  Actual:", lotteryAddress);
      }

      // Get ve distributor address
      try {
        const veDistributorAddress = await feeManager.veDistributor();
        console.log("Ve Distributor Address:", veDistributorAddress);
        
        // Verify fee distributor address
        if (veDistributorAddress.toLowerCase() === addresses.ve8020FeeDistributor.toLowerCase()) {
          console.log("✅ Fee Manager is using correct fee distributor address");
        } else {
          console.log("❌ Fee Manager fee distributor address mismatch:");
          console.log("  Expected:", addresses.ve8020FeeDistributor);
          console.log("  Actual:", veDistributorAddress);
        }
      } catch (error) {
        console.error("❌ Could not get veDistributor address:", error.message);
      }
    } else {
      console.log("❌ No Fee Manager address found");
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