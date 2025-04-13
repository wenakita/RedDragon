const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Set up exchange pair and enable trading for the new RedDragon token
 */
async function main() {
  console.log("🔄 Setting up trading for new RedDragon token...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("\n👤 Using account:", deployer.address);
    
    // Load deployment addresses
    const deploymentFile = "deployment-addresses-sonic-new.json";
    let addresses = {};
    
    try {
      if (fs.existsSync(deploymentFile)) {
        addresses = JSON.parse(fs.readFileSync(deploymentFile));
        console.log("📝 Loaded deployment addresses");
      } else {
        console.error("❌ No deployment addresses file found");
        console.log("👉 Please run complete-reddragon-redeployment.js first");
        return;
      }
    } catch (error) {
      console.error("❌ Error loading deployment addresses:", error);
      return;
    }
    
    // Check for required addresses
    if (!addresses.redDragon) {
      console.error("❌ RedDragon token address not found in deployment file");
      return;
    }
    
    if (!addresses.router) {
      console.error("❌ Router address not found in deployment file");
      return;
    }
    
    if (!addresses.wrappedSonic) {
      console.error("❌ WrappedSonic address not found in deployment file");
      return;
    }
    
    console.log("\n📋 Contract addresses:");
    console.log(`- RedDragon: ${addresses.redDragon}`);
    console.log(`- Router: ${addresses.router}`);
    console.log(`- WrappedSonic: ${addresses.wrappedSonic}`);
    
    // Connect to contracts
    const redDragon = await hre.ethers.getContractAt("RedDragon", addresses.redDragon);
    const router = await hre.ethers.getContractAt("IRouter", addresses.router);
    const wrappedSonic = await hre.ethers.getContractAt("IERC20", addresses.wrappedSonic);
    
    // Get factory address
    const factoryAddress = await router.factory();
    console.log(`- Factory: ${factoryAddress}`);
    const factory = await hre.ethers.getContractAt("IFactory", factoryAddress);
    
    // Check if pair already exists
    console.log("\n🔍 Checking if pair already exists...");
    let pairAddress;
    try {
      pairAddress = await factory.getPair(addresses.redDragon, addresses.wrappedSonic);
      console.log(`- Pair address: ${pairAddress}`);
      
      if (pairAddress !== "0x0000000000000000000000000000000000000000") {
        console.log("✅ Exchange pair already exists");
      }
    } catch (error) {
      console.error(`❌ Error checking pair: ${error.message}`);
    }
    
    // If no pair exists or address is zero, create pair
    if (!pairAddress || pairAddress === "0x0000000000000000000000000000000000000000") {
      console.log("\n📦 Creating exchange pair...");
      
      // Get token balances
      const redDragonBalance = await redDragon.balanceOf(deployer.address);
      const wrappedSonicBalance = await wrappedSonic.balanceOf(deployer.address);
      
      console.log(`- RedDragon balance: ${hre.ethers.utils.formatEther(redDragonBalance)}`);
      console.log(`- WrappedSonic balance: ${hre.ethers.utils.formatEther(wrappedSonicBalance)}`);
      
      // Calculate initial liquidity amounts
      const initialRedDragonLiquidity = process.env.INITIAL_REDDRAGON_LIQUIDITY 
        ? hre.ethers.utils.parseEther(process.env.INITIAL_REDDRAGON_LIQUIDITY)
        : hre.ethers.utils.parseEther("1000000"); // Default: 1M tokens
        
      const initialWrappedSonicLiquidity = process.env.INITIAL_WSONIC_LIQUIDITY
        ? hre.ethers.utils.parseEther(process.env.INITIAL_WSONIC_LIQUIDITY)
        : hre.ethers.utils.parseEther("10000"); // Default: 10K wS
      
      console.log(`- Adding initial liquidity: ${hre.ethers.utils.formatEther(initialRedDragonLiquidity)} RedDragon + ${hre.ethers.utils.formatEther(initialWrappedSonicLiquidity)} wS`);
      
      // Check if we have enough tokens
      if (redDragonBalance.lt(initialRedDragonLiquidity)) {
        console.error(`❌ Not enough RedDragon tokens. Have: ${hre.ethers.utils.formatEther(redDragonBalance)}, Need: ${hre.ethers.utils.formatEther(initialRedDragonLiquidity)}`);
        return;
      }
      
      if (wrappedSonicBalance.lt(initialWrappedSonicLiquidity)) {
        console.error(`❌ Not enough wS tokens. Have: ${hre.ethers.utils.formatEther(wrappedSonicBalance)}, Need: ${hre.ethers.utils.formatEther(initialWrappedSonicLiquidity)}`);
        return;
      }
      
      // Approve tokens for router
      console.log("- Approving RedDragon tokens for router...");
      let approveTx = await redDragon.approve(addresses.router, initialRedDragonLiquidity);
      await approveTx.wait();
      console.log("✅ RedDragon approval confirmed");
      
      console.log("- Approving wS tokens for router...");
      approveTx = await wrappedSonic.approve(addresses.router, initialWrappedSonicLiquidity);
      await approveTx.wait();
      console.log("✅ wS approval confirmed");
      
      // Add liquidity
      console.log("- Adding liquidity...");
      const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes from now
      
      const addLiquidityTx = await router.addLiquidity(
        addresses.redDragon,
        addresses.wrappedSonic,
        initialRedDragonLiquidity,
        initialWrappedSonicLiquidity,
        0, // Accept any amount of RedDragon
        0, // Accept any amount of wS
        deployer.address,
        deadline
      );
      
      await addLiquidityTx.wait();
      console.log("✅ Liquidity added successfully");
      
      // Get pair address
      pairAddress = await factory.getPair(addresses.redDragon, addresses.wrappedSonic);
      console.log(`- New pair address: ${pairAddress}`);
    }
    
    // Set exchange pair in token
    console.log("\n🔧 Setting exchange pair in RedDragon token...");
    const currentExchangePair = await redDragon.exchangePair();
    
    if (currentExchangePair.toLowerCase() === pairAddress.toLowerCase()) {
      console.log("✅ Exchange pair already set in token");
    } else {
      const setExchangePairTx = await redDragon.setExchangePair(pairAddress);
      await setExchangePairTx.wait();
      console.log("✅ Exchange pair set in token");
    }
    
    // Check if trading is enabled
    console.log("\n🔍 Checking if trading is enabled...");
    const tradingEnabled = await redDragon.tradingEnabled();
    
    if (tradingEnabled) {
      console.log("✅ Trading is already enabled");
    } else {
      console.log("- Enabling trading...");
      const enableTradingTx = await redDragon.enableTrading();
      await enableTradingTx.wait();
      console.log("✅ Trading enabled successfully");
    }
    
    // Update deployment addresses file with pair address
    addresses.exchangePair = pairAddress;
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    console.log(`\n📝 Updated deployment addresses with exchange pair: ${deploymentFile}`);
    
    console.log("\n🎉 Trading setup completed successfully!");
    
    console.log("\n⚠️ Important Next Steps:");
    console.log("1. Announce the new token to your community");
    console.log("2. Monitor the jackpot vault to ensure fees are forwarded properly");
    console.log("3. Test trading functionality with small amounts");
    
  } catch (error) {
    console.error("❌ Trading setup failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Script error:", error);
    process.exit(1);
  }); 