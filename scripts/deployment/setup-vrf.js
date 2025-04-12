const { ethers } = require("hardhat");
const fs = require("fs");
require("dotenv").config();

/**
 * Setup PaintSwap VRF for the RedDragonPaintSwapVerifier
 * This script initializes the VRF Coordinator settings in the verifier contract
 */
async function main() {
    console.log("🚀 Setting up PaintSwap VRF...");

    try {
        // Load deployment addresses
        let addresses = {};
        const addressesFile = "deployment-addresses-sonic.json";
        
        try {
            if (fs.existsSync(addressesFile)) {
                addresses = JSON.parse(fs.readFileSync(addressesFile));
                console.log("📝 Loaded existing deployment addresses");
            } else {
                console.log("⚠️ Deployment addresses file not found");
                console.log("Please deploy the verifier contract first using deploy-verifier.js");
                process.exit(1);
            }
        } catch (error) {
            console.error("❌ Error loading addresses file:", error.message);
            process.exit(1);
        }

        // Verify required addresses exist
        if (!addresses.verifier) {
            console.error("❌ Verifier address not found in deployment addresses!");
            console.error("Please deploy the verifier contract first using deploy-verifier.js");
            process.exit(1);
        }
        
        const verifierAddress = addresses.verifier;

        // Get deployer account
        const [deployer] = await ethers.getSigners();
        console.log("📝 Using account:", deployer.address);

        // PaintSwap VRF addresses
        const VRF_COORDINATOR = process.env.VRF_COORDINATOR || "0x3ba925fdeae6b46d0bb4d424d829982cb2f7309e";
        
        console.log("📝 VRF Coordinator:", VRF_COORDINATOR);

        // Check if the VRF Coordinator address is valid
        const codeSize = await ethers.provider.getCode(VRF_COORDINATOR);
        if (codeSize === "0x") {
            console.error("❌ No contract detected at VRF Coordinator address!");
            console.error("Please check your VRF_COORDINATOR environment variable");
            process.exit(1);
        }

        // Get VRF Coordinator contract
        const vrfCoordinator = await ethers.getContractAt("IVRFCoordinator", VRF_COORDINATOR);
        console.log("✅ Successfully connected to VRF Coordinator");

        // Get the verifier contract
        const verifier = await ethers.getContractAt("RedDragonPaintSwapVerifier", verifierAddress);
        console.log("✅ Successfully connected to RedDragonPaintSwapVerifier at", verifierAddress);

        // Check if the verifier is already initialized
        const currentCoordinator = await verifier.vrfCoordinator();
        if (currentCoordinator !== ethers.ZeroAddress) {
            console.log("ℹ️ Verifier is already initialized with coordinator:", currentCoordinator);
            console.log("Do you want to update it? If yes, use updateVRFConfig function instead");
            process.exit(0);
        }

        // Initialize the verifier with VRF Coordinator
        console.log("\n🔧 Initializing verifier...");
        const gasLane = "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f"; // Default gas lane
        const callbackGasLimit = 100000; // Default callback gas limit
        const requestConfirmations = 3; // Default request confirmations
        
        const initTx = await verifier.initialize(
            VRF_COORDINATOR,
            1, // Subscription ID (default to 1 for PaintSwap)
            gasLane,
            callbackGasLimit,
            requestConfirmations
        );
        
        console.log("⏳ Waiting for initialization transaction confirmation...");
        await initTx.wait();
        console.log("✅ Verifier initialized successfully with:");
        console.log(`   - VRF Coordinator: ${VRF_COORDINATOR}`);
        console.log(`   - Subscription ID: 1`);
        console.log(`   - Gas Lane: ${gasLane.slice(0, 10)}...`);
        console.log(`   - Callback Gas Limit: ${callbackGasLimit}`);
        console.log(`   - Request Confirmations: ${requestConfirmations}`);

        // Save updated configuration
        addresses.vrfCoordinator = VRF_COORDINATOR;
        fs.writeFileSync(addressesFile, JSON.stringify(addresses, null, 2));
        console.log("📝 Saved VRF configuration to", addressesFile);

        console.log("\n🎉 PaintSwap VRF setup complete!");
        console.log("\nNext steps:");
        console.log("1. Deploy the RedDragonSwapLottery contract if not already deployed");
        console.log("2. Deploy the RedDragon token if not already deployed");
        console.log("3. Enable trading on the RedDragon token");
    } catch (error) {
        console.error("❌ Error setting up VRF:", error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Unhandled error:", error);
        process.exit(1);
    }); 