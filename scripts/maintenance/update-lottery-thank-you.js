const hre = require("hardhat");
const fs = require("fs");

/**
 * Update the RedDragonSwapLottery to recognize the new Thank You Token
 */
async function main() {
  console.log("🔄 Updating Lottery Thank You Token");
  console.log("=================================");
  
  try {
    // Load deployment addresses
    let addresses = {};
    const deploymentFile = "deployment-addresses-sonic.json";
    
    if (fs.existsSync(deploymentFile)) {
      addresses = JSON.parse(fs.readFileSync(deploymentFile));
      console.log("📝 Loaded deployment addresses from file");
    } else {
      console.error("❌ Deployment addresses file not found");
      process.exit(1);
    }
    
    // Get required addresses
    const lotteryAddress = addresses.lottery;
    const thankYouTokenAddress = addresses.thankYouToken;
    
    console.log(`📋 Lottery address: ${lotteryAddress}`);
    console.log(`📋 Thank You Token address: ${thankYouTokenAddress}`);
    
    // Connect to lottery contract
    console.log("\n🔌 Connecting to RedDragonSwapLottery contract...");
    const lottery = await hre.ethers.getContractAt("RedDragonSwapLottery", lotteryAddress);
    
    // Check current thank you token address
    try {
      const currentThankYouToken = await lottery.getThankYouToken();
      console.log(`🔍 Current Thank You Token: ${currentThankYouToken}`);
      
      if (currentThankYouToken.toLowerCase() === thankYouTokenAddress.toLowerCase()) {
        console.log("✅ Thank You Token already set correctly!");
      } else {
        console.log("\n🔄 Updating Thank You Token...");
        const tx = await lottery.setThankYouToken(thankYouTokenAddress);
        console.log(`📄 Transaction hash: ${tx.hash}`);
        console.log("⏳ Waiting for confirmation...");
        await tx.wait();
        console.log("✅ Thank You Token updated!");
        
        // Verify the update
        const newThankYouToken = await lottery.getThankYouToken();
        console.log(`🔍 Updated Thank You Token: ${newThankYouToken}`);
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
    
    console.log("\n🎉 Update complete!");
    
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Run the function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 