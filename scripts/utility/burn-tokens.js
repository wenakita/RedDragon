// SCRIPT: burn-tokens.js
// PURPOSE: Burn DRAGON tokens from your wallet to prevent confusion
// USAGE: 
//   - To burn all tokens: node scripts/utility/burn-tokens.js
//   - To burn specific amount: node scripts/utility/burn-tokens.js --amount 1000

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
  "function name() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

async function main() {
  console.log("🔥 DRAGON Token Burn Utility");
  console.log("============================");

  // Parse command line arguments
  let amount = null;
  const args = process.argv.slice(2);
  const amountIndex = args.indexOf('--amount');
  if (amountIndex >= 0 && amountIndex < args.length - 1) {
    amount = args[amountIndex + 1];
  }

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
    console.log(`📝 Using account: ${wallet.address}`);
    
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

    // Define the burn address
    const BURN_ADDRESS = "0x000000000000000000000000000000000000dEaD";
    
    // Connect to the RedDragon token contract
    console.log(`🔗 Connecting to DRAGON token at ${addresses.redDragon}`);
    const dragonToken = new ethers.Contract(addresses.redDragon, ERC20_ABI, wallet);
    
    // Get token details
    const tokenSymbol = await dragonToken.symbol();
    const tokenDecimals = await dragonToken.decimals();
    
    // Get your token balance
    const balance = await dragonToken.balanceOf(wallet.address);
    const formattedBalance = ethers.formatUnits(balance, tokenDecimals);
    console.log(`💰 Your current ${tokenSymbol} balance: ${formattedBalance}`);
    
    // Check if there are tokens to burn
    if (balance.isZero()) {
      console.log("✅ You don't have any DRAGON tokens to burn.");
      return;
    }
    
    // Determine how many tokens to burn
    let burnAmount;
    if (amount) {
      // Convert input amount to wei
      burnAmount = ethers.parseUnits(amount, tokenDecimals);
      
      // Check if the burn amount is valid
      if (burnAmount.isZero()) {
        console.error("❌ Invalid amount specified. Must be greater than 0.");
        process.exit(1);
      }
      
      if (burnAmount > balance) {
        console.log(`⚠️ The amount you specified (${amount}) is greater than your balance (${formattedBalance}).`);
        console.log(`⚠️ Setting the burn amount to your full balance instead.`);
        burnAmount = balance;
      }
    } else {
      // If no amount specified, burn all tokens
      burnAmount = balance;
    }
    
    const formattedBurnAmount = ethers.formatUnits(burnAmount, tokenDecimals);
    
    // Ask for confirmation
    console.log(`⚠️ You're about to burn ${formattedBurnAmount} ${tokenSymbol} tokens by sending them to ${BURN_ADDRESS}`);
    console.log("⚠️ Press Ctrl+C to cancel if this is not what you want to do.\n");
    
    // Wait for 5 seconds to allow cancellation
    console.log("⏳ Waiting 5 seconds before proceeding...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Transfer tokens to the burn address
    console.log(`🔥 Burning ${formattedBurnAmount} ${tokenSymbol} tokens...`);
    const tx = await dragonToken.transfer(BURN_ADDRESS, burnAmount);
    
    // Wait for the transaction to be mined
    console.log(`⏳ Transaction submitted: ${tx.hash}`);
    console.log("⏳ Waiting for confirmation...");
    await tx.wait();
    
    // Verify the new balance
    const newBalance = await dragonToken.balanceOf(wallet.address);
    const formattedNewBalance = ethers.formatUnits(newBalance, tokenDecimals);
    console.log(`✅ Transaction confirmed! New balance: ${formattedNewBalance} ${tokenSymbol}`);
    
    if (burnAmount === balance) {
      console.log("🎉 All DRAGON tokens have been successfully burned!");
    } else {
      console.log(`🎉 ${formattedBurnAmount} ${tokenSymbol} tokens have been successfully burned!`);
    }
    
  } catch (error) {
    console.error("❌ Error burning tokens:");
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