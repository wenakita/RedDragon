const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Verify the PaintSwap Verifier and Lottery setup
 */
async function main() {
  console.log("🔍 Verifying PaintSwap setup...");

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

    // Verify PaintSwap Verifier
    console.log("\n🔍 Checking PaintSwap Verifier...");
    
    if (!addresses.paintSwapVerifier) {
      console.error("❌ PaintSwap Verifier address not found in deployment addresses!");
      return;
    }
    
    const verifierAbi = [
      "function vrfCoordinator() view returns (address)",
      "function owner() view returns (address)"
    ];
    
    const verifier = new hre.ethers.Contract(
      addresses.paintSwapVerifier,
      verifierAbi,
      deployer
    );
    
    try {
      const vrfCoordinator = await verifier.vrfCoordinator();
      console.log("VRF Coordinator:", vrfCoordinator);
      
      if (vrfCoordinator === "0x0000000000000000000000000000000000000000") {
        console.log("❌ VRF Coordinator not set - verifier will revert if randomness is requested");
      } else {
        console.log("✅ VRF Coordinator is set");
      }
    } catch (error) {
      console.log("❌ Error getting VRF Coordinator:", error.message);
    }
    
    try {
      const verifierOwner = await verifier.owner();
      console.log("Verifier Owner:", verifierOwner);
    } catch (error) {
      console.log("❌ Error getting verifier owner:", error.message);
    }
    
    // Verify Lottery
    console.log("\n🔍 Checking RedDragonSwapLottery...");
    
    if (!addresses.lottery) {
      console.error("❌ Lottery address not found in deployment addresses!");
      return;
    }
    
    const lotteryAbi = [
      "function verifier() view returns (address)",
      "function wrappedSonic() view returns (address)",
      "function owner() view returns (address)",
      "function getCurrentJackpot() view returns (uint256)"
    ];
    
    const lottery = new hre.ethers.Contract(
      addresses.lottery,
      lotteryAbi,
      deployer
    );
    
    try {
      const lotteryVerifier = await lottery.verifier();
      console.log("Lottery's Verifier:", lotteryVerifier);
      
      if (lotteryVerifier.toLowerCase() === addresses.paintSwapVerifier.toLowerCase()) {
        console.log("✅ Lottery is configured to use the PaintSwap Verifier");
      } else {
        console.log("❌ Lottery is NOT using the correct PaintSwap Verifier!");
        console.log("   Expected:", addresses.paintSwapVerifier);
        console.log("   Actual:", lotteryVerifier);
      }
    } catch (error) {
      console.log("❌ Error getting lottery verifier:", error.message);
    }
    
    try {
      const lotteryToken = await lottery.wrappedSonic();
      console.log("Lottery Token (wrappedSonic):", lotteryToken);
    } catch (error) {
      console.log("❌ Error getting lottery token:", error.message);
    }
    
    try {
      const lotteryOwner = await lottery.owner();
      console.log("Lottery Owner:", lotteryOwner);
    } catch (error) {
      console.log("❌ Error getting lottery owner:", error.message);
    }
    
    try {
      const jackpot = await lottery.getCurrentJackpot();
      console.log("Current Jackpot:", hre.ethers.formatUnits(jackpot, 18), "wS");
    } catch (error) {
      console.log("❌ Error getting jackpot amount:", error.message);
    }
    
    // Check RedDragon token integration
    console.log("\n🔍 Checking RedDragon token integration...");
    
    if (!addresses.redDragon) {
      console.error("❌ RedDragon token address not found in deployment addresses!");
      return;
    }
    
    const tokenAbi = [
      "function lotteryContractAddress() view returns (address)",
      "function exchangePair() view returns (address)"
    ];
    
    const redDragonToken = new hre.ethers.Contract(
      addresses.redDragon,
      tokenAbi,
      deployer
    );
    
    try {
      const tokenLottery = await redDragonToken.lotteryContractAddress();
      console.log("Token's Lottery:", tokenLottery);
      
      if (tokenLottery.toLowerCase() === addresses.lottery.toLowerCase()) {
        console.log("✅ Token is configured to use the correct Lottery");
      } else {
        console.log("❌ Token is NOT using the correct Lottery!");
        console.log("   Expected:", addresses.lottery);
        console.log("   Actual:", tokenLottery);
      }
    } catch (error) {
      console.log("❌ Error getting token's lottery address:", error.message);
    }
    
    try {
      const exchangePair = await redDragonToken.exchangePair();
      console.log("Exchange Pair:", exchangePair);
    } catch (error) {
      console.log("❌ Error getting exchange pair:", error.message);
    }
    
    console.log("\n✅ Verification complete!");
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