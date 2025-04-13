const hre = require("hardhat");
require("dotenv").config();

/**
 * Verify RedDragon token details
 */
async function main() {
  console.log("🔍 Verifying RedDragon token details...");
  
  const TOKEN_ADDRESS = "0x45237fD4F00FB2160005dB659D4dD5B36b77c265";

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);

    // Connect to RedDragon token
    const tokenAbi = [
      // Basic ERC20 functions
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)",
      "function totalSupply() view returns (uint256)",
      "function balanceOf(address) view returns (uint256)",
      
      // RedDragon specific functions
      "function getDetailedFeeInfo() view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256)",
      "function getContractConfiguration() view returns (address, address, address, address, address, address, address, bool, bool)",
      "function getFeeStats() view returns (uint256, uint256, uint256, uint256)",
      "function getCurrentTransactionLimit() view returns (uint256)",
      "function getCurrentWalletLimit() view returns (uint256)",
      "function getRemainingSpecialTransactions() view returns (uint256)",
      "function tradingEnabled() view returns (bool)",
      "function tradingEnabledPermanently() view returns (bool)",
      "function lotteryAddress() view returns (address)",
      "function exchangePair() view returns (address)",
      "function owner() view returns (address)"
    ];
    
    const token = new hre.ethers.Contract(
      TOKEN_ADDRESS,
      tokenAbi,
      deployer
    );

    // Check if the contract exists
    const code = await deployer.provider.getCode(TOKEN_ADDRESS);
    if (code === "0x") {
      console.error("❌ No contract exists at this address!");
      return;
    }
    console.log("✅ Valid contract at address", TOKEN_ADDRESS);
    console.log("Code size:", Math.floor((code.length - 2) / 2), "bytes");

    // Get basic token info
    console.log("\n📊 Token Information:");
    
    try {
      const name = await token.name();
      const symbol = await token.symbol();
      const decimals = await token.decimals();
      const totalSupply = await token.totalSupply();
      
      console.log("Name:", name);
      console.log("Symbol:", symbol);
      console.log("Decimals:", decimals);
      console.log("Total Supply:", hre.ethers.formatUnits(totalSupply, decimals));
    } catch (error) {
      console.log("❌ Error getting basic token info:", error.message);
    }

    // Get contract configuration
    console.log("\n⚙️ Contract Configuration:");
    
    try {
      const config = await token.getContractConfiguration();
      
      console.log("Jackpot Address:", config[0]);
      console.log("Liquidity Address:", config[1]);
      console.log("Burn Address:", config[2]);
      console.log("Development Address:", config[3]);
      console.log("Wrapped Sonic Address:", config[4]);
      console.log("Lottery Address:", config[5]);
      console.log("Exchange Pair:", config[6]);
      console.log("Trading Enabled:", config[7]);
      console.log("Ownership Locked:", config[8]);
    } catch (error) {
      console.log("❌ Error getting contract configuration:", error.message);
    }

    // Get fee information
    console.log("\n💰 Fee Information:");
    
    try {
      const feeInfo = await token.getDetailedFeeInfo();
      
      console.log("Buy fees:");
      console.log("- Liquidity:", feeInfo[0].toString(), "basis points");
      console.log("- Jackpot:", feeInfo[1].toString(), "basis points");
      console.log("- Burn:", feeInfo[2].toString(), "basis points");
      console.log("- Development:", feeInfo[3].toString(), "basis points");
      console.log("- Total Buy Fee:", feeInfo[4].toString(), "basis points");
      
      console.log("\nSell fees:");
      console.log("- Liquidity:", feeInfo[5].toString(), "basis points");
      console.log("- Jackpot:", feeInfo[6].toString(), "basis points");
      console.log("- Burn:", feeInfo[7].toString(), "basis points");
      console.log("- Development:", feeInfo[8].toString(), "basis points");
      console.log("- Total Sell Fee:", feeInfo[9].toString(), "basis points");
    } catch (error) {
      console.log("❌ Error getting fee information:", error.message);
    }

    // Get fee statistics
    console.log("\n📈 Fee Statistics:");
    
    try {
      const feeStats = await token.getFeeStats();
      
      console.log("Total Burned:", hre.ethers.formatUnits(feeStats[0], 18));
      console.log("Total Jackpot Fees:", hre.ethers.formatUnits(feeStats[1], 18));
      console.log("Total Liquidity Fees:", hre.ethers.formatUnits(feeStats[2], 18));
      console.log("Total Development Fees:", hre.ethers.formatUnits(feeStats[3], 18));
    } catch (error) {
      console.log("❌ Error getting fee statistics:", error.message);
    }

    // Get transaction and wallet limits
    console.log("\n🔒 Transaction & Wallet Limits:");
    
    try {
      const txLimit = await token.getCurrentTransactionLimit();
      const walletLimit = await token.getCurrentWalletLimit();
      const remainingSpecialTx = await token.getRemainingSpecialTransactions();
      
      console.log("Current Transaction Limit:", hre.ethers.formatUnits(txLimit, 18));
      console.log("Current Wallet Limit:", hre.ethers.formatUnits(walletLimit, 18));
      console.log("Remaining Special Transactions:", remainingSpecialTx.toString());
    } catch (error) {
      console.log("❌ Error getting limits:", error.message);
    }

    // Get trading status
    console.log("\n🚀 Trading Status:");
    
    try {
      const tradingEnabled = await token.tradingEnabled();
      const tradingEnabledPermanently = await token.tradingEnabledPermanently();
      
      console.log("Trading Enabled:", tradingEnabled);
      console.log("Trading Enabled Permanently:", tradingEnabledPermanently);
    } catch (error) {
      console.log("❌ Error getting trading status:", error.message);
    }

    // Get connected addresses
    console.log("\n🔗 Connected Addresses:");
    
    try {
      const lotteryAddress = await token.lotteryAddress();
      const exchangePair = await token.exchangePair();
      const owner = await token.owner();
      
      console.log("Lottery Address:", lotteryAddress);
      console.log("Exchange Pair:", exchangePair);
      console.log("Owner:", owner);
    } catch (error) {
      console.log("❌ Error getting connected addresses:", error.message);
    }

    console.log("\n✅ RedDragon token verification complete!");
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