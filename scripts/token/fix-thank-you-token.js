const hre = require("hardhat");
const fs = require("fs");
const { ethers } = require("hardhat");

/**
 * Fix Thank You Token issues and attempt to mint
 * This script checks configuration, updates VRF, sends gas, and attempts to mint
 */
async function main() {
  console.log("🔄 Thank You Token Fix & Mint Script");
  console.log("===================================");

  try {
    // Load deployment addresses
    let addresses = {};
    const deploymentFile = "deployment-addresses-sonic.json";
    
    if (fs.existsSync(deploymentFile)) {
      addresses = JSON.parse(fs.readFileSync(deploymentFile));
      console.log("📝 Loaded deployment addresses");
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
      console.error("❌ PaintSwap Verifier address not found in deployment file");
      process.exit(1);
    }
    
    const thankYouTokenAddress = addresses.thankYouToken;
    const paintSwapVerifierAddress = addresses.paintSwapVerifier;
    
    console.log(`📋 Thank You Token address: ${thankYouTokenAddress}`);
    console.log(`📋 PaintSwap Verifier address: ${paintSwapVerifierAddress}`);
    
    // Connect to contracts
    const thankYouToken = await hre.ethers.getContractAt("RedDragonThankYouTokenMulti", thankYouTokenAddress);
    const verifier = await hre.ethers.getContractAt("RedDragonPaintSwapVerifier", paintSwapVerifierAddress);
    
    // Get signer
    const [signer] = await ethers.getSigners();
    console.log(`📋 Using account: ${signer.address}`);
    
    // Check VRF Provider
    console.log("\n🔍 Checking VRF Provider configuration");
    console.log("------------------------------------");
    
    const currentVRFProvider = await thankYouToken.paintSwapVRF();
    console.log(`Current VRF Provider: ${currentVRFProvider}`);
    
    if (currentVRFProvider.toLowerCase() !== paintSwapVerifierAddress.toLowerCase()) {
      console.log("⚠️ VRF Provider is not set to PaintSwap Verifier! Needs update.");
      
      try {
        // Check if signer is owner
        const owner = await thankYouToken.owner();
        if (owner.toLowerCase() !== signer.address.toLowerCase()) {
          console.error("❌ You are not the owner of the contract. Cannot update VRF Provider.");
          console.log(`Current owner: ${owner}`);
          process.exit(1);
        }
        
        // Update VRF Provider
        console.log("\n🔄 Updating VRF Provider to PaintSwap Verifier...");
        const tx = await thankYouToken.updateVRFProvider(paintSwapVerifierAddress);
        console.log(`Transaction sent: ${tx.hash}`);
        console.log("Waiting for confirmation...");
        
        await tx.wait();
        console.log("✅ VRF Provider updated successfully!");
        
        // Verify update
        const newVRFProvider = await thankYouToken.paintSwapVRF();
        console.log(`New VRF Provider: ${newVRFProvider}`);
        
        if (newVRFProvider.toLowerCase() === paintSwapVerifierAddress.toLowerCase()) {
          console.log("✅ VRF Provider is now correctly set");
        } else {
          console.error("❌ Failed to update VRF Provider properly");
          process.exit(1);
        }
      } catch (error) {
        console.error("❌ Error updating VRF Provider:", error.message);
        process.exit(1);
      }
    } else {
      console.log("✅ VRF Provider is correctly set to PaintSwap Verifier");
    }
    
    // Check VRF Coordinator on PaintSwap Verifier
    console.log("\n🔍 Checking PaintSwap Verifier configuration");
    console.log("------------------------------------------");
    
    try {
      const vrfCoordinator = await verifier.vrfCoordinator();
      console.log(`VRF Coordinator: ${vrfCoordinator}`);
      
      if (vrfCoordinator === "0x0000000000000000000000000000000000000000") {
        console.log("⚠️ VRF Coordinator is not set on PaintSwap Verifier!");
        console.log("   This might cause VRF to fail. Consider initializing it first.");
      } else {
        console.log("✅ VRF Coordinator is set");
      }
    } catch (error) {
      console.error("⚠️ Could not check VRF Coordinator:", error.message);
    }
    
    // Check contract balance and send gas if needed
    console.log("\n🔍 Checking contract balance");
    console.log("--------------------------");
    
    const provider = ethers.provider;
    const contractBalance = await provider.getBalance(thankYouTokenAddress);
    console.log(`Contract balance: ${ethers.utils.formatEther(contractBalance)} Sonic`);
    
    // Check if signer has enough gas
    const signerBalance = await provider.getBalance(signer.address);
    console.log(`Your balance: ${ethers.utils.formatEther(signerBalance)} Sonic`);
    
    if (contractBalance.lt(ethers.utils.parseEther("0.1"))) {
      console.log("⚠️ Contract has low balance (< 0.1 Sonic)");
      console.log("   This may cause VRF callbacks to fail");
      
      if (signerBalance.gt(ethers.utils.parseEther("1.1"))) {
        console.log("\n🔄 Sending 1 Sonic to contract to ensure VRF can be paid...");
        
        try {
          const tx = await signer.sendTransaction({
            to: thankYouTokenAddress,
            value: ethers.utils.parseEther("1.0")
          });
          
          console.log(`Transaction sent: ${tx.hash}`);
          console.log("Waiting for confirmation...");
          
          await tx.wait();
          console.log("✅ Successfully sent 1 Sonic to contract!");
          
          // Verify new balance
          const newBalance = await provider.getBalance(thankYouTokenAddress);
          console.log(`New contract balance: ${ethers.utils.formatEther(newBalance)} Sonic`);
        } catch (error) {
          console.error("❌ Error sending Sonic to contract:", error.message);
        }
      } else {
        console.log("⚠️ You don't have enough balance to send gas to the contract");
        console.log("   Consider funding your account first");
      }
    } else {
      console.log("✅ Contract has sufficient balance for VRF callbacks");
    }
    
    // Check if tokens have been minted
    console.log("\n🔍 Checking token mint status");
    console.log("---------------------------");
    
    const hasMinted = await thankYouToken.hasMinted();
    console.log(`Has minted: ${hasMinted}`);
    
    if (hasMinted) {
      console.log("✅ Tokens have already been minted!");
      
      // Check recipient balances
      console.log("\n👥 Checking recipient balances");
      console.log("---------------------------");
      
      const recipients = [
        "0x3291B1aE6B74d59a4334bBA0257873Dda5d18115",
        "0xD2AfB6Acb56f35AFB861114c74703c53Fe6217bd"
      ];
      
      for (let i = 0; i < recipients.length; i++) {
        const balance = await thankYouToken.balanceOf(recipients[i]);
        console.log(`Recipient ${i+1} (${recipients[i]}): ${balance.toString()}`);
      }
    } else {
      console.log("⚠️ Tokens have not been minted yet");
      
      console.log("\n🔄 Attempting to start minting with VRF...");
      try {
        const tx = await thankYouToken.startMintWithVRF();
        console.log(`Transaction sent: ${tx.hash}`);
        console.log("Waiting for confirmation...");
        
        await tx.wait();
        console.log("✅ VRF request sent successfully!");
        console.log("   Waiting for VRF to fulfill randomness and mint tokens...");
        console.log("   This process might take some time (minutes to hours).");
        console.log("   Run the check-thank-you-token.js script later to check the status.");
      } catch (error) {
        console.error("❌ Error starting mint with VRF:", error.message);
        
        if (error.message.includes("VRF provider not set")) {
          console.log("⚠️ VRF provider is not properly set. Please check configuration.");
        } else if (error.message.includes("reverted")) {
          console.log("⚠️ The contract reverted the transaction. This could be due to:");
          console.log("   - VRF Coordinator not initialized properly");
          console.log("   - Contract already has a pending VRF request");
          console.log("   - You're not authorized to call this function");
        }
      }
    }
    
    console.log("\n✅ Script completed successfully!");
    
  } catch (error) {
    console.error("❌ Error during execution:", error.message);
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