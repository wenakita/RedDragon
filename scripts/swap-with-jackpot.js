require('dotenv').config();
const { ethers } = require("hardhat");
const { checkAndDistributeJackpot } = require('./autodistribute-jackpot');

/**
 * Performs a swap and checks whether to distribute the jackpot
 * This is a demonstration of how to integrate jackpot distribution with swaps
 */
async function performSwapWithJackpotCheck() {
  try {
    console.log("Processing swap with jackpot distribution check...");
    console.log("Using chain ID: 146");
    
    // Get signers
    const [deployer, user] = await ethers.getSigners();
    console.log(`Using admin address: ${deployer.address}`);
    console.log(`User address: ${user.address}`);
    
    // Get contract instances
    const lotteryAddress = process.env.LOTTERY_CONTRACT_ADDRESS;
    const redDragonAddress = process.env.REDDRAGON_ADDRESS;
    
    if (!lotteryAddress || !redDragonAddress) {
      console.error("Required contract addresses not set in environment variables");
      return;
    }
    
    const RedDragonSwapLottery = await ethers.getContractFactory("RedDragonSwapLottery");
    const RedDragon = await ethers.getContractFactory("RedDragon");
    
    const lottery = await RedDragonSwapLottery.attach(lotteryAddress);
    const redDragon = await RedDragon.attach(redDragonAddress);
    
    // Simulate a swap (this would normally be triggered by your swap function)
    console.log("Simulating a swap transaction...");
    
    // After the swap is completed, check and potentially distribute the jackpot
    // This would be integrated into your swap function or called immediately after
    console.log("Checking if jackpot should be distributed after this swap...");
    
    const jackpotResult = await checkAndDistributeJackpot({
      lotteryAddress,
      signer: deployer, // Use the appropriate signer for your system
      chainId: 146 // Specify chain ID 146
    });
    
    if (jackpotResult.success) {
      if (jackpotResult.distributed) {
        console.log(`✅ Jackpot was distributed! Amount: ${ethers.utils.formatEther(jackpotResult.jackpotAmount)} ETH`);
        console.log(`Transaction: ${jackpotResult.txHash}`);
        console.log(`Chain ID: ${jackpotResult.chainId}`);
        
        // Here you would notify users, update UI, etc.
      } else {
        console.log(`ℹ️ Jackpot not distributed. Current amount: ${ethers.utils.formatEther(jackpotResult.currentJackpot)} ETH`);
        console.log(`Minimum required: ${ethers.utils.formatEther(jackpotResult.minRequired)} ETH`);
        console.log(`Chain ID: ${jackpotResult.chainId}`);
      }
    } else {
      console.error(`❌ Error checking jackpot: ${jackpotResult.error}`);
    }
    
    console.log("Swap with jackpot check completed");
    
  } catch (error) {
    console.error("Error during swap with jackpot check:", error);
    process.exit(1);
  }
}

// Execute the script
if (require.main === module) {
  performSwapWithJackpotCheck()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  performSwapWithJackpotCheck
}; 