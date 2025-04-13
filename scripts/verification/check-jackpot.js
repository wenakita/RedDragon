const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Check and fix the jackpot in the RedDragonSwapLottery contract
 */
async function main() {
  console.log("💰 Checking lottery jackpot...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);
    
    const deployerBalance = await deployer.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", hre.ethers.formatUnits(deployerBalance, 18), "SONIC");

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

    // Check if lottery address exists
    if (!addresses.lottery) {
      console.error("❌ Lottery address not found!");
      return;
    }

    // Connect to lottery
    const lotteryAbi = [
      "function getCurrentJackpot() view returns (uint256)",
      "function addToJackpot(uint256 amount) external",
      "function wrappedSonic() view returns (address)",
      "function getStats() view returns (uint256 winners, uint256 payouts, uint256 current)",
      "function tokenContract() view returns (address)"
    ];
    
    const lottery = new hre.ethers.Contract(
      addresses.lottery,
      lotteryAbi,
      deployer
    );

    // Check current jackpot
    try {
      const currentJackpot = await lottery.getCurrentJackpot();
      console.log("\n💰 Current jackpot:", hre.ethers.formatUnits(currentJackpot, 18), "wS");
      
      try {
        const stats = await lottery.getStats();
        console.log("📊 Lottery stats:");
        console.log(" - Total winners:", stats[0].toString());
        console.log(" - Total payouts:", hre.ethers.formatUnits(stats[1], 18), "wS");
        console.log(" - Current jackpot:", hre.ethers.formatUnits(stats[2], 18), "wS");
      } catch (error) {
        console.log("❌ Error getting lottery stats:", error.message);
      }
      
      // Check token contract setting
      try {
        const tokenContract = await lottery.tokenContract();
        console.log("\n📝 Token contract set in lottery:", tokenContract);
        
        if (tokenContract.toLowerCase() === addresses.redDragon.toLowerCase()) {
          console.log("✅ Token contract is set correctly");
        } else if (tokenContract === "0x0000000000000000000000000000000000000000") {
          console.log("⚠️ Token contract is not set");
        } else {
          console.log("⚠️ Token contract mismatch:");
          console.log(" - Expected:", addresses.redDragon);
          console.log(" - Actual:", tokenContract);
        }
      } catch (error) {
        console.log("❌ Error checking token contract:", error.message);
      }
      
      // Get wrapped Sonic token
      const wrappedSonicAddress = await lottery.wrappedSonic();
      console.log("📝 Wrapped Sonic token:", wrappedSonicAddress);
      
      // Ask if we want to add funds to the jackpot
      console.log("\n⚠️ To add funds to the jackpot, you need to:");
      console.log("1. Have wS tokens in your wallet");
      console.log("2. Approve the lottery contract to spend your wS tokens");
      console.log("3. Call the addToJackpot function with the amount to add");
      console.log("\nExample commands:");
      console.log(`npx hardhat --network sonic run scripts/approve-jackpot.js --amount 1000`);
      console.log(`npx hardhat --network sonic run scripts/add-to-jackpot.js --amount 1000`);
      
    } catch (error) {
      console.log("❌ Error getting current jackpot:", error.message);
      console.log("This could be because the jackpot variable isn't accessible or the contract doesn't have the expected interface.");
    }

  } catch (error) {
    console.error("❌ Script failed:", error);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 