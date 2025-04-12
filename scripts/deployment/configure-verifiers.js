const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Configure the new verifier contracts after deployment
 */
async function main() {
  console.log("⚙️ Configuring redeployed verifier contracts...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);

    // Load deployment addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    let addresses = {};
    
    try {
      if (fs.existsSync(deploymentFile)) {
        addresses = JSON.parse(fs.readFileSync(deploymentFile));
        console.log("📝 Loaded existing deployment addresses");
      } else {
        console.error("❌ No deployment addresses file found");
        return;
      }
    } catch (error) {
      console.error("❌ Error loading deployment addresses:", error);
      return;
    }

    // 1. Get PaintSwap VRF configuration values
    const vrfCoordinator = process.env.PAINT_SWAP_VRF_COORDINATOR || "0x0000000000000000000000000000000000000000";
    const subscriptionId = process.env.PAINT_SWAP_SUBSCRIPTION_ID || "0";
    const gasLane = process.env.PAINT_SWAP_GAS_LANE || "0x0000000000000000000000000000000000000000000000000000000000000000";
    const callbackGasLimit = process.env.PAINT_SWAP_CALLBACK_GAS_LIMIT || "100000";
    const requestConfirmations = process.env.PAINT_SWAP_REQUEST_CONFIRMATIONS || "3";

    // 2. Initialize PaintSwap Verifier with VRF configuration
    console.log("\n📦 Initializing PaintSwap Verifier with VRF configuration...");
    console.log("VRF Coordinator:", vrfCoordinator);
    console.log("Subscription ID:", subscriptionId);
    
    if (vrfCoordinator !== "0x0000000000000000000000000000000000000000") {
      const paintSwapVerifier = await hre.ethers.getContractAt(
        "RedDragonPaintSwapVerifier", 
        addresses.paintSwapVerifier
      );
      
      const tx = await paintSwapVerifier.initialize(
        vrfCoordinator,
        subscriptionId,
        gasLane,
        callbackGasLimit,
        requestConfirmations
      );
      
      await tx.wait();
      console.log("✅ PaintSwap Verifier initialized successfully");
    } else {
      console.warn("⚠️ No VRF Coordinator provided - skipping initialization");
      console.warn("⚠️ You will need to initialize the verifier later with proper VRF details");
    }

    // 3. Update Lottery to use new PaintSwap Verifier
    console.log("\n📦 Updating Lottery to use new PaintSwap Verifier...");
    
    if (addresses.lottery) {
      const lottery = await hre.ethers.getContractAt(
        "RedDragonSwapLottery", 
        addresses.lottery
      );
      
      // Check if current owner is deployer
      const owner = await lottery.owner();
      
      if (owner.toLowerCase() === deployer.address.toLowerCase()) {
        // Update verifier in lottery
        const tx = await lottery.setVerifier(addresses.paintSwapVerifier);
        await tx.wait();
        console.log("✅ Lottery updated to use new PaintSwap Verifier");
      } else {
        console.warn("⚠️ Cannot update Lottery - deployer is not the owner");
        console.warn("Owner:", owner);
        console.warn("Deployer:", deployer.address);
        console.warn("You need to call lottery.setVerifier(", addresses.paintSwapVerifier, ") from the owner account");
      }
    } else {
      console.warn("⚠️ No Lottery address found in deployment file");
    }

    console.log("\n🎉 Verifier contracts configured successfully!");
  } catch (error) {
    console.error("❌ Configuration failed:", error);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 