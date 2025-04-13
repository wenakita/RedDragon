// SCRIPT: check-balance.js
// PURPOSE: Check your DRAGON token balance without burning anything
// USAGE: node scripts/utility/check-balance.js

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables
const envResult = dotenv.config();
if (envResult.error) {
  console.error("❌ Error loading .env file. Have you run setup-env.js?");
  console.error("   Run: node scripts/utility/setup-env.js");
  process.exit(1);
}

// ERC20 ABI for token balance checks
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)"
];

// ve8020 ABI - just the balanceOf function
const VE8020_ABI = [
  "function balanceOf(address owner) view returns (uint256)"
];

async function main() {
  console.log("💰 DRAGON Token Balance Checker");
  console.log("===============================");

  try {
    // Check if required env vars exist
    if (!process.env.SONIC_RPC_URL || !process.env.PRIVATE_KEY) {
      console.error("❌ Missing required environment variables.");
      console.error("   Make sure SONIC_RPC_URL and PRIVATE_KEY are set in your .env file.");
      console.error("   Run: node scripts/utility/setup-env.js to set them up.");
      process.exit(1);
    }
    
    // Connect to network using the RPC URL from the .env file
    const provider = new ethers.JsonRpcProvider(process.env.SONIC_RPC_URL);
    
    // Create a wallet using the private key from the .env file
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log(`📝 Account address: ${wallet.address}`);
    
    // Load the deployment addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    if (!fs.existsSync(deploymentFile)) {
      console.error(`❌ Deployment file ${deploymentFile} not found!`);
      process.exit(1);
    }

    const addresses = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    
    // Check if the RedDragon token address is available
    if (!addresses.redDragon) {
      console.error("❌ RedDragon token address not found in deployment file!");
      process.exit(1);
    }
    
    // Connect to the RedDragon token contract
    console.log(`🔗 Connecting to DRAGON token at ${addresses.redDragon}`);
    const dragonToken = new ethers.Contract(addresses.redDragon, ERC20_ABI, wallet);
    
    try {
      // Get token details
      const tokenName = await dragonToken.name();
      const tokenSymbol = await dragonToken.symbol();
      const tokenDecimals = await dragonToken.decimals();
      console.log(`ℹ️ Token details: ${tokenName} (${tokenSymbol}), ${tokenDecimals} decimals`);
      
      // Get your token balance
      const balance = await dragonToken.balanceOf(wallet.address);
      const formattedBalance = ethers.formatUnits(balance, tokenDecimals);
      console.log(`💰 Your current ${tokenSymbol} balance: ${formattedBalance}`);
    } catch (error) {
      console.log(`⚠️ Could not check DRAGON token balance: ${error.message}`);
    }
    
    // Check SONIC balance as well (if we can find the address)
    if (addresses.wrappedSonic) {
      console.log(`\n🔗 Checking WSONIC balance at ${addresses.wrappedSonic}`);
      const wsonicToken = new ethers.Contract(addresses.wrappedSonic, ERC20_ABI, wallet);
      
      try {
        const wsonicSymbol = await wsonicToken.symbol();
        const wsonicDecimals = await wsonicToken.decimals();
        const wsonicBalance = await wsonicToken.balanceOf(wallet.address);
        const formattedWSonicBalance = ethers.formatUnits(wsonicBalance, wsonicDecimals);
        console.log(`💰 Your current ${wsonicSymbol} balance: ${formattedWSonicBalance}`);
      } catch (error) {
        console.log(`⚠️ Could not check WSONIC balance: ${error.message}`);
      }
    }
    
    // Check LP token balance if available
    if (addresses.lpToken) {
      console.log(`\n🔗 Checking LP token balance at ${addresses.lpToken}`);
      const lpToken = new ethers.Contract(addresses.lpToken, ERC20_ABI, wallet);
      
      try {
        const lpSymbol = await lpToken.symbol();
        const lpDecimals = await lpToken.decimals();
        const lpBalance = await lpToken.balanceOf(wallet.address);
        const formattedLpBalance = ethers.formatUnits(lpBalance, lpDecimals);
        console.log(`💰 Your current ${lpSymbol} balance: ${formattedLpBalance}`);
      } catch (error) {
        console.log(`⚠️ Could not check LP token balance: ${error.message}`);
      }
    }
    
    // Check ve8020 token balance if available
    if (addresses.ve8020) {
      console.log(`\n🔗 Checking ve8020 token at ${addresses.ve8020}`);
      const ve8020 = new ethers.Contract(addresses.ve8020, VE8020_ABI, wallet);
      
      try {
        const veBalance = await ve8020.balanceOf(wallet.address);
        const formattedVeBalance = ethers.formatUnits(veBalance, 18); // ve8020 uses 18 decimals
        console.log(`💰 Your current ve8020 voting power: ${formattedVeBalance}`);
      } catch (error) {
        console.log(`⚠️ Could not check ve8020 balance: ${error.message}`);
      }
    }
    
    console.log("\n✅ Balance check complete!");
    
  } catch (error) {
    console.error("❌ Error checking balance:");
    console.error(error);
    process.exit(1);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 