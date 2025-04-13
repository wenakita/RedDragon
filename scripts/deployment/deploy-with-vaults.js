const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Deploy RedDragon with dedicated vaults
 * This script deploys RedDragon with proper vault architecture
 */
async function main() {
  console.log("🚀 Deploying RedDragon with dedicated vaults...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("\n👤 Deploying with account:", deployer.address);
    const deployerBalance = await deployer.getBalance();
    console.log(`💰 Account balance: ${hre.ethers.utils.formatEther(deployerBalance)} coins`);
    
    // Create a new deployment addresses file
    const deploymentFile = "deployment-addresses-sonic-new.json";
    let addresses = {
      wrappedSonic: process.env.WRAPPED_SONIC_ADDRESS || "0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38",
      router: process.env.SHADOW_DEX_ROUTER || "0x1D368773735ee1E678950B7A97bcA2CafB330CDc",
      factory: process.env.SHADOW_DEX_FACTORY || "0x2dA25E7446A70D7be65fd4c053948BEcAA6374c8",
      burnAddress: process.env.BURN_ADDRESS || "0x000000000000000000000000000000000000dEaD"
    };
    
    // Step 1: Deploy MultiSig first (for proper vault addresses)
    console.log("\n📦 1. Deploying MultiSig wallet...");
    const owner1 = process.env.MULTISIG_OWNER_1 || deployer.address;
    const owner2 = process.env.MULTISIG_OWNER_2 || deployer.address;
    const owner3 = process.env.MULTISIG_OWNER_3 || deployer.address;
    const requiredConfirmations = process.env.MULTISIG_REQUIRED_CONFIRMATIONS || 2;
    
    console.log("MultiSig owners:");
    console.log(`- Owner 1: ${owner1}`);
    console.log(`- Owner 2: ${owner2}`);
    console.log(`- Owner 3: ${owner3}`);
    console.log(`Required confirmations: ${requiredConfirmations}`);
    
    const RedDragonMultiSig = await hre.ethers.getContractFactory("RedDragonMultiSig");
    const multiSig = await RedDragonMultiSig.deploy(
      [owner1, owner2, owner3],
      requiredConfirmations
    );
    await multiSig.deployed();
    addresses.multiSig = multiSig.address;
    console.log("✅ MultiSig deployed to:", addresses.multiSig);
    
    // Step 2: Deploy JackpotVault
    console.log("\n📦 2. Deploying dedicated JackpotVault...");
    const RedDragonJackpotVault = await hre.ethers.getContractFactory("RedDragonJackpotVault");
    const jackpotVault = await RedDragonJackpotVault.deploy(
      addresses.wrappedSonic, 
      addresses.multiSig // Owner of the vault
    );
    await jackpotVault.deployed();
    addresses.jackpotVault = jackpotVault.address;
    console.log("✅ JackpotVault deployed to:", addresses.jackpotVault);
    
    // Step 3: Deploy LiquidityVault
    console.log("\n📦 3. Deploying dedicated LiquidityVault...");
    const RedDragonLiquidityVault = await hre.ethers.getContractFactory("RedDragonLiquidityVault");
    const liquidityVault = await RedDragonLiquidityVault.deploy(
      addresses.wrappedSonic,
      addresses.router,
      addresses.multiSig // Owner of the vault
    );
    await liquidityVault.deployed();
    addresses.liquidityVault = liquidityVault.address;
    console.log("✅ LiquidityVault deployed to:", addresses.liquidityVault);
    
    // Step 4: Deploy DevelopmentVault
    console.log("\n📦 4. Deploying dedicated DevelopmentVault...");
    const RedDragonDevelopmentVault = await hre.ethers.getContractFactory("RedDragonDevelopmentVault");
    const developmentVault = await RedDragonDevelopmentVault.deploy(
      addresses.wrappedSonic,
      addresses.multiSig // Owner of the vault
    );
    await developmentVault.deployed();
    addresses.developmentVault = developmentVault.address;
    console.log("✅ DevelopmentVault deployed to:", addresses.developmentVault);
    
    // Step 5: Deploy PaintSwap Verifier
    console.log("\n📦 5. Deploying PaintSwap Verifier...");
    const RedDragonPaintSwapVerifier = await hre.ethers.getContractFactory("RedDragonPaintSwapVerifier");
    const verifier = await RedDragonPaintSwapVerifier.deploy();
    await verifier.deployed();
    addresses.verifier = verifier.address;
    console.log("✅ PaintSwap Verifier deployed to:", addresses.verifier);
    
    // Step 6: Configure verifier
    console.log("\n🔧 Configuring PaintSwap Verifier...");
    const vrfCoordinator = process.env.PAINT_SWAP_VRF_COORDINATOR || "0x3ba925fdeae6b46d0bb4d424d829982cb2f7309e";
    const subscriptionId = process.env.PAINT_SWAP_SUBSCRIPTION_ID || "1";
    const gasLane = process.env.PAINT_SWAP_GAS_LANE || "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f";
    const callbackGasLimit = process.env.PAINT_SWAP_CALLBACK_GAS_LIMIT || "100000";
    const requestConfirmations = process.env.PAINT_SWAP_REQUEST_CONFIRMATIONS || "3";
    
    await verifier.initialize(
      vrfCoordinator,
      subscriptionId,
      gasLane,
      callbackGasLimit,
      requestConfirmations
    );
    console.log("✅ PaintSwap Verifier configured");
    
    // Step 7: Deploy PaintSwap Lottery
    console.log("\n📦 6. Deploying PaintSwap Lottery...");
    const RedDragonSwapLottery = await hre.ethers.getContractFactory("RedDragonSwapLottery");
    const lottery = await RedDragonSwapLottery.deploy(
      addresses.wrappedSonic, // wS address
      addresses.verifier     // verifier address
    );
    await lottery.deployed();
    addresses.lottery = lottery.address;
    console.log("✅ PaintSwap Lottery deployed to:", addresses.lottery);
    
    // Step 8: Deploy RedDragon token with correct vaults
    console.log("\n📦 7. Deploying RedDragon Token...");
    const RedDragon = await hre.ethers.getContractFactory("RedDragon");
    const redDragon = await RedDragon.deploy(
      addresses.jackpotVault,         // jackpotAddress (dedicated vault)
      addresses.liquidityVault,       // liquidityAddress (dedicated vault)
      addresses.burnAddress,          // burnAddress (dead address)
      addresses.developmentVault,     // developmentAddress (dedicated vault)
      addresses.wrappedSonic          // wrappedSonicAddress
    );
    await redDragon.deployed();
    addresses.redDragon = redDragon.address;
    console.log("✅ RedDragon Token deployed to:", addresses.redDragon);
    
    // Step 9: Set token addresses in vaults
    console.log("\n🔧 Configuring vaults with RedDragon token address...");
    
    // Set RedDragon token in JackpotVault
    await jackpotVault.setTokenAddress(addresses.redDragon);
    console.log("✅ RedDragon token set in JackpotVault");
    
    // Set RedDragon token in LiquidityVault
    await liquidityVault.setTokenAddress(addresses.redDragon);
    console.log("✅ RedDragon token set in LiquidityVault");
    
    // Set RedDragon token in DevelopmentVault
    await developmentVault.setTokenAddress(addresses.redDragon);
    console.log("✅ RedDragon token set in DevelopmentVault");
    
    // Step 10: Set lottery address in token
    console.log("\n🔧 Setting lottery address in token...");
    await redDragon.setLotteryAddress(addresses.lottery);
    console.log("✅ Lottery address set in token");
    
    // Step 11: Set JackpotVault to forward to lottery
    console.log("\n🔧 Setting JackpotVault to forward to lottery...");
    await jackpotVault.setForwardAddress(addresses.lottery);
    console.log("✅ JackpotVault configured to forward to lottery");
    
    // Step 12: Set token contract in lottery
    console.log("\n🔧 Setting token contract in lottery...");
    await lottery.setTokenContract(addresses.redDragon);
    console.log("✅ Token contract set in lottery");
    
    // Step 13: Transfer ownership of all contracts to multisig
    console.log("\n🔧 Transferring ownership of contracts to MultiSig...");
    
    // Token
    await redDragon.transferOwnership(addresses.multiSig);
    console.log("✅ Token ownership transferred to MultiSig");
    
    // Lottery
    await lottery.transferOwnership(addresses.multiSig);
    console.log("✅ Lottery ownership transferred to MultiSig");
    
    // Verifier
    await verifier.transferOwnership(addresses.multiSig);
    console.log("✅ Verifier ownership transferred to MultiSig");
    
    // Save deployment addresses
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    console.log(`\n📝 Deployment addresses saved to ${deploymentFile}`);
    
    console.log("\n🎉 Deployment completed successfully!");
    console.log("\n📝 Contract addresses:");
    console.log("- MultiSig:", addresses.multiSig);
    console.log("- JackpotVault:", addresses.jackpotVault);
    console.log("- LiquidityVault:", addresses.liquidityVault);
    console.log("- DevelopmentVault:", addresses.developmentVault);
    console.log("- RedDragon Token:", addresses.redDragon);
    console.log("- PaintSwap Verifier:", addresses.verifier);
    console.log("- PaintSwap Lottery:", addresses.lottery);
    
    console.log("\n⚠️ Important Next Steps:");
    console.log("1. Verify all contracts on block explorer");
    console.log("2. Set up exchange pair for the new token");
    console.log("3. Enable trading on the token");
    console.log("4. Transfer initial liquidity to the liquidity vault");
    
  } catch (error) {
    console.error("❌ Deployment error:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Script error:", error);
    process.exit(1);
  }); 