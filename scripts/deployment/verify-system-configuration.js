const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Verify all system contracts and their configurations
 * This script checks that all contracts are properly connected and configured
 */
async function main() {
  console.log("🔍 Verifying complete ve(80/20) system configuration...");

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

    // Check RedDragon Token Configuration
    console.log("\n🔷 Checking RedDragon Token Configuration...");
    if (addresses.redDragon) {
      const redDragon = await hre.ethers.getContractAt("RedDragon", addresses.redDragon);
      
      // Get configuration
      const config = await redDragon.getContractConfiguration();
      console.log("Jackpot Address:", config[5]); // This should be the fee manager
      
      // Verify lottery address is set to fee manager
      if (config[5].toLowerCase() === addresses.feeManager.toLowerCase()) {
        console.log("✅ Token is using fee manager as lottery address");
      } else {
        console.log("❌ Token lottery address mismatch:");
        console.log("  Expected:", addresses.feeManager);
        console.log("  Actual:", config[5]);
      }

      // Get fee info
      const feeInfo = await redDragon.getDetailedFeeInfo();
      console.log("Buy Fees - Jackpot: ", feeInfo[1].toString());
      console.log("Sell Fees - Jackpot: ", feeInfo[6].toString());
    } else {
      console.log("❌ No RedDragon address found");
    }

    // Check Fee Manager Configuration
    console.log("\n🔷 Checking Fee Manager Configuration...");
    if (addresses.feeManager) {
      const feeManager = await hre.ethers.getContractAt("RedDragonFeeManager", addresses.feeManager);
      
      // Get lottery address
      const lotteryAddress = await feeManager.lottery();
      console.log("Lottery Address:", lotteryAddress);
      
      // Verify lottery address
      if (lotteryAddress.toLowerCase() === addresses.lottery.toLowerCase()) {
        console.log("✅ Fee Manager is using correct lottery address");
      } else {
        console.log("❌ Fee Manager lottery address mismatch:");
        console.log("  Expected:", addresses.lottery);
        console.log("  Actual:", lotteryAddress);
      }

      // Get fee distributor address
      const veDistributorAddress = await feeManager.veDistributor();
      console.log("Ve Distributor Address:", veDistributorAddress);
      
      // Verify fee distributor address
      if (veDistributorAddress.toLowerCase() === addresses.ve8020FeeDistributor.toLowerCase()) {
        console.log("✅ Fee Manager is using correct fee distributor address");
      } else {
        console.log("❌ Fee Manager fee distributor address mismatch:");
        console.log("  Expected:", addresses.ve8020FeeDistributor);
        console.log("  Actual:", veDistributorAddress);
      }
    } else {
      console.log("❌ No Fee Manager address found");
    }

    // Check Lottery Configuration
    console.log("\n🔷 Checking Lottery Configuration...");
    if (addresses.lottery) {
      const lottery = await hre.ethers.getContractAt("RedDragonSwapLottery", addresses.lottery);
      
      // Verify verifier address
      const verifierAddress = await lottery.verifier();
      console.log("Verifier Address:", verifierAddress);
      
      if (verifierAddress.toLowerCase() === addresses.paintSwapVerifier.toLowerCase()) {
        console.log("✅ Lottery is using correct PaintSwap Verifier address");
      } else {
        console.log("❌ Lottery verifier address mismatch:");
        console.log("  Expected:", addresses.paintSwapVerifier);
        console.log("  Actual:", verifierAddress);
      }

      // Verify token contract address
      const tokenContract = await lottery.tokenContract();
      console.log("Token Contract:", tokenContract);
      
      if (tokenContract.toLowerCase() === addresses.redDragon.toLowerCase()) {
        console.log("✅ Lottery is using correct token contract address");
      } else {
        console.log("❌ Lottery token contract address mismatch:");
        console.log("  Expected:", addresses.redDragon);
        console.log("  Actual:", tokenContract);
      }

      // Verify LP token address
      const lpToken = await lottery.lpToken();
      console.log("LP Token Address:", lpToken);
      
      if (lpToken.toLowerCase() === addresses.lpToken.toLowerCase()) {
        console.log("✅ Lottery is using correct LP token address");
      } else {
        console.log("❌ Lottery LP token address mismatch:");
        console.log("  Expected:", addresses.lpToken);
        console.log("  Actual:", lpToken);
      }

      // Verify voting token address
      const votingToken = await lottery.votingToken();
      console.log("Voting Token Address:", votingToken);
      
      if (votingToken.toLowerCase() === addresses.ve8020.toLowerCase()) {
        console.log("✅ Lottery is using correct voting token address");
      } else {
        console.log("❌ Lottery voting token address mismatch:");
        console.log("  Expected:", addresses.ve8020);
        console.log("  Actual:", votingToken);
      }

      // Get current jackpot
      const jackpot = await lottery.jackpot();
      console.log("Current Jackpot:", hre.ethers.formatUnits(jackpot, 18), "wS");
    } else {
      console.log("❌ No Lottery address found");
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
    } else {
      console.log("❌ No PaintSwap Verifier address found");
    }

    // Check ve8020 Configuration
    console.log("\n🔷 Checking ve8020 Configuration...");
    if (addresses.ve8020) {
      const ve8020 = await hre.ethers.getContractAt("ve8020", addresses.ve8020);
      
      // Get LP token address
      const lpToken = await ve8020.lpToken();
      console.log("LP Token Address:", lpToken);
      
      if (lpToken.toLowerCase() === addresses.lpToken.toLowerCase()) {
        console.log("✅ ve8020 is using correct LP token address");
      } else {
        console.log("❌ ve8020 LP token address mismatch:");
        console.log("  Expected:", addresses.lpToken);
        console.log("  Actual:", lpToken);
      }

      // Try to get lock durations using simple variable access instead of function calls
      try {
        const minLockTime = await ve8020.MIN_LOCK_TIME();
        const maxLockTime = await ve8020.MAX_LOCK_TIME();
        console.log("Min Lock Time:", minLockTime.toString() / (24*60*60), "days");
        console.log("Max Lock Time:", maxLockTime.toString() / (24*60*60), "days");
      } catch (error) {
        console.log("ℹ️ Could not access lock time constants directly - this is normal for some contract implementations");
      }
    } else {
      console.log("❌ No ve8020 address found");
    }

    // Check Ve8020FeeDistributor Configuration
    console.log("\n🔷 Checking Ve8020FeeDistributor Configuration...");
    if (addresses.ve8020FeeDistributor) {
      const feeDistributor = await hre.ethers.getContractAt("Ve8020FeeDistributor", addresses.ve8020FeeDistributor);
      
      // Get ve8020 address
      const veTokenAddress = await feeDistributor.veToken();
      console.log("ve8020 Address:", veTokenAddress);
      
      if (veTokenAddress.toLowerCase() === addresses.ve8020.toLowerCase()) {
        console.log("✅ Fee Distributor is using correct ve8020 address");
      } else {
        console.log("❌ Fee Distributor ve8020 address mismatch:");
        console.log("  Expected:", addresses.ve8020);
        console.log("  Actual:", veTokenAddress);
      }

      // Get reward token address
      const rewardToken = await feeDistributor.rewardToken();
      console.log("Reward Token Address:", rewardToken);
      
      if (rewardToken.toLowerCase() === addresses.redDragon.toLowerCase()) {
        console.log("✅ Fee Distributor is using correct reward token address");
      } else {
        console.log("❌ Fee Distributor reward token address mismatch:");
        console.log("  Expected:", addresses.redDragon);
        console.log("  Actual:", rewardToken);
      }
    } else {
      console.log("❌ No Ve8020FeeDistributor address found");
    }

    console.log("\n🎉 System verification complete!");
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