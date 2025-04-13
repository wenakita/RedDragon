const hre = require("hardhat");
const fs = require("fs");

/**
 * Mint the Thank You tokens for the recipients
 * This grants them a 0.69% boost in the lottery
 */
async function main() {
  console.log("🎁 Minting Thank You Tokens...");
  console.log("============================");
  
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
      console.error("   Please deploy the token first with scripts/deploy-thank-you-token.js");
      process.exit(1);
    }
    
    const thankYouTokenAddress = addresses.thankYouToken;
    
    // Connect to thank you token contract
    console.log(`\n🔌 Connecting to ThankYouToken at ${thankYouTokenAddress}...`);
    const thankYouToken = await hre.ethers.getContractAt("RedDragonThankYouTokenMulti", thankYouTokenAddress);
    
    // Get minting status
    let hasMinted;
    try {
      hasMinted = await thankYouToken.hasMinted();
      console.log(`📊 Has minted: ${hasMinted}`);
    } catch (error) {
      console.error("❌ Error checking minting status:", error.message);
      console.log("   This could indicate an interface issue with the contract");
    }
    
    if (hasMinted) {
      console.log("⚠️ Tokens have already been minted!");
      
      // Try to get recipients who received tokens
      try {
        // Check balance of first address
        const firstRecipient = "0x3291B1aE6B74d59a4334bBA0257873Dda5d18115";
        const firstBalance = await thankYouToken.balanceOf(firstRecipient);
        
        // Check balance of second address
        const secondRecipient = "0xD2AfB6Acb56f35AFB861114c74703c53Fe6217bd";
        const secondBalance = await thankYouToken.balanceOf(secondRecipient);
        
        console.log("\n📋 Current token balances:");
        console.log(`   ${firstRecipient}: ${firstBalance} token(s)`);
        console.log(`   ${secondRecipient}: ${secondBalance} token(s)`);
      } catch (error) {
        console.log("Could not fetch token balances:", error.message);
      }
      
      return;
    }
    
    // Check if the VRF provider is set
    let vrfProvider;
    try {
      vrfProvider = await thankYouToken.paintSwapVRF();
      console.log(`🔍 VRF Provider: ${vrfProvider}`);
      
      // Check if VRF provider is zero address
      if (vrfProvider === "0x0000000000000000000000000000000000000000") {
        console.error("❌ VRF Provider is set to zero address!");
        console.log("   This will cause the minting to revert");
        console.log("   Please update the VRF provider address first");
        return;
      }
    } catch (error) {
      console.error("❌ Error checking VRF provider:", error.message);
      console.log("   This could indicate an interface issue with the contract");
    }
    
    // Check for pending mints
    try {
      // Try to check if there are pending mints already
      // This is a bit tricky since we don't know what request IDs might be pending
      console.log("🔍 Checking for any existing pending mints...");
      // We can't easily check for pending mints without knowing request IDs
      console.log("   Note: Can't fully verify if minting is already in progress");
    } catch (error) {
      console.log("   Could not check pending mints:", error.message);
    }
    
    // Get owner of the thank you token contract
    const [signer] = await hre.ethers.getSigners();
    let tokenOwner;
    try {
      tokenOwner = await thankYouToken.owner();
      console.log(`🔑 Contract owner: ${tokenOwner}`);
      
      if (tokenOwner.toLowerCase() !== signer.address.toLowerCase()) {
        console.error("❌ Signer does not have owner access to ThankYouToken");
        console.log(`   Owner: ${tokenOwner}`);
        console.log(`   Signer: ${signer.address}`);
        console.log("   Please run this script with the owner's private key");
        process.exit(1);
      }
    } catch (error) {
      console.error("❌ Error checking contract owner:", error.message);
      console.log("   This could indicate an interface issue with the contract");
    }
    
    // Try to check contract balance to ensure it has enough gas
    try {
      const contractBalance = await hre.ethers.provider.getBalance(thankYouTokenAddress);
      console.log(`💰 Contract balance: ${hre.ethers.formatEther(contractBalance)} ETH`);
      
      if (contractBalance < hre.ethers.parseEther("0.01")) {
        console.log("⚠️ Contract may not have enough gas for VRF callback");
        console.log("   Consider sending some gas to the contract address");
      }
    } catch (error) {
      console.log("   Could not check contract balance:", error.message);
    }
    
    // Start the minting process with VRF
    console.log("\n🔄 Starting minting process with VRF...");
    try {
      const tx = await thankYouToken.startMintWithVRF();
      console.log(`   Transaction sent: ${tx.hash}`);
      
      // Wait for transaction to be mined
      await tx.wait();
      console.log("✅ Minting process started!");
      
      console.log("\n⏳ The VRF provider will call back with randomness to complete the minting");
      console.log("   This process may take a few minutes to a few hours depending on VRF latency");
      console.log("   You can check the status by running this script again");
    } catch (error) {
      console.error(`❌ Error during minting: ${error.message}`);
      
      // Provide specific guidance based on error message
      if (error.message.includes("execution reverted")) {
        console.log("\n🔍 Possible reasons for the revert:");
        console.log("1. Minting might already be in progress (pending VRF callback)");
        console.log("2. Contract might not have enough gas for VRF operations");
        console.log("3. The VRF provider might not be correctly configured");
        console.log("4. The contract might already have minted tokens");
        
        console.log("\n📋 Suggestions:");
        console.log("- Check the contract's hasMinted state by calling it directly");
        console.log("- Verify the contract has enough gas balance");
        console.log("- Check that the VRF provider is properly set up");
        console.log("- You might need to deploy a fresh contract if tokens were already minted");
      }
    }
    
  } catch (error) {
    console.error("❌ Error during execution:", error.message);
    process.exit(1);
  }
}

// Run the minting function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 