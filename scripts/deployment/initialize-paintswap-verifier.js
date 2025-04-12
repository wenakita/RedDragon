const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Initialize the PaintSwap Verifier with VRF configuration
 */
async function main() {
  console.log("⚙️ Initializing PaintSwap Verifier with VRF configuration...");

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
        console.log("📝 Loaded deployment addresses");
      } else {
        console.error("❌ No deployment addresses file found");
        return;
      }
    } catch (error) {
      console.error("❌ Error loading deployment addresses:", error);
      return;
    }

    // Check if PaintSwap Verifier is deployed
    if (!addresses.paintSwapVerifier) {
      console.error("❌ No PaintSwap Verifier address found");
      return;
    }

    // Get VRF configuration values from .env file
    const vrfCoordinator = process.env.PAINT_SWAP_VRF_COORDINATOR;
    const subscriptionId = process.env.PAINT_SWAP_SUBSCRIPTION_ID || "0";
    const gasLane = process.env.PAINT_SWAP_GAS_LANE || "0x0000000000000000000000000000000000000000000000000000000000000000";
    const callbackGasLimit = process.env.PAINT_SWAP_CALLBACK_GAS_LIMIT || "100000";
    const requestConfirmations = process.env.PAINT_SWAP_REQUEST_CONFIRMATIONS || "3";

    // Check if VRF Coordinator is provided
    if (!vrfCoordinator) {
      console.error("❌ No VRF Coordinator provided in .env file");
      console.error("Please add the following to your .env file:");
      console.error("PAINT_SWAP_VRF_COORDINATOR=<vrf_coordinator_address>");
      console.error("PAINT_SWAP_SUBSCRIPTION_ID=<subscription_id>");
      console.error("PAINT_SWAP_GAS_LANE=<gas_lane>");
      console.error("PAINT_SWAP_CALLBACK_GAS_LIMIT=<callback_gas_limit>");
      console.error("PAINT_SWAP_REQUEST_CONFIRMATIONS=<request_confirmations>");
      return;
    }

    // Connect to PaintSwap Verifier
    console.log("\n📦 Connecting to PaintSwap Verifier at", addresses.paintSwapVerifier);
    const paintSwapVerifier = await hre.ethers.getContractAt(
      "RedDragonPaintSwapVerifier", 
      addresses.paintSwapVerifier
    );

    // Check if already initialized
    const currentVrfCoordinator = await paintSwapVerifier.vrfCoordinator();
    if (currentVrfCoordinator !== "0x0000000000000000000000000000000000000000") {
      console.log("✅ PaintSwap Verifier already initialized with VRF Coordinator:", currentVrfCoordinator);
      return;
    }

    // Initialize PaintSwap Verifier
    console.log("VRF Coordinator:", vrfCoordinator);
    console.log("Subscription ID:", subscriptionId);
    console.log("Gas Lane:", gasLane);
    console.log("Callback Gas Limit:", callbackGasLimit);
    console.log("Request Confirmations:", requestConfirmations);
    
    const tx = await paintSwapVerifier.initialize(
      vrfCoordinator,
      subscriptionId,
      gasLane,
      callbackGasLimit,
      requestConfirmations
    );
    
    await tx.wait();
    console.log("✅ PaintSwap Verifier initialized successfully");

    console.log("\n🎉 Initialization complete!");
  } catch (error) {
    console.error("❌ Initialization failed:", error);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 