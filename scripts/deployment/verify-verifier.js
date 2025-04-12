const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

async function main() {
  console.log("🔍 Verifying PaintSwap Verifier setup...");

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

    // Check PaintSwap Verifier Configuration
    console.log("\n🔷 Checking PaintSwap Verifier Configuration...");
    if (addresses.paintSwapVerifier) {
      const paintSwapVerifier = await hre.ethers.getContractAt("RedDragonPaintSwapVerifier", addresses.paintSwapVerifier);
      
      // Get VRF coordinator address
      const vrfCoordinator = await paintSwapVerifier.vrfCoordinator();
      console.log("VRF Coordinator:", vrfCoordinator);
      
      if (vrfCoordinator === "0x0000000000000000000000000000000000000000") {
        console.log("⚠️ VRF Coordinator not set - verifier will revert if randomness is requested");
        console.log("   You need to initialize the verifier with a valid VRF coordinator");
      } else {
        console.log("✅ VRF Coordinator is set");
      }

      // Get owner
      const owner = await paintSwapVerifier.owner();
      console.log("Owner:", owner);
      
      if (owner.toLowerCase() === deployer.address.toLowerCase()) {
        console.log("✅ Deployer is the owner of the PaintSwap Verifier");
      } else {
        console.log("⚠️ Deployer is not the owner of the PaintSwap Verifier");
        console.log("   Owner:", owner);
        console.log("   Deployer:", deployer.address);
      }
    } else {
      console.log("❌ No PaintSwap Verifier address found");
    }

    console.log("✅ Verification complete!");
  } catch (error) {
    console.error("❌ Verification failed:", error);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 