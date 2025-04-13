const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Add funds to the RedDragonSwapLottery jackpot
 */
async function main() {
  // Check for amount argument
  const args = process.argv.slice(2);
  let amount = "100";
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--amount" && i + 1 < args.length) {
      amount = args[i + 1];
      break;
    }
  }
  
  console.log(`💰 Adding ${amount} wS tokens to the lottery jackpot...`);

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

    // Check if required addresses exist
    if (!addresses.lottery) {
      console.error("❌ Lottery address not found!");
      return;
    }
    
    if (!addresses.wrappedSonic) {
      console.error("❌ WrappedSonic token address not found!");
      return;
    }

    // Connect to wrapped Sonic token
    const tokenAbi = [
      "function allowance(address owner, address spender) view returns (uint256)",
      "function balanceOf(address account) view returns (uint256)",
      "function decimals() view returns (uint8)"
    ];
    
    const wrappedSonic = new hre.ethers.Contract(
      addresses.wrappedSonic,
      tokenAbi,
      deployer
    );

    // Check user's wS balance
    const balance = await wrappedSonic.balanceOf(deployer.address);
    const decimals = await wrappedSonic.decimals();
    console.log("💰 Your wS balance:", hre.ethers.formatUnits(balance, decimals), "wS");
    
    // Check current allowance
    const currentAllowance = await wrappedSonic.allowance(deployer.address, addresses.lottery);
    console.log("🔍 Current allowance:", hre.ethers.formatUnits(currentAllowance, decimals), "wS");
    
    // Connect to lottery
    const lotteryAbi = [
      "function getCurrentJackpot() view returns (uint256)",
      "function addToJackpot(uint256 amount) external",
      "function getStats() view returns (uint256 winners, uint256 payouts, uint256 current)"
    ];
    
    const lottery = new hre.ethers.Contract(
      addresses.lottery,
      lotteryAbi,
      deployer
    );
    
    // Check current jackpot
    const currentJackpot = await lottery.getCurrentJackpot();
    console.log("💰 Current jackpot:", hre.ethers.formatUnits(currentJackpot, decimals), "wS");
    
    // Parse amount to add
    const amountToAdd = hre.ethers.parseUnits(amount, decimals);
    
    // Verify user has enough balance and allowance
    if (balance < amountToAdd) {
      console.error("❌ Insufficient wS balance!");
      console.log(`You have ${hre.ethers.formatUnits(balance, decimals)} wS but are trying to add ${amount} wS`);
      return;
    }
    
    if (currentAllowance < amountToAdd) {
      console.error("❌ Insufficient allowance!");
      console.log(`You have approved ${hre.ethers.formatUnits(currentAllowance, decimals)} wS but are trying to add ${amount} wS`);
      console.log("\nRun the following command to increase your allowance:");
      console.log(`npx hardhat --network sonic run scripts/approve-jackpot.js --amount ${amount}`);
      return;
    }
    
    // Add to jackpot
    console.log(`⚙️ Adding ${amount} wS to the jackpot...`);
    const tx = await lottery.addToJackpot(amountToAdd);
    console.log("⏳ Transaction sent:", tx.hash);
    await tx.wait();
    console.log("✅ Successfully added to jackpot!");
    
    // Check updated jackpot
    const newJackpot = await lottery.getCurrentJackpot();
    console.log("💰 New jackpot amount:", hre.ethers.formatUnits(newJackpot, decimals), "wS");
    
    // Get lottery stats
    const stats = await lottery.getStats();
    console.log("\n📊 Updated lottery stats:");
    console.log(" - Total winners:", stats[0].toString());
    console.log(" - Total payouts:", hre.ethers.formatUnits(stats[1], decimals), "wS");
    console.log(" - Current jackpot:", hre.ethers.formatUnits(stats[2], decimals), "wS");

  } catch (error) {
    console.error("❌ Failed to add to jackpot:", error);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 