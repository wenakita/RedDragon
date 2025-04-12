const hre = require("hardhat");
const fs = require("fs");

/**
 * Deploy a new Thank You Token with VRF that doesn't need direct payments
 */
async function main() {
  console.log("🚀 Deploying New RedDragonThankYouToken");
  console.log("====================================");
  
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
    const paintSwapVerifierAddress = addresses.paintSwapVerifier;
    
    console.log(`📋 Lottery address: ${lotteryAddress}`);
    console.log(`📋 PaintSwap Verifier address: ${paintSwapVerifierAddress}`);
    
    // Create commemorated method signatures (example VRF methods)
    const commemoratedMethods = [
      "0x7df22993", // requestRandomness()
      "0x1a35d2fd"  // fulfillRandomness(bytes32,uint256[])
    ];
    
    // Thank you message
    const thankYouMessage = "Thank you for your contributions to the RedDragon ecosystem!";
    
    // Deploy the token
    console.log("\n🔄 Deploying RedDragonThankYouToken contract...");
    
    const RedDragonThankYouToken = await hre.ethers.getContractFactory("RedDragonThankYouTokenMulti");
    
    const token = await RedDragonThankYouToken.deploy(
      lotteryAddress,
      paintSwapVerifierAddress,
      commemoratedMethods,
      thankYouMessage
    );
    
    console.log(`⏳ Deployment transaction sent: ${token.deploymentTransaction().hash}`);
    console.log("Waiting for deployment to complete...");
    
    await token.waitForDeployment();
    
    const tokenAddress = await token.getAddress();
    console.log(`✅ RedDragonThankYouToken deployed to: ${tokenAddress}`);
    
    // Save the new address
    addresses.newThankYouToken = tokenAddress;
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    console.log(`📝 Saved new address to ${deploymentFile}`);
    
    // Mint tokens with manual method
    console.log("\n🎁 Minting tokens using manual method...");
    
    try {
      const tx = await token.manualMintWithoutVRF();
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
          const balance = await token.balanceOf(recipients[i]);
          console.log(`Recipient ${i+1} (${recipients[i]}): ${balance.toString()}`);
        }
      } catch (error) {
        console.error("❌ Error retrieving token information:", error.message);
      }
      
    } catch (error) {
      console.error("❌ Error during token minting:", error.message);
    }
    
    console.log("\n🎉 Deployment complete!");
    
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