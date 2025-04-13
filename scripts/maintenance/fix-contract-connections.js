const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Fix contract connections:
 * 1. Set the lottery address in the RedDragon token
 * 2. Set the exchange pair address
 */
async function main() {
  console.log("🔧 Fixing contract connections...");

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
    if (!addresses.redDragon) {
      console.error("❌ RedDragon token address not found!");
      return;
    }
    
    if (!addresses.lottery) {
      console.error("❌ Lottery address not found!");
      return;
    }

    // Create token instance
    const tokenAbi = [
      "function setLotteryAddress(address _lotteryAddress) external",
      "function setExchangePair(address _exchangePair) external",
      "function lotteryAddress() view returns (address)",
      "function exchangePair() view returns (address)"
    ];
    
    const redDragonToken = new hre.ethers.Contract(
      addresses.redDragon,
      tokenAbi,
      deployer
    );

    // 1. Set lottery address in token contract
    console.log("\n🔄 Setting lottery address in token contract...");
    console.log("Token:", addresses.redDragon);
    console.log("Lottery:", addresses.lottery);
    
    try {
      const currentLottery = await redDragonToken.lotteryAddress();
      console.log("Current lottery address:", currentLottery);
      
      if (currentLottery.toLowerCase() === addresses.lottery.toLowerCase()) {
        console.log("✅ Lottery address is already set correctly");
      } else {
        console.log("⚙️ Setting lottery address...");
        const tx = await redDragonToken.setLotteryAddress(addresses.lottery);
        console.log("⏳ Transaction sent:", tx.hash);
        await tx.wait();
        console.log("✅ Lottery address set successfully!");
      }
    } catch (error) {
      console.log("⚙️ Setting lottery address...");
      const tx = await redDragonToken.setLotteryAddress(addresses.lottery);
      console.log("⏳ Transaction sent:", tx.hash);
      await tx.wait();
      console.log("✅ Lottery address set successfully!");
    }
    
    // 2. Set exchange pair if needed
    if (!addresses.lpToken) {
      console.log("⚠️ LP Token address not found, skipping exchange pair setup");
    } else {
      console.log("\n🔄 Setting exchange pair in token contract...");
      console.log("LP Token:", addresses.lpToken);
      
      try {
        const currentPair = await redDragonToken.exchangePair();
        console.log("Current exchange pair:", currentPair);
        
        if (currentPair.toLowerCase() === addresses.lpToken.toLowerCase()) {
          console.log("✅ Exchange pair is already set correctly");
        } else {
          console.log("⚙️ Setting exchange pair...");
          const tx = await redDragonToken.setExchangePair(addresses.lpToken);
          console.log("⏳ Transaction sent:", tx.hash);
          await tx.wait();
          console.log("✅ Exchange pair set successfully!");
        }
      } catch (error) {
        console.log("⚙️ Setting exchange pair...");
        const tx = await redDragonToken.setExchangePair(addresses.lpToken);
        console.log("⏳ Transaction sent:", tx.hash);
        await tx.wait();
        console.log("✅ Exchange pair set successfully!");
      }
    }

    console.log("\n🎉 Contract connections fixed successfully!");
  } catch (error) {
    console.error("❌ Failed to fix contract connections:", error);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 