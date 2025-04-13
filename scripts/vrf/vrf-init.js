const hre = require("hardhat");
const fs = require("fs");
const { parseEther } = hre.ethers;

/**
 * Initialize PaintSwap VRF Coordinator on the Sonic network
 * By calling the necessary methods to set up VRF
 */
async function main() {
  console.log("🔄 PaintSwap VRF Initialization");
  console.log("=============================");
  
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
    
    // PaintSwap Verifier address
    const paintSwapVerifierAddress = addresses.paintSwapVerifier;
    console.log(`📋 PaintSwap Verifier address: ${paintSwapVerifierAddress}`);
    
    // Connect to verifier contract
    console.log("\n🔌 Connecting to PaintSwap Verifier...");
    const paintSwapVerifier = await hre.ethers.getContractAt("RedDragonPaintSwapVerifier", paintSwapVerifierAddress);
    
    // Check if we need to send gas to the contract
    const contractBalance = await hre.ethers.provider.getBalance(paintSwapVerifierAddress);
    console.log(`💰 Contract balance: ${hre.ethers.formatEther(contractBalance)} SONIC`);
    
    if (contractBalance < parseEther("0.1")) {
      console.log("\n💰 Sending 0.5 SONIC to contract for gas...");
      const signer = await hre.ethers.provider.getSigner();
      
      const tx = await signer.sendTransaction({
        to: paintSwapVerifierAddress,
        value: parseEther("0.5")
      });
      
      console.log(`Transaction hash: ${tx.hash}`);
      console.log("Waiting for confirmation...");
      await tx.wait();
      console.log("✅ Gas sent to contract!");
    }
    
    // VRF Coordinator on Sonic
    const VRF_COORDINATOR = "0x3Ba925fdeAe6B46d0BB4d424D829982Cb2F7309e";
    console.log(`\n📋 VRF Coordinator address: ${VRF_COORDINATOR}`);
    
    // Check if VRF Coordinator is already set
    try {
      const currentCoordinator = await paintSwapVerifier.getVrfCoordinator();
      console.log(`🔍 Current VRF Coordinator: ${currentCoordinator}`);
      
      if (currentCoordinator.toLowerCase() === VRF_COORDINATOR.toLowerCase()) {
        console.log("✅ VRF Coordinator already set correctly!");
      } else {
        console.log("\n🔄 Setting VRF Coordinator...");
        const setTx = await paintSwapVerifier.setVrfCoordinator(VRF_COORDINATOR);
        console.log(`Transaction hash: ${setTx.hash}`);
        console.log("Waiting for confirmation...");
        await setTx.wait();
        console.log("✅ VRF Coordinator set!");
      }
    } catch (error) {
      console.log(`❌ Error checking VRF Coordinator: ${error.message}`);
      console.log("\n🔄 Setting VRF Coordinator...");
      try {
        const setTx = await paintSwapVerifier.setVrfCoordinator(VRF_COORDINATOR);
        console.log(`Transaction hash: ${setTx.hash}`);
        console.log("Waiting for confirmation...");
        await setTx.wait();
        console.log("✅ VRF Coordinator set!");
      } catch (error) {
        console.error(`❌ Error setting VRF Coordinator: ${error.message}`);
      }
    }
    
    // KeyHash for Sonic network
    const KEY_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";
    
    try {
      const currentKeyHash = await paintSwapVerifier.getKeyHash();
      console.log(`🔍 Current Key Hash: ${currentKeyHash}`);
      
      if (currentKeyHash.toLowerCase() === KEY_HASH.toLowerCase()) {
        console.log("✅ Key Hash already set correctly!");
      } else {
        console.log("\n🔄 Setting Key Hash...");
        const setTx = await paintSwapVerifier.setKeyHash(KEY_HASH);
        console.log(`Transaction hash: ${setTx.hash}`);
        console.log("Waiting for confirmation...");
        await setTx.wait();
        console.log("✅ Key Hash set!");
      }
    } catch (error) {
      console.log(`❌ Error checking Key Hash: ${error.message}`);
      console.log("\n🔄 Setting Key Hash...");
      try {
        const setTx = await paintSwapVerifier.setKeyHash(KEY_HASH);
        console.log(`Transaction hash: ${setTx.hash}`);
        console.log("Waiting for confirmation...");
        await setTx.wait();
        console.log("✅ Key Hash set!");
      } catch (error) {
        console.error(`❌ Error setting Key Hash: ${error.message}`);
      }
    }
    
    // Check if we need to also update the VRF provider on ThankYouToken
    const thankYouTokenAddress = addresses.thankYouToken;
    console.log(`\n📋 Thank You Token address: ${thankYouTokenAddress}`);
    
    const thankYouToken = await hre.ethers.getContractAt("RedDragonThankYouTokenMulti", thankYouTokenAddress);
    
    try {
      const currentProvider = await thankYouToken.paintSwapVRF();
      console.log(`🔍 Current VRF Provider: ${currentProvider}`);
      
      if (currentProvider.toLowerCase() === paintSwapVerifierAddress.toLowerCase()) {
        console.log("✅ VRF Provider already set correctly!");
      } else {
        console.log("\n🔄 Setting VRF Provider...");
        const setTx = await thankYouToken.setVrfProvider(paintSwapVerifierAddress);
        console.log(`Transaction hash: ${setTx.hash}`);
        console.log("Waiting for confirmation...");
        await setTx.wait();
        console.log("✅ VRF Provider set!");
      }
    } catch (error) {
      console.error(`❌ Error checking/setting VRF Provider: ${error.message}`);
    }
    
    console.log("\n🎉 VRF initialization completed!");
    console.log("You can now try minting the Thank You tokens with VRF using:");
    console.log("npx hardhat run scripts/mint-thank-you-tokens.js --network sonic");
    console.log("Or use the manual mint if needed:");
    console.log("npx hardhat run scripts/manual-mint-thank-you.js --network sonic");
    
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