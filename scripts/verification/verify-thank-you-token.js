const hre = require("hardhat");
const fs = require("fs");

/**
 * Verify the new Thank You Token and display its details
 */
async function main() {
  console.log("🔍 Verifying Thank You Token");
  console.log("===========================");
  
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
    
    // Get the token address (use new token if available)
    const tokenAddress = addresses.newThankYouToken || addresses.thankYouToken;
    console.log(`📋 Thank You Token address: ${tokenAddress}`);
    
    // Connect to the token contract
    console.log("\n🔌 Connecting to ThankYouToken contract...");
    const token = await hre.ethers.getContractAt("RedDragonThankYouTokenMulti", tokenAddress);
    
    // Get basic token information
    const name = await token.name();
    const symbol = await token.symbol();
    const hasMinted = await token.hasMinted();
    
    console.log("\n📊 TOKEN INFORMATION");
    console.log("------------------");
    console.log(`Name: ${name}`);
    console.log(`Symbol: ${symbol}`);
    console.log(`Has Minted: ${hasMinted}`);
    
    // Get boost information
    const boostAmount = await token.THANK_YOU_BOOST();
    const boostPrecision = await token.BOOST_PRECISION();
    const boostPercentage = (Number(boostAmount) / Number(boostPrecision)) * 100;
    
    console.log(`\nBoost: ${boostPercentage.toFixed(2)}% (${boostAmount}/${boostPrecision})`);
    
    // Get connected contract addresses
    const lotteryAddress = await token.lottery();
    const vrfProviderAddress = await token.paintSwapVRF();
    
    console.log("\n🔗 CONNECTED CONTRACTS");
    console.log("-------------------");
    console.log(`Lottery: ${lotteryAddress}`);
    console.log(`VRF Provider: ${vrfProviderAddress}`);
    
    // Verify these addresses match the deployment addresses
    console.log("\n✅ VERIFICATION");
    console.log("-------------");
    
    if (lotteryAddress.toLowerCase() === addresses.lottery.toLowerCase()) {
      console.log("✓ Lottery address is correctly set");
    } else {
      console.log(`❌ Lottery address mismatch! Expected: ${addresses.lottery}`);
    }
    
    if (vrfProviderAddress.toLowerCase() === addresses.paintSwapVerifier.toLowerCase()) {
      console.log("✓ VRF Provider address is correctly set");
    } else {
      console.log(`❌ VRF Provider address mismatch! Expected: ${addresses.paintSwapVerifier}`);
    }
    
    // Get recipients and their balances
    const recipients = [
      "0x3291B1aE6B74d59a4334bBA0257873Dda5d18115",
      "0xD2AfB6Acb56f35AFB861114c74703c53Fe6217bd"
    ];
    
    console.log("\n👥 RECIPIENT BALANCES");
    console.log("-------------------");
    
    for (let i = 0; i < recipients.length; i++) {
      const balance = await token.balanceOf(recipients[i]);
      const hasToken = await token.hasThankYouToken(recipients[i]);
      const boost = await token.calculateBoost(recipients[i]);
      
      console.log(`Recipient ${i+1} (${recipients[i]}):`);
      console.log(`  Balance: ${balance.toString()}`);
      console.log(`  Has Token: ${hasToken}`);
      console.log(`  Boost Amount: ${boost.toString()}`);
    }
    
    // Get thank you message
    const message = await token.getThankYouMessage();
    console.log("\n💌 THANK YOU MESSAGE");
    console.log("-----------------");
    console.log(message);
    
    // Try to verify the contract on Sonic scan
    console.log("\n📝 ATTEMPTING VERIFICATION ON SONIC SCAN");
    console.log("--------------------------------------");
    try {
      console.log("Verifying contract on Sonic scan...");
      
      await hre.run("verify:verify", {
        address: tokenAddress,
        constructorArguments: [
          addresses.lottery,
          addresses.paintSwapVerifier,
          ["0x7df22993", "0x1a35d2fd"],
          "Thank you for your contributions to the RedDragon ecosystem!"
        ],
        contract: "contracts/RedDragonThankYouTokenMulti.sol:RedDragonThankYouTokenMulti"
      });
      
      console.log("✅ Contract successfully verified on Sonic scan!");
    } catch (error) {
      console.log(`❌ Verification error: ${error.message}`);
      console.log("Note: This is normal if the contract is already verified or if Sonic scan verification is not available.");
    }
    
    console.log("\n🎉 Verification complete!");
    
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