const functions = require('@google-cloud/functions-framework');
const { ethers } = require('ethers');
const { Logging } = require('@google-cloud/logging');
require('dotenv').config();

// ABI for DragonShadowV3Swapper - only include the functions we need
const SWAPPER_ABI = [
  "function processSwapWithScratcher(address toToken, uint256 amountOutMin, address to, uint256[] memory path, uint256 deadline) external payable returns (uint256 amountOut)",
  "function processSwapWithPromotion(address toToken, uint256 amountOutMin, address to, uint256[] memory path, uint256 deadline, uint256 itemId) external payable returns (uint256 amountOut)"
];

// Setup logging
const logging = new Logging();
const log = logging.log('lottery-trigger-function');

// Contract addresses - update these with your actual deployed addresses
const SWAPPER_ADDRESS = process.env.SWAPPER_ADDRESS;
const DRAGON_TOKEN_ADDRESS = process.env.DRAGON_TOKEN_ADDRESS;
const WSONIC_ADDRESS = process.env.WSONIC_ADDRESS;

/**
 * Trigger the Dragon Lottery swap
 * This function is triggered on a schedule to process swaps that trigger the lottery
 */
functions.http('triggerLottery', async (req, res) => {
  try {
    // Log function start
    const metadata = {
      resource: {
        type: 'cloud_function',
        labels: {
          function_name: 'triggerLottery'
        }
      }
    };
    
    log.info(log.entry(metadata, 'Starting lottery trigger function'));
    
    // Initialize provider and wallet
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    // Initialize swapper contract
    const swapperContract = new ethers.Contract(
      SWAPPER_ADDRESS,
      SWAPPER_ABI,
      wallet
    );
    
    // Setup swap parameters
    const toToken = DRAGON_TOKEN_ADDRESS;
    const amountOutMin = 0; // or calculate this based on price oracle
    const to = wallet.address;
    const path = [WSONIC_ADDRESS, DRAGON_TOKEN_ADDRESS]; // Simple path from WSONIC to DRAGON
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    
    // Get current gas price and add 10% for safety
    const gasPrice = await provider.getGasPrice();
    const adjustedGasPrice = gasPrice.mul(110).div(100);
    
    // Check if we should use a promotion or scratcher
    const usePromotion = process.env.USE_PROMOTION === 'true';
    const itemId = process.env.PROMOTION_ITEM_ID || '0';
    
    let tx;
    if (usePromotion) {
      log.info(log.entry(metadata, `Triggering lottery with promotion item ${itemId}`));
      tx = await swapperContract.processSwapWithPromotion(
        toToken,
        amountOutMin,
        to,
        path,
        deadline,
        itemId,
        { 
          value: ethers.utils.parseEther(process.env.SWAP_AMOUNT || '0.1'),
          gasPrice: adjustedGasPrice
        }
      );
    } else {
      log.info(log.entry(metadata, 'Triggering lottery with scratcher'));
      tx = await swapperContract.processSwapWithScratcher(
        toToken,
        amountOutMin,
        to,
        path,
        deadline,
        { 
          value: ethers.utils.parseEther(process.env.SWAP_AMOUNT || '0.1'),
          gasPrice: adjustedGasPrice
        }
      );
    }
    
    log.info(log.entry(metadata, `Transaction sent: ${tx.hash}`));
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    log.info(log.entry(metadata, `Transaction confirmed in block ${receipt.blockNumber}`));
    
    res.status(200).send({
      success: true,
      message: 'Lottery trigger transaction successful',
      txHash: tx.hash,
      blockNumber: receipt.blockNumber
    });
  } catch (error) {
    console.error('Error triggering lottery:', error);
    log.error(log.entry({}, `Error triggering lottery: ${error.message}`));
    
    res.status(500).send({
      success: false,
      message: 'Failed to trigger lottery',
      error: error.message
    });
  }
}); 