const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Set up exchange pair and enable trading for the RedDragon token
 */
async function main() {
  console.log("🚀 Setting up exchange pair for RedDragon token...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("\n👤 Using account:", deployer.address);
    const deployerBalance = await deployer.getBalance();
    console.log(`💰 Account balance: ${hre.ethers.utils.formatEther(deployerBalance)} coins`);
    
    // Load deployment addresses
    const deploymentFile = "deployment-addresses-sonic-new.json";
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
    
    // Check for required addresses
    const requiredAddresses = ['redDragon', 'wrappedSonic', 'router', 'factory'];
    for (const addr of requiredAddresses) {
      if (!addresses[addr]) {
        console.error(`❌ Missing required address: ${addr}`);
        return;
      }
    }
    
    // Connect to contracts
    console.log("\n🔄 Connecting to contracts...");
    
    const redDragon = await hre.ethers.getContractAt("RedDragon", addresses.redDragon);
    console.log("- Connected to RedDragon token:", addresses.redDragon);
    
    const wrappedSonic = await hre.ethers.getContractAt("IERC20", addresses.wrappedSonic);
    console.log("- Connected to WrappedSonic token:", addresses.wrappedSonic);
    
    const router = await hre.ethers.getContractAt("IRouter", addresses.router);
    console.log("- Connected to Router:", addresses.router);
    
    // Get current exchange pair
    const factory = await hre.ethers.getContractAt("IFactory", addresses.factory);
    console.log("- Connected to Factory:", addresses.factory);
    
    // Step 1: Get or create pair
    console.log("\n📦 1. Getting or creating token pair...");
    
    // Check if pair already exists
    let pairAddress = await factory.getPair(addresses.redDragon, addresses.wrappedSonic);
    
    if (pairAddress === '0x0000000000000000000000000000000000000000') {
      console.log("- Pair doesn't exist yet, creating it...");
      // Create pair through the factory directly
      const createPairTx = await factory.createPair(addresses.redDragon, addresses.wrappedSonic);
      await createPairTx.wait();
      console.log("✅ Pair created");
      
      // Get the new pair address
      pairAddress = await factory.getPair(addresses.redDragon, addresses.wrappedSonic);
    } else {
      console.log("- Pair already exists");
    }
    
    console.log("✅ Pair address:", pairAddress);
    addresses.exchangePair = pairAddress;
    
    // Step 2: Set exchange pair in token
    console.log("\n📦 2. Setting exchange pair in token...");
    try {
      const setExchangePairTx = await redDragon.setExchangePair(pairAddress);
      await setExchangePairTx.wait();
      console.log("✅ Exchange pair set in token");
    } catch (error) {
      console.error("❌ Failed to set exchange pair:", error.message);
      console.log("- This may be due to ownership transfer to multisig. You'll need to call this function through the multisig.");
    }
    
    // Step 3: Add initial liquidity
    console.log("\n📦 3. Preparing for liquidity addition...");
    
    // Set liquidity amounts from .env or use defaults
    const initialRedDragonLiquidity = process.env.INITIAL_REDDRAGON_LIQUIDITY 
      ? hre.ethers.utils.parseEther(process.env.INITIAL_REDDRAGON_LIQUIDITY)  
      : hre.ethers.utils.parseEther("1000000");  // 1M tokens
      
    const initialWSonicLiquidity = process.env.INITIAL_WSONIC_LIQUIDITY 
      ? hre.ethers.utils.parseEther(process.env.INITIAL_WSONIC_LIQUIDITY)
      : hre.ethers.utils.parseEther("500");  // 500 wSONIC
    
    console.log(`- Initial RedDragon liquidity: ${hre.ethers.utils.formatEther(initialRedDragonLiquidity)} DRAGON`);
    console.log(`- Initial wSonic liquidity: ${hre.ethers.utils.formatEther(initialWSonicLiquidity)} wS`);
    
    // Check RedDragon balance
    const redDragonBalance = await redDragon.balanceOf(deployer.address);
    console.log(`- Your RedDragon balance: ${hre.ethers.utils.formatEther(redDragonBalance)} DRAGON`);
    
    // Check wSonic balance
    const wSonicBalance = await wrappedSonic.balanceOf(deployer.address);
    console.log(`- Your wSonic balance: ${hre.ethers.utils.formatEther(wSonicBalance)} wS`);
    
    if (redDragonBalance.lt(initialRedDragonLiquidity)) {
      console.error("❌ Insufficient RedDragon balance for liquidity");
      return;
    }
    
    if (wSonicBalance.lt(initialWSonicLiquidity)) {
      console.error("❌ Insufficient wSonic balance for liquidity");
      return;
    }
    
    // Step 4: Approve tokens for Router
    console.log("\n📦 4. Approving tokens for Router...");
    
    // Approve RedDragon tokens
    console.log("- Approving RedDragon tokens...");
    const approveRedDragonTx = await redDragon.approve(addresses.router, initialRedDragonLiquidity);
    await approveRedDragonTx.wait();
    console.log("✅ RedDragon tokens approved");
    
    // Approve wSonic tokens
    console.log("- Approving wSonic tokens...");
    const approveWSonicTx = await wrappedSonic.approve(addresses.router, initialWSonicLiquidity);
    await approveWSonicTx.wait();
    console.log("✅ wSonic tokens approved");
    
    // Step 5: Add liquidity
    console.log("\n📦 5. Adding liquidity...");
    
    // Add liquidity with router
    const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes
    
    try {
      const addLiquidityTx = await router.addLiquidity(
        addresses.redDragon,
        addresses.wrappedSonic,
        initialRedDragonLiquidity,
        initialWSonicLiquidity,
        0, // Accept any amount of RedDragon
        0, // Accept any amount of wSonic
        deployer.address, // LP tokens recipient
        deadline
      );
      
      await addLiquidityTx.wait();
      console.log("✅ Liquidity added successfully");
    } catch (error) {
      console.error("❌ Failed to add liquidity:", error.message);
      console.log("- You may need to add liquidity manually through the DEX interface");
    }
    
    // Step 6: Enable trading
    console.log("\n📦 6. Enabling trading...");
    
    try {
      const enableTradingTx = await redDragon.enableTrading();
      await enableTradingTx.wait();
      console.log("✅ Trading enabled");
    } catch (error) {
      console.error("❌ Failed to enable trading:", error.message);
      console.log("- This may be due to ownership transfer to multisig. You'll need to call this function through the multisig.");
    }
    
    // Save updated deployment addresses
    addresses.lpToken = pairAddress; // Save LP token address (same as pair address)
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    console.log(`\n📝 Deployment addresses updated and saved to ${deploymentFile}`);
    
    console.log("\n🎉 Exchange pair setup completed!");
    console.log("\n📝 Summary:");
    console.log("- RedDragon Token:", addresses.redDragon);
    console.log("- Exchange Pair:", addresses.exchangePair);
    
    console.log("\n⚠️ Important Next Steps:");
    if (addresses.multiSig) {
      console.log("1. If you've transferred ownership to the multisig, use the multisig to:");
      console.log("   - Set the exchange pair in the token");
      console.log("   - Enable trading");
    }
    console.log("2. Verify the exchange pair is working by testing swaps");
    console.log("3. Monitor the token and fees to ensure they're being collected correctly");
    
  } catch (error) {
    console.error("❌ Setup error:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Script error:", error);
    process.exit(1);
  }); 