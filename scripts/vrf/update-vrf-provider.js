const hre = require("hardhat");
const fs = require("fs");

/**
 * Update the VRF provider address in the ThankYouToken contract
 * This fixes issues with VRF integration if it's set incorrectly
 */
async function main() {
  console.log("🔄 Updating VRF Provider in ThankYouToken Contract");
  console.log("=============================================");
  
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
    
    // Check required addresses exist
    if (!addresses.thankYouToken) {
      console.error("❌ Thank You Token address not found in deployment file");
      process.exit(1);
    }
    
    if (!addresses.paintSwapVerifier) {
      console.error("❌ PaintSwap verifier address not found in deployment file");
      process.exit(1);
    }
    
    const thankYouTokenAddress = addresses.thankYouToken;
    const paintSwapVerifierAddress = addresses.paintSwapVerifier;
    
    console.log(`📋 Thank You Token address: ${thankYouTokenAddress}`);
    console.log(`📋 PaintSwap Verifier address: ${paintSwapVerifierAddress}`);
    
    // Connect to thank you token contract
    console.log("\n🔌 Connecting to ThankYouToken contract...");
    const thankYouToken = await hre.ethers.getContractAt("RedDragonThankYouTokenMulti", thankYouTokenAddress);
    
    // Check current VRF provider
    try {
      const currentVrfProvider = await thankYouToken.paintSwapVRF();
      console.log(`\n🔍 Current VRF Provider: ${currentVrfProvider}`);
      
      if (currentVrfProvider.toLowerCase() === paintSwapVerifierAddress.toLowerCase()) {
        console.log("✅ VRF Provider is already set correctly!");
        console.log("   No update needed.");
        return;
      }
      
      if (currentVrfProvider === "0x0000000000000000000000000000000000000000") {
        console.log("⚠️ Current VRF Provider is zero address!");
      } else {
        console.log("⚠️ VRF Provider is set to a different address than the PaintSwap verifier!");
      }
    } catch (error) {
      console.error("❌ Error checking current VRF provider:", error.message);
      console.log("   Continuing with update anyway...");
    }
    
    // Get contract owner
    const [signer] = await hre.ethers.getSigners();
    let owner;
    try {
      owner = await thankYouToken.owner();
      console.log(`\n👤 Contract owner: ${owner}`);
      
      if (owner.toLowerCase() !== signer.address.toLowerCase()) {
        console.error("❌ Signer does not have owner access to ThankYouToken");
        console.log(`   Owner: ${owner}`);
        console.log(`   Signer: ${signer.address}`);
        console.log("   Please run this script with the owner's private key");
        process.exit(1);
      }
    } catch (error) {
      console.error("❌ Error checking contract owner:", error.message);
      console.log("   This could indicate an interface issue with the contract");
      process.exit(1);
    }
    
    // Update VRF provider
    console.log("\n🔄 Updating VRF Provider to:", paintSwapVerifierAddress);
    
    try {
      const tx = await thankYouToken.setVrfProvider(paintSwapVerifierAddress);
      console.log(`📄 Transaction hash: ${tx.hash}`);
      console.log("⏳ Waiting for transaction to be mined...");
      
      await tx.wait();
      console.log("✅ Transaction confirmed!");
      
      // Verify the update
      const newVrfProvider = await thankYouToken.paintSwapVRF();
      if (newVrfProvider.toLowerCase() === paintSwapVerifierAddress.toLowerCase()) {
        console.log("\n✅ VRF Provider successfully updated!");
      } else {
        console.error("\n❌ VRF Provider update failed!");
        console.log(`   Expected: ${paintSwapVerifierAddress}`);
        console.log(`   Actual: ${newVrfProvider}`);
      }
    } catch (error) {
      console.error("❌ Error updating VRF provider:", error.message);
      process.exit(1);
    }
    
    console.log("\n🎉 Success! You can now try to mint the tokens with:");
    console.log("   npx hardhat run scripts/mint-thank-you-tokens.js --network sonic");
    
  } catch (error) {
    console.error("❌ Error during VRF provider update:", error.message);
    process.exit(1);
  }
}

// Run the update function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 