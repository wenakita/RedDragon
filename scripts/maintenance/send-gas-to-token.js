const hre = require("hardhat");
const fs = require("fs");

/**
 * Send Sonic tokens to the ThankYouToken contract for gas
 * Simple direct transfer script
 */
async function main() {
  console.log("💰 Sending Gas to ThankYouToken Contract");
  console.log("=====================================");
  
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
    
    // Get signer
    const [signer] = await hre.ethers.getSigners();
    console.log(`🔑 Using signer: ${signer.address}`);
    
    // Check signer balance
    const signerBalance = await hre.ethers.provider.getBalance(signer.address);
    console.log(`💰 Signer balance: ${hre.ethers.formatEther(signerBalance)} SONIC`);
    
    // Check contract's current balance
    const contractBalance = await hre.ethers.provider.getBalance(thankYouTokenAddress);
    console.log(`💰 Current contract balance: ${hre.ethers.formatEther(contractBalance)} SONIC`);
    
    // Send 0.5 SONIC to the contract using a simple transaction
    const amountToSend = hre.ethers.parseEther("0.5");
    console.log(`\n🔄 Sending ${hre.ethers.formatEther(amountToSend)} SONIC to contract...`);
    
    const tx = await signer.sendTransaction({
      to: thankYouTokenAddress,
      value: amountToSend
    });
    
    console.log(`📄 Transaction hash: ${tx.hash}`);
    console.log("⏳ Waiting for transaction to be mined...");
    
    await tx.wait();
    console.log("✅ Transaction confirmed!");
    
    // Check new contract balance
    const newContractBalance = await hre.ethers.provider.getBalance(thankYouTokenAddress);
    console.log(`\n💰 New contract balance: ${hre.ethers.formatEther(newContractBalance)} SONIC`);
    
    console.log("\n🎉 Success! The contract now has gas for VRF operations.");
    console.log("   You can now try to mint the tokens with:");
    console.log("   npx hardhat run scripts/mint-thank-you-tokens.js --network sonic");
    
  } catch (error) {
    console.error("❌ Error sending gas to contract:", error);
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