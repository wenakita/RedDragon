const hre = require("hardhat");
const fs = require("fs");
require("dotenv").config();

/**
 * Configure the RedDragon token to use the fee manager for ve8020 system
 */
async function main() {
  console.log("🚀 Configuring RedDragon token for ve8020 system...");

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

    if (!addresses.feeManager) {
      console.error("❌ RedDragonFeeManager address not found in deployment addresses file.");
      console.error("Please deploy the RedDragonFeeManager first.");
      process.exit(1);
    }

    const redDragonAddress = addresses.redDragon;
    const feeManagerAddress = addresses.feeManager;
    
    // Connect to the RedDragon token
    console.log("\n🔧 Configuring RedDragon token...");
    console.log("RedDragon address:", redDragonAddress);
    console.log("Fee Manager address:", feeManagerAddress);
    
    const redDragon = await hre.ethers.getContractAt("RedDragon", redDragonAddress);
    
    // Check current lottery address
    const currentLotteryAddress = await redDragon.lotteryAddress();
    if (currentLotteryAddress && currentLotteryAddress.toLowerCase() === feeManagerAddress.toLowerCase()) {
      console.log("✅ RedDragon token is already configured with the fee manager as lottery");
      return;
    }
    
    // Set the fee manager as the lottery address so jackpot fees can be redirected
    console.log("Setting lottery address to fee manager...");
    const tx = await redDragon.setLotteryAddress(feeManagerAddress);
    await tx.wait();
    
    console.log("✅ Lottery address set successfully");

    console.log("\n🎉 RedDragon configuration complete!");
    console.log("\nAll setup steps completed successfully.");
    console.log("The ve(80/20) system is now fully deployed and configured.");
  } catch (error) {
    console.error("❌ Configuration error:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Script error:", error);
    process.exit(1);
  }); 