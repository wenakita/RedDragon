const hre = require("hardhat");
const fs = require("fs");
const { ethers } = require("hardhat");

/**
 * Check Thank You Token status after VRF process
 * This script verifies if tokens have been minted and displays balances
 */
async function main() {
  console.log("🔍 Thank You Token Status Check");
  console.log("==============================");
  
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
    
    // Check required address exists
    if (!addresses.thankYouToken) {
      console.error("❌ Thank You Token address not found in deployment file");
      process.exit(1);
    }
    
    const thankYouTokenAddress = addresses.thankYouToken;
    console.log(`📋 Thank You Token address: ${thankYouTokenAddress}`);
    
    // Connect to contract
    const thankYouToken = await hre.ethers.getContractAt("RedDragonThankYouTokenMulti", thankYouTokenAddress);
    
    // Check contract configuration
    console.log("\n🔍 CONTRACT CONFIGURATION");
    console.log("------------------------");
    
    const vrfProvider = await thankYouToken.paintSwapVRF();
    console.log(`VRF Provider: ${vrfProvider}`);
    
    if (addresses.paintSwapVerifier) {
      if (vrfProvider.toLowerCase() === addresses.paintSwapVerifier.toLowerCase()) {
        console.log("✅ VRF Provider is correctly set to PaintSwap Verifier");
      } else {
        console.log("⚠️ VRF Provider does NOT match PaintSwap Verifier address");
        console.log(`   Expected: ${addresses.paintSwapVerifier}`);
        console.log(`   Actual: ${vrfProvider}`);
      }
    }
    
    // Check contract balance
    const provider = ethers.provider;
    const contractBalance = await provider.getBalance(thankYouTokenAddress);
    console.log(`Contract balance: ${ethers.utils.formatEther(contractBalance)} Sonic`);
    
    if (contractBalance < ethers.utils.parseEther("0.1")) {
      console.log("⚠️ Contract has low balance (< 0.1 Sonic)");
      console.log("   This may cause VRF callbacks to fail");
    } else {
      console.log("✅ Contract has sufficient balance for VRF callbacks");
    }
    
    // Check minting status
    console.log("\n🔍 MINTING STATUS");
    console.log("----------------");
    
    const hasMinted = await thankYouToken.hasMinted();
    console.log(`Has minted: ${hasMinted}`);
    
    // Check if VRF request is pending
    let requestId;
    try {
      requestId = await thankYouToken.requestId();
      console.log(`Current VRF request ID: ${requestId.toString()}`);
      
      if (requestId.toString() !== "0" && !hasMinted) {
        console.log("🔄 VRF request is pending");
        console.log("   Waiting for VRF Coordinator to fulfill randomness");
      } else if (requestId.toString() === "0" && !hasMinted) {
        console.log("⚠️ No VRF request has been made yet");
        console.log("   You need to call startMintWithVRF() first");
      }
    } catch (error) {
      console.log("ℹ️ Could not retrieve request ID (this might be normal if not using request ID tracking)");
    }
    
    // Display token info if minted
    if (hasMinted) {
      console.log("\n🪙 TOKEN INFORMATION");
      console.log("-------------------");
      
      try {
        const name = await thankYouToken.name();
        const symbol = await thankYouToken.symbol();
        const totalSupply = await thankYouToken.totalSupply();
        
        console.log(`Name: ${name}`);
        console.log(`Symbol: ${symbol}`);
        console.log(`Total Supply: ${totalSupply.toString()}`);
        
        // Check predefined recipient addresses
        const recipients = [
          "0x3291B1aE6B74d59a4334bBA0257873Dda5d18115",
          "0xD2AfB6Acb56f35AFB861114c74703c53Fe6217bd"
        ];
        
        console.log("\n👥 RECIPIENT BALANCES");
        console.log("-------------------");
        
        let totalDistributed = ethers.BigNumber.from("0");
        
        for (let i = 0; i < recipients.length; i++) {
          const balance = await thankYouToken.balanceOf(recipients[i]);
          console.log(`Recipient ${i+1} (${recipients[i]}): ${balance.toString()}`);
          totalDistributed = totalDistributed.add(balance);
        }
        
        // Check if there are other token holders
        console.log(`\nTotal tokens distributed to known recipients: ${totalDistributed.toString()}`);
        
        if (totalDistributed.lt(totalSupply)) {
          console.log(`⚠️ Not all tokens accounted for: ${totalSupply.sub(totalDistributed).toString()} tokens unaccounted`);
          console.log("   There may be other recipients not in our predefined list");
        } else if (totalDistributed.eq(totalSupply)) {
          console.log("✅ All tokens are accounted for with known recipients");
        }
      } catch (error) {
        console.error("❌ Error retrieving token information:", error.message);
      }
    } else {
      console.log("\n⚠️ Tokens have not been minted yet");
      console.log("   Please run the fix-thank-you-token.js script to attempt minting");
    }
    
    console.log("\n✅ Status check completed!");
    
  } catch (error) {
    console.error("❌ Error in status check:", error.message);
    process.exit(1);
  }
}

// Run the main function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 