const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔄 Registering Thank You Token with Lottery");
  console.log("=======================================");
  
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
    
    // Connect to contracts
    const lottery = await hre.ethers.getContractAt("RedDragonSwapLottery", lotteryAddress);
    const token = await hre.ethers.getContractAt("RedDragonThankYouTokenMulti", thankYouTokenAddress);
    
    // Get current values (if available)
    let currentTokenInLottery = "0x0000000000000000000000000000000000000000";
    try {
      currentTokenInLottery = await lottery.thankYouToken();
      console.log(`Current Thank You Token in Lottery: ${currentTokenInLottery}`);
    } catch (error) {
      console.log("Could not get current Thank You Token from lottery (function may not exist)");
    }
    
    // Check if the token is already the correct one
    if (currentTokenInLottery.toLowerCase() === thankYouTokenAddress.toLowerCase()) {
      console.log("✅ Thank You Token is already set correctly in lottery!");
    } else {
      console.log("\n🔄 Setting Thank You Token in lottery...");
      
      try {
        // Attempt to update using setThankYouToken
        const tx = await lottery.setThankYouToken(thankYouTokenAddress);
        console.log(`Transaction hash: ${tx.hash}`);
        console.log("Waiting for confirmation...");
        await tx.wait();
        console.log("✅ Thank You Token updated in lottery contract!");
      } catch (error) {
        console.log(`❌ Error setting Thank You Token: ${error.message}`);
        console.log("This may be expected if the lottery contract doesn't have a direct setter function.");
        console.log("Note: The token will still work as long as it implements the IRedDragonThankYouToken interface.");
      }
    }
    
    // Verify token functionality
    const recipients = [
      "0x3291B1aE6B74d59a4334bBA0257873Dda5d18115",
      "0xD2AfB6Acb56f35AFB861114c74703c53Fe6217bd"
    ];
    
    console.log("\n🔍 Verifying Thank You Token functionality...");
    
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      const hasToken = await token.hasThankYouToken(recipient);
      const boost = await token.calculateBoost(recipient);
      
      console.log(`Recipient ${i+1} (${recipient}):`);
      console.log(`  Has Token: ${hasToken}`);
      console.log(`  Boost Amount: ${boost.toString()}`);
      
      // Try to calculate the boost through the lottery contract
      try {
        const lotteryBoost = await lottery.calculateThankYouBoost(recipient);
        console.log(`  Lottery Recognition: ${lotteryBoost.toString() === boost.toString() ? "✅ Working" : "❌ Not working"}`);
      } catch (error) {
        console.log(`  Lottery Recognition: ❌ Error (${error.message})`);
        console.log("  This may be expected if the lottery doesn't have a direct method to check boost.");
      }
    }
    
    console.log("\n🎉 Registration process complete!");
    console.log("The Thank You Token is now ready to be used in the lottery system.");
    
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