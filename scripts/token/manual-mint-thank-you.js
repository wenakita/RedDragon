const hre = require("hardhat");
const fs = require("fs");

/**
 * Manually mint Thank You tokens using the emergency minting function
 * This should only be used if the VRF minting process fails
 */
async function main() {
  console.log("🎁 Manually Minting Thank You Tokens (Emergency Method)");
  console.log("===================================================");
  
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
    
    // Check thank you token address exists
    if (!addresses.thankYouToken) {
      console.error("❌ Thank You Token address not found in deployment file");
      process.exit(1);
    }
    
    const thankYouTokenAddress = addresses.thankYouToken;
    console.log(`📋 Thank You Token address: ${thankYouTokenAddress}`);
    
    // Connect to thank you token contract
    console.log("\n🔌 Connecting to ThankYouToken contract...");
    const thankYouToken = await hre.ethers.getContractAt("RedDragonThankYouTokenMulti", thankYouTokenAddress);
    
    // Check if already minted
    const hasMinted = await thankYouToken.hasMinted();
    console.log(`📊 Has minted: ${hasMinted}`);
    
    if (hasMinted) {
      console.log("✅ Tokens have already been minted!");
      // Display token info
      try {
        const recipients = [
          "0x3291B1aE6B74d59a4334bBA0257873Dda5d18115",
          "0xD2AfB6Acb56f35AFB861114c74703c53Fe6217bd"
        ];
        
        console.log("\n👥 RECIPIENT BALANCES");
        console.log("-------------------");
        
        for (let i = 0; i < recipients.length; i++) {
          const balance = await thankYouToken.balanceOf(recipients[i]);
          console.log(`Recipient ${i+1} (${recipients[i]}): ${balance.toString()}`);
        }
      } catch (error) {
        console.error("❌ Error retrieving token information:", error.message);
      }
      return;
    }
    
    // Confirm with user
    console.log("\n⚠️ WARNING: This is an emergency minting procedure");
    console.log("   You should only use this if the VRF minting process has failed");
    console.log("   This will mint tokens without the VRF randomness");
    console.log("\n   Press Ctrl+C to cancel if you want to try VRF minting instead");
    console.log("   Continuing in 5 seconds...");
    
    // Wait 5 seconds to give user time to cancel
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Perform manual minting
    console.log("\n🔄 Executing manual minting...");
    try {
      const tx = await thankYouToken.manualMintWithoutVRF();
      console.log(`📄 Transaction hash: ${tx.hash}`);
      console.log("⏳ Waiting for confirmation...");
      
      await tx.wait();
      console.log("✅ Tokens minted successfully!");
      
      // Display token info
      try {
        const recipients = [
          "0x3291B1aE6B74d59a4334bBA0257873Dda5d18115",
          "0xD2AfB6Acb56f35AFB861114c74703c53Fe6217bd"
        ];
        
        console.log("\n👥 RECIPIENT BALANCES");
        console.log("-------------------");
        
        for (let i = 0; i < recipients.length; i++) {
          const balance = await thankYouToken.balanceOf(recipients[i]);
          console.log(`Recipient ${i+1} (${recipients[i]}): ${balance.toString()}`);
        }
      } catch (error) {
        console.error("❌ Error retrieving token information:", error.message);
      }
      
    } catch (error) {
      console.error("❌ Error during manual minting:", error.message);
      console.log("\n🔍 Error details:", error);
    }
    
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