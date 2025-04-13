const hre = require("hardhat");
const fs = require("fs");

/**
 * Simple script to mint Thank You tokens directly
 */
async function main() {
  console.log("🎁 Minting Thank You Tokens");
  console.log("==========================");
  
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
    console.log(`Has minted: ${hasMinted}`);
    
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
    
    // Try direct minting if possible
    console.log("\n🔄 Attempting to mint tokens...");
    
    try {
      // Check if there's a direct mint function
      if (typeof thankYouToken.mint === "function") {
        console.log("Using direct mint function...");
        const tx = await thankYouToken.mint();
        console.log(`Transaction sent: ${tx.hash}`);
        console.log("Waiting for confirmation...");
        await tx.wait();
        console.log("✅ Tokens minted successfully!");
      } else if (typeof thankYouToken.startMintWithVRF === "function") {
        console.log("Using VRF mint function...");
        const tx = await thankYouToken.startMintWithVRF();
        console.log(`Transaction sent: ${tx.hash}`);
        console.log("Waiting for confirmation...");
        await tx.wait();
        console.log("✅ VRF mint request sent successfully!");
        console.log("   The actual minting will happen after the VRF callback");
        console.log("   Please check back later with scripts/check-thank-you-token.js");
      } else if (typeof thankYouToken.mintManual === "function") {
        console.log("Using manual mint function...");
        const recipients = [
          "0x3291B1aE6B74d59a4334bBA0257873Dda5d18115",
          "0xD2AfB6Acb56f35AFB861114c74703c53Fe6217bd"
        ];
        const tx = await thankYouToken.mintManual(recipients);
        console.log(`Transaction sent: ${tx.hash}`);
        console.log("Waiting for confirmation...");
        await tx.wait();
        console.log("✅ Tokens minted successfully!");
      } else {
        console.log("❌ No suitable mint function found");
        console.log("Available functions:", Object.keys(thankYouToken.functions));
      }
    } catch (error) {
      console.error("❌ Error minting tokens:", error.message);
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