const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
require('dotenv').config();

// Initialize Express
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Contract ABIs - Import these from your project
const DRAGON_ABI = [
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function tradingEnabled() view returns (bool)",
  "function jackpotBuyTax() view returns (uint256)",
  "function jackpotSellTax() view returns (uint256)",
  "function feeBuyTax() view returns (uint256)",
  "function feeSellTax() view returns (uint256)"
];

const JACKPOT_ABI = [
  "function getBalance() view returns (uint256)",
  "function getWinnerCount() view returns (uint256)",
  "function getWinnerAt(uint256) view returns (address)",
  "function getWinnerAmount(address) view returns (uint256)"
];

// Initialize variables
let provider;
let dragonContract;
let jackpotContract;
let contractAddresses = {};

// Initialize blockchain connection
async function initializeContracts() {
  try {
    // Get contract addresses from environment variables or Secret Manager
    const dragonAddress = process.env.CONTRACT_DRAGON;
    const jackpotAddress = process.env.CONTRACT_JACKPOT;
    
    if (!dragonAddress || !jackpotAddress) {
      console.error('Missing contract addresses in environment variables');
      return;
    }
    
    contractAddresses = {
      dragon: dragonAddress,
      jackpot: jackpotAddress
    };
    
    // Connect to Sonic blockchain
    provider = new ethers.providers.JsonRpcProvider('https://rpc.soniclabs.com');
    
    // Initialize contracts
    dragonContract = new ethers.Contract(contractAddresses.dragon, DRAGON_ABI, provider);
    jackpotContract = new ethers.Contract(contractAddresses.jackpot, JACKPOT_ABI, provider);
    
    console.log('Contracts initialized successfully');
  } catch (error) {
    console.error('Error initializing contracts:', error);
  }
}

// API routes
app.get('/', (req, res) => {
  res.json({
    message: 'Dragon API is running',
    status: 'ok',
    contractAddresses
  });
});

// Get Dragon info
app.get('/api/dragon/info', async (req, res) => {
  try {
    if (!dragonContract) {
      return res.status(503).json({ error: 'Contracts not initialized' });
    }
    
    const [totalSupply, tradingEnabled, jackpotBuyTax, jackpotSellTax, feeBuyTax, feeSellTax] = await Promise.all([
      dragonContract.totalSupply(),
      dragonContract.tradingEnabled(),
      dragonContract.jackpotBuyTax(),
      dragonContract.jackpotSellTax(),
      dragonContract.feeBuyTax(),
      dragonContract.feeSellTax()
    ]);
    
    res.json({
      totalSupply: ethers.utils.formatEther(totalSupply),
      tradingEnabled,
      taxes: {
        jackpotBuy: jackpotBuyTax.toString(),
        jackpotSell: jackpotSellTax.toString(),
        feeBuy: feeBuyTax.toString(),
        feeSell: feeSellTax.toString()
      }
    });
  } catch (error) {
    console.error('Error fetching Dragon info:', error);
    res.status(500).json({ error: 'Failed to fetch Dragon info' });
  }
});

// Get Jackpot info
app.get('/api/jackpot/info', async (req, res) => {
  try {
    if (!jackpotContract) {
      return res.status(503).json({ error: 'Contracts not initialized' });
    }
    
    const [balance, winnerCount] = await Promise.all([
      jackpotContract.getBalance(),
      jackpotContract.getWinnerCount()
    ]);
    
    res.json({
      balance: ethers.utils.formatEther(balance),
      winnerCount: winnerCount.toString()
    });
  } catch (error) {
    console.error('Error fetching Jackpot info:', error);
    res.status(500).json({ error: 'Failed to fetch Jackpot info' });
  }
});

// Get user balance
app.get('/api/user/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!dragonContract) {
      return res.status(503).json({ error: 'Contracts not initialized' });
    }
    
    // Validate address
    if (!ethers.utils.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }
    
    const balance = await dragonContract.balanceOf(address);
    
    res.json({
      address,
      dragonBalance: ethers.utils.formatEther(balance)
    });
  } catch (error) {
    console.error('Error fetching user info:', error);
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

// Start the server
app.listen(PORT, async () => {
  console.log(`Dragon API running on port ${PORT}`);
  await initializeContracts();
});

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
}); 