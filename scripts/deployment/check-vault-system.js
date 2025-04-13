const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Check the status of the vault system
 * This script verifies all components are properly configured
 */
async function main() {
  console.log("🔍 Checking vault system status...");

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
        return;
      }
    } catch (error) {
      console.error("❌ Error loading deployment addresses:", error);
      return;
    }
    
    // Check for required addresses
    console.log("\n📋 Checking required addresses...");
    const requiredAddresses = [
      'redDragon', 
      'jackpotVault', 
      'liquidityVault', 
      'developmentVault', 
      'verifier', 
      'lottery', 
      'multiSig',
      'wrappedSonic'
    ];
    
    let missingAddresses = [];
    for (const addr of requiredAddresses) {
      if (!addresses[addr]) {
        missingAddresses.push(addr);
      }
    }
    
    if (missingAddresses.length > 0) {
      console.error(`❌ Missing required addresses: ${missingAddresses.join(', ')}`);
      console.log("👉 Please run deploy-with-vaults.js first");
      return;
    } else {
      console.log("✅ All required addresses are present");
    }
    
    // Connect to contracts
    console.log("\n🔄 Connecting to contracts...");
    
    const redDragon = await hre.ethers.getContractAt("RedDragon", addresses.redDragon);
    console.log("- Connected to RedDragon token:", addresses.redDragon);
    
    const jackpotVault = await hre.ethers.getContractAt("RedDragonJackpotVault", addresses.jackpotVault);
    console.log("- Connected to JackpotVault:", addresses.jackpotVault);
    
    const liquidityVault = await hre.ethers.getContractAt("RedDragonLiquidityVault", addresses.liquidityVault);
    console.log("- Connected to LiquidityVault:", addresses.liquidityVault);
    
    const developmentVault = await hre.ethers.getContractAt("RedDragonDevelopmentVault", addresses.developmentVault);
    console.log("- Connected to DevelopmentVault:", addresses.developmentVault);
    
    const lottery = await hre.ethers.getContractAt("RedDragonSwapLottery", addresses.lottery);
    console.log("- Connected to Lottery:", addresses.lottery);
    
    const verifier = await hre.ethers.getContractAt("RedDragonPaintSwapVerifier", addresses.verifier);
    console.log("- Connected to Verifier:", addresses.verifier);
    
    const multiSig = await hre.ethers.getContractAt("RedDragonMultiSig", addresses.multiSig);
    console.log("- Connected to MultiSig:", addresses.multiSig);
    
    // Check RedDragon configuration
    console.log("\n📋 Checking RedDragon token configuration...");
    
    const tokenJackpotAddress = await redDragon.jackpotAddress();
    const tokenLiquidityAddress = await redDragon.liquidityAddress();
    const tokenBurnAddress = await redDragon.burnAddress();
    const tokenDevelopmentAddress = await redDragon.developmentAddress();
    const tokenWrappedSonicAddress = await redDragon.wrappedSonicAddress();
    const tokenLotteryAddress = await redDragon.lotteryAddress();
    const tokenOwner = await redDragon.owner();
    
    console.log(`- Jackpot Vault: ${tokenJackpotAddress} ${tokenJackpotAddress.toLowerCase() === addresses.jackpotVault.toLowerCase() ? '✅' : '❌'}`);
    console.log(`- Liquidity Vault: ${tokenLiquidityAddress} ${tokenLiquidityAddress.toLowerCase() === addresses.liquidityVault.toLowerCase() ? '✅' : '❌'}`);
    console.log(`- Burn Address: ${tokenBurnAddress} ${tokenBurnAddress.toLowerCase() === addresses.burnAddress.toLowerCase() ? '✅' : '❌'}`);
    console.log(`- Development Vault: ${tokenDevelopmentAddress} ${tokenDevelopmentAddress.toLowerCase() === addresses.developmentVault.toLowerCase() ? '✅' : '❌'}`);
    console.log(`- Wrapped Sonic: ${tokenWrappedSonicAddress} ${tokenWrappedSonicAddress.toLowerCase() === addresses.wrappedSonic.toLowerCase() ? '✅' : '❌'}`);
    console.log(`- Lottery Address: ${tokenLotteryAddress} ${tokenLotteryAddress.toLowerCase() === addresses.lottery.toLowerCase() ? '✅' : '❌'}`);
    console.log(`- Owner: ${tokenOwner} ${tokenOwner.toLowerCase() === addresses.multiSig.toLowerCase() ? '✅' : '❌'}`);
    
    // Check JackpotVault configuration
    console.log("\n📋 Checking JackpotVault configuration...");
    
    const jackpotVaultToken = await jackpotVault.redDragonToken();
    const jackpotVaultForwardAddress = await jackpotVault.forwardAddress();
    const jackpotVaultOwner = await jackpotVault.owner();
    
    console.log(`- RedDragon Token: ${jackpotVaultToken} ${jackpotVaultToken.toLowerCase() === addresses.redDragon.toLowerCase() ? '✅' : '❌'}`);
    console.log(`- Forward Address: ${jackpotVaultForwardAddress} ${jackpotVaultForwardAddress.toLowerCase() === addresses.lottery.toLowerCase() ? '✅' : '❌'}`);
    console.log(`- Owner: ${jackpotVaultOwner} ${jackpotVaultOwner.toLowerCase() === addresses.multiSig.toLowerCase() ? '✅' : '❌'}`);
    
    // Check LiquidityVault configuration
    console.log("\n📋 Checking LiquidityVault configuration...");
    
    const liquidityVaultToken = await liquidityVault.redDragonToken();
    const liquidityVaultOwner = await liquidityVault.owner();
    
    console.log(`- RedDragon Token: ${liquidityVaultToken} ${liquidityVaultToken.toLowerCase() === addresses.redDragon.toLowerCase() ? '✅' : '❌'}`);
    console.log(`- Owner: ${liquidityVaultOwner} ${liquidityVaultOwner.toLowerCase() === addresses.multiSig.toLowerCase() ? '✅' : '❌'}`);
    
    // Check DevelopmentVault configuration
    console.log("\n📋 Checking DevelopmentVault configuration...");
    
    const developmentVaultToken = await developmentVault.redDragonToken();
    const developmentVaultOwner = await developmentVault.owner();
    
    console.log(`- RedDragon Token: ${developmentVaultToken} ${developmentVaultToken.toLowerCase() === addresses.redDragon.toLowerCase() ? '✅' : '❌'}`);
    console.log(`- Owner: ${developmentVaultOwner} ${developmentVaultOwner.toLowerCase() === addresses.multiSig.toLowerCase() ? '✅' : '❌'}`);
    
    // Check Lottery configuration
    console.log("\n📋 Checking Lottery configuration...");
    
    const lotteryToken = await lottery.tokenContract();
    const lotteryVerifier = await lottery.verifier();
    const lotteryOwner = await lottery.owner();
    
    console.log(`- Token Contract: ${lotteryToken} ${lotteryToken.toLowerCase() === addresses.redDragon.toLowerCase() ? '✅' : '❌'}`);
    console.log(`- Verifier: ${lotteryVerifier} ${lotteryVerifier.toLowerCase() === addresses.verifier.toLowerCase() ? '✅' : '❌'}`);
    console.log(`- Owner: ${lotteryOwner} ${lotteryOwner.toLowerCase() === addresses.multiSig.toLowerCase() ? '✅' : '❌'}`);
    
    // Check Verifier configuration
    console.log("\n📋 Checking Verifier configuration...");
    
    const verifierOwner = await verifier.owner();
    console.log(`- Owner: ${verifierOwner} ${verifierOwner.toLowerCase() === addresses.multiSig.toLowerCase() ? '✅' : '❌'}`);
    
    // Check exchange pair if set
    if (addresses.exchangePair) {
      console.log("\n📋 Checking Exchange Pair configuration...");
      
      const tokenExchangePair = await redDragon.exchangePair();
      console.log(`- Exchange Pair: ${tokenExchangePair} ${tokenExchangePair.toLowerCase() === addresses.exchangePair.toLowerCase() ? '✅' : '❌'}`);
      
      // Check if trading is enabled
      const tradingEnabled = await redDragon.tradingEnabled();
      console.log(`- Trading Enabled: ${tradingEnabled ? '✅' : '❌'}`);
    } else {
      console.log("\n⚠️ Exchange pair not set yet");
      console.log("👉 Run setup-exchange-pair.js to set up the exchange pair");
    }
    
    // Check MultiSig configuration
    console.log("\n📋 Checking MultiSig configuration...");
    
    // Get multisig owners and required confirmations
    const owners = [];
    let i = 0;
    let ownerAddress = null;
    
    try {
      while (i < 10) { // Reasonable limit to check for owners
        ownerAddress = await multiSig.owners(i);
        if (ownerAddress) owners.push(ownerAddress);
        i++;
      }
    } catch (e) {
      // Reached the end of owners array
    }
    
    const requiredConfirmations = await multiSig.required();
    
    console.log(`- Owners: ${owners.join(', ')}`);
    console.log(`- Required Confirmations: ${requiredConfirmations}`);
    
    // Summary
    console.log("\n🎉 Vault system check completed!");
    
    // Check for any issues
    const issues = [];
    
    if (tokenJackpotAddress.toLowerCase() !== addresses.jackpotVault.toLowerCase()) issues.push("Token's jackpot vault address is incorrect");
    if (tokenLiquidityAddress.toLowerCase() !== addresses.liquidityVault.toLowerCase()) issues.push("Token's liquidity vault address is incorrect");
    if (tokenBurnAddress.toLowerCase() !== addresses.burnAddress.toLowerCase()) issues.push("Token's burn address is incorrect");
    if (tokenDevelopmentAddress.toLowerCase() !== addresses.developmentVault.toLowerCase()) issues.push("Token's development vault address is incorrect");
    if (tokenWrappedSonicAddress.toLowerCase() !== addresses.wrappedSonic.toLowerCase()) issues.push("Token's wrapped sonic address is incorrect");
    if (tokenLotteryAddress.toLowerCase() !== addresses.lottery.toLowerCase()) issues.push("Token's lottery address is incorrect");
    if (tokenOwner.toLowerCase() !== addresses.multiSig.toLowerCase()) issues.push("Token's owner is not the multisig");
    
    if (jackpotVaultToken.toLowerCase() !== addresses.redDragon.toLowerCase()) issues.push("JackpotVault's token address is incorrect");
    if (jackpotVaultForwardAddress.toLowerCase() !== addresses.lottery.toLowerCase()) issues.push("JackpotVault's forward address is incorrect");
    if (jackpotVaultOwner.toLowerCase() !== addresses.multiSig.toLowerCase()) issues.push("JackpotVault's owner is not the multisig");
    
    if (liquidityVaultToken.toLowerCase() !== addresses.redDragon.toLowerCase()) issues.push("LiquidityVault's token address is incorrect");
    if (liquidityVaultOwner.toLowerCase() !== addresses.multiSig.toLowerCase()) issues.push("LiquidityVault's owner is not the multisig");
    
    if (developmentVaultToken.toLowerCase() !== addresses.redDragon.toLowerCase()) issues.push("DevelopmentVault's token address is incorrect");
    if (developmentVaultOwner.toLowerCase() !== addresses.multiSig.toLowerCase()) issues.push("DevelopmentVault's owner is not the multisig");
    
    if (lotteryToken.toLowerCase() !== addresses.redDragon.toLowerCase()) issues.push("Lottery's token contract is incorrect");
    if (lotteryVerifier.toLowerCase() !== addresses.verifier.toLowerCase()) issues.push("Lottery's verifier address is incorrect");
    if (lotteryOwner.toLowerCase() !== addresses.multiSig.toLowerCase()) issues.push("Lottery's owner is not the multisig");
    
    if (verifierOwner.toLowerCase() !== addresses.multiSig.toLowerCase()) issues.push("Verifier's owner is not the multisig");
    
    if (addresses.exchangePair && tokenExchangePair.toLowerCase() !== addresses.exchangePair.toLowerCase()) issues.push("Token's exchange pair is incorrect");
    
    if (issues.length > 0) {
      console.log("\n⚠️ Issues found:");
      for (const issue of issues) {
        console.log(`- ${issue}`);
      }
      console.log("\n👉 Please fix these issues before proceeding");
    } else {
      console.log("\n✅ All checks passed! Your vault system is properly configured.");
    }
    
  } catch (error) {
    console.error("❌ Check error:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Script error:", error);
    process.exit(1);
  }); 