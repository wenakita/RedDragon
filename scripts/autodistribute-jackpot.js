require('dotenv').config();
const { ethers } = require("hardhat");

/**
 * Checks if the jackpot meets the minimum threshold and distributes it if needed
 * @param {object} options - Configuration options
 * @param {string} [options.lotteryAddress] - The lottery contract address (overrides env variable)
 * @param {string} [options.minAmount] - The minimum jackpot amount (overrides env variable)
 * @param {object} [options.signer] - The signer to use for the transaction (defaults to first signer)
 * @param {number} [options.chainId] - The chain ID to use (defaults to 146)
 * @returns {Promise<object>} - Result with success flag and transaction details if distribution happened
 */
async function checkAndDistributeJackpot(options = {}) {
  try {
    console.log("Checking jackpot amount for distribution eligibility...");
    
    // Load environment variables with option overrides
    const minJackpotAmount = options.minAmount || process.env.MIN_JACKPOT_AMOUNT || "100";
    const minAmount = ethers.utils.parseEther(minJackpotAmount);
    const chainId = options.chainId || 146; // Default to chain ID 146
    
    // Get the lottery contract
    const RedDragonSwapLottery = await ethers.getContractFactory("RedDragonSwapLottery");
    const lotteryAddress = options.lotteryAddress || process.env.LOTTERY_CONTRACT_ADDRESS;
    
    if (!lotteryAddress) {
      console.error("Lottery contract address not provided");
      return { success: false, error: "Missing lottery contract address" };
    }
    
    const lottery = await RedDragonSwapLottery.attach(lotteryAddress);
    
    // Get the current jackpot amount
    const currentJackpot = await lottery.getJackpotAmount();
    console.log(`Current jackpot amount: ${ethers.utils.formatEther(currentJackpot)} ETH`);
    console.log(`Minimum jackpot threshold: ${ethers.utils.formatEther(minAmount)} ETH`);
    console.log(`Using chain ID: ${chainId}`);
    
    // Check if jackpot meets the minimum amount
    if (currentJackpot.gte(minAmount)) {
      console.log("Jackpot exceeds minimum amount. Initiating distribution...");
      
      // Get the signer
      const signer = options.signer || (await ethers.getSigners())[0];
      console.log(`Using address for distribution: ${signer.address}`);
      
      // Call the claimJackpot function
      const tx = await lottery.connect(signer).claimJackpot();
      const receipt = await tx.wait();
      
      console.log(`Jackpot successfully claimed! Transaction hash: ${tx.hash}`);
      
      return { 
        success: true, 
        distributed: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        jackpotAmount: currentJackpot,
        chainId: chainId
      };
    } else {
      console.log("Jackpot amount does not meet minimum threshold. Skipping distribution.");
      return { 
        success: true, 
        distributed: false,
        currentJackpot,
        minRequired: minAmount,
        chainId: chainId
      };
    }
  } catch (error) {
    console.error("Error during jackpot distribution check:", error);
    return { 
      success: false, 
      error: error.message || "Unknown error",
      details: error
    };
  }
}

// Export the function to be used as a module
module.exports = {
  checkAndDistributeJackpot
};

// Allow running directly as a script
if (require.main === module) {
  checkAndDistributeJackpot({ chainId: 146 })
    .then(result => {
      console.log("Jackpot check result:", result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
} 