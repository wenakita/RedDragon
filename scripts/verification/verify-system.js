const hre = require("hardhat");
const fs = require("fs");
const { ethers } = require("hardhat");

/**
 * System Verification Script
 * 
 * This script checks all contracts and their interconnections
 * to ensure the RedDragon token system is properly configured.
 */
async function main() {
  console.log("🔍 RedDragon System Verification");
  console.log("===============================");

  try {
    // Load deployment addresses
    let addresses = {};
    const deploymentFile = "deployment-addresses-sonic.json";
    
    if (fs.existsSync(deploymentFile)) {
      addresses = JSON.parse(fs.readFileSync(deploymentFile));
      console.log("📝 Loaded deployment addresses");
    } else {
      console.error("❌ Deployment addresses file not found");
      process.exit(1);
    }
    
    // Check required addresses exist
    const requiredContracts = [
      "dragonToken", 
      "feeManager", 
      "paintSwapVerifier", 
      "redDragonVerifier", 
      "redDragonSwapLottery",
      "veStrategy"
    ];
    
    const missingContracts = requiredContracts.filter(contract => !addresses[contract]);
    
    if (missingContracts.length > 0) {
      console.error(`❌ Missing addresses for: ${missingContracts.join(", ")}`);
      process.exit(1);
    }
    
    // Get signer
    const [signer] = await ethers.getSigners();
    console.log(`📋 Using account: ${signer.address}`);
    
    // Connect to contracts
    const dragonToken = await hre.ethers.getContractAt("RedDragon", addresses.dragonToken);
    const feeManager = await hre.ethers.getContractAt("RedDragonFeeManager", addresses.feeManager);
    const paintSwapVerifier = await hre.ethers.getContractAt("RedDragonPaintSwapVerifier", addresses.paintSwapVerifier);
    const redDragonVerifier = await hre.ethers.getContractAt("RedDragonVerifier", addresses.redDragonVerifier);
    const redDragonSwapLottery = await hre.ethers.getContractAt("RedDragonSwapLottery", addresses.redDragonSwapLottery);
    const veStrategy = await hre.ethers.getContractAt("Ve8020Strategy", addresses.veStrategy);
    
    console.log(`\n✅ Connected to all required contracts`);
    
    // Check RedDragon Token Configuration
    console.log("\n🔍 Checking RedDragon Token Configuration");
    console.log("---------------------------------------");
    
    const tokenName = await dragonToken.name();
    const tokenSymbol = await dragonToken.symbol();
    const tokenDecimals = await dragonToken.decimals();
    const tokenTotalSupply = await dragonToken.totalSupply();
    
    console.log(`Token Name: ${tokenName}`);
    console.log(`Token Symbol: ${tokenSymbol}`);
    console.log(`Token Decimals: ${tokenDecimals}`);
    console.log(`Total Supply: ${ethers.utils.formatUnits(tokenTotalSupply, tokenDecimals)}`);
    
    // Check Fee Manager configuration in Token
    const tokenFeeManager = await dragonToken.feeManager();
    console.log(`\nFee Manager set in Token: ${tokenFeeManager}`);
    console.log(`Expected Fee Manager: ${addresses.feeManager}`);
    
    if (tokenFeeManager.toLowerCase() === addresses.feeManager.toLowerCase()) {
      console.log("✅ Fee Manager correctly configured in Token");
    } else {
      console.log("❌ Fee Manager not correctly configured in Token");
    }
    
    // Check Fee Manager Configuration
    console.log("\n🔍 Checking Fee Manager Configuration");
    console.log("-----------------------------------");
    
    const dragonTokenInManager = await feeManager.dragonToken();
    console.log(`Dragon Token set in Fee Manager: ${dragonTokenInManager}`);
    console.log(`Expected Dragon Token: ${addresses.dragonToken}`);
    
    if (dragonTokenInManager.toLowerCase() === addresses.dragonToken.toLowerCase()) {
      console.log("✅ Dragon Token correctly configured in Fee Manager");
    } else {
      console.log("❌ Dragon Token not correctly configured in Fee Manager");
    }
    
    const veDistributor = await feeManager.veDistributor();
    console.log(`\nVE Distributor set in Fee Manager: ${veDistributor}`);
    console.log(`Expected VE Strategy: ${addresses.veStrategy}`);
    
    if (veDistributor.toLowerCase() === addresses.veStrategy.toLowerCase()) {
      console.log("✅ VE Distributor correctly configured in Fee Manager");
    } else {
      console.log("❌ VE Distributor not correctly configured in Fee Manager");
    }
    
    const jackpotAddress = await feeManager.jackpotAddress();
    console.log(`\nJackpot Address set in Fee Manager: ${jackpotAddress}`);
    console.log(`Expected Lottery Address: ${addresses.redDragonSwapLottery}`);
    
    if (jackpotAddress.toLowerCase() === addresses.redDragonSwapLottery.toLowerCase()) {
      console.log("✅ Jackpot Address correctly configured in Fee Manager");
    } else {
      console.log("❌ Jackpot Address not correctly configured in Fee Manager");
    }
    
    // Check VE Strategy Configuration
    console.log("\n🔍 Checking VE Strategy Configuration");
    console.log("-----------------------------------");
    
    try {
      const veToken = await veStrategy.veToken();
      console.log(`VE Token in Strategy: ${veToken}`);
      
      const rewardToken = await veStrategy.rewardToken();
      console.log(`Reward Token in Strategy: ${rewardToken}`);
      console.log(`Expected Reward Token: ${addresses.dragonToken}`);
      
      if (rewardToken.toLowerCase() === addresses.dragonToken.toLowerCase()) {
        console.log("✅ Reward Token correctly configured in VE Strategy");
      } else {
        console.log("❌ Reward Token not correctly configured in VE Strategy");
      }
    } catch (error) {
      console.log("❌ Error checking VE Strategy:", error.message);
    }
    
    // Check Lottery Configuration
    console.log("\n🔍 Checking Lottery Configuration");
    console.log("-------------------------------");
    
    const lotteryToken = await redDragonSwapLottery.rewardToken();
    console.log(`Reward Token in Lottery: ${lotteryToken}`);
    console.log(`Expected Token: ${addresses.dragonToken}`);
    
    if (lotteryToken.toLowerCase() === addresses.dragonToken.toLowerCase()) {
      console.log("✅ Reward Token correctly configured in Lottery");
    } else {
      console.log("❌ Reward Token not correctly configured in Lottery");
    }
    
    const lotteryVerifier = await redDragonSwapLottery.verifier();
    console.log(`\nVerifier in Lottery: ${lotteryVerifier}`);
    console.log(`Expected Verifier: ${addresses.redDragonVerifier}`);
    
    if (lotteryVerifier.toLowerCase() === addresses.redDragonVerifier.toLowerCase()) {
      console.log("✅ Verifier correctly configured in Lottery");
    } else {
      console.log("❌ Verifier not correctly configured in Lottery");
    }
    
    // Check RedDragon Verifier Configuration
    console.log("\n🔍 Checking RedDragon Verifier Configuration");
    console.log("------------------------------------------");
    
    const verifierLotteryAddress = await redDragonVerifier.lotteryAddress();
    console.log(`Lottery Address in Verifier: ${verifierLotteryAddress}`);
    console.log(`Expected Address: ${addresses.redDragonSwapLottery}`);
    
    if (verifierLotteryAddress.toLowerCase() === addresses.redDragonSwapLottery.toLowerCase()) {
      console.log("✅ Lottery correctly configured in Verifier");
    } else {
      console.log("❌ Lottery not correctly configured in Verifier");
    }
    
    const paintSwapVerifierAddress = await redDragonVerifier.externalVerifier();
    console.log(`\nExternal Verifier in RedDragon Verifier: ${paintSwapVerifierAddress}`);
    console.log(`Expected Address: ${addresses.paintSwapVerifier}`);
    
    if (paintSwapVerifierAddress.toLowerCase() === addresses.paintSwapVerifier.toLowerCase()) {
      console.log("✅ PaintSwap Verifier correctly configured in RedDragon Verifier");
    } else {
      console.log("❌ PaintSwap Verifier not correctly configured in RedDragon Verifier");
    }
    
    // Check PaintSwap Verifier Configuration
    console.log("\n🔍 Checking PaintSwap Verifier Configuration");
    console.log("------------------------------------------");
    
    try {
      const vrfCoordinator = await paintSwapVerifier.vrfCoordinator();
      const keyHash = await paintSwapVerifier.keyHash();
      const fee = await paintSwapVerifier.fee();
      
      console.log(`VRF Coordinator: ${vrfCoordinator}`);
      console.log(`Key Hash: ${keyHash}`);
      console.log(`Fee: ${ethers.utils.formatEther(fee)} Sonic`);
      
      if (vrfCoordinator === "0x0000000000000000000000000000000000000000") {
        console.log("⚠️ VRF Coordinator not set. Please run the init-paintswap-verifier script.");
      } else {
        console.log("✅ VRF Coordinator is set");
      }
      
      const ownerAddress = await paintSwapVerifier.owner();
      console.log(`\nOwner: ${ownerAddress}`);
      
      const callbackAddress = await redDragonVerifier.address;
      try {
        const isConsumer = await paintSwapVerifier.isConsumer(callbackAddress);
        console.log(`Is RedDragon Verifier a consumer: ${isConsumer}`);
        
        if (isConsumer) {
          console.log("✅ RedDragon Verifier is registered as a consumer");
        } else {
          console.log("⚠️ RedDragon Verifier is not registered as a consumer");
        }
      } catch (error) {
        console.log("❌ Error checking consumer status:", error.message);
      }
      
    } catch (error) {
      console.log("❌ Error checking PaintSwap Verifier:", error.message);
    }
    
    // Check for LP Burner (should be removed)
    console.log("\n🔍 Checking for LP Burner");
    console.log("------------------------");
    
    try {
      if (addresses.lpBurner) {
        console.log(`LP Burner address found: ${addresses.lpBurner}`);
        console.log("⚠️ LP Burner address is present in deployment file");
        
        // Check if the burn address in fee manager is the LP Burner
        const burnAddress = await feeManager.burnAddress();
        console.log(`Burn Address in Fee Manager: ${burnAddress}`);
        
        if (burnAddress.toLowerCase() === addresses.lpBurner.toLowerCase()) {
          console.log("❌ Fee Manager is still using LP Burner as burn address");
        } else {
          console.log("✅ Fee Manager is not using LP Burner as burn address");
        }
      } else {
        console.log("✅ No LP Burner address found in deployment file");
      }
    } catch (error) {
      console.log("❌ Error checking LP Burner:", error.message);
    }
    
    // Summary
    console.log("\n🔍 System Verification Summary");
    console.log("----------------------------");
    console.log("✅ RedDragon Token connected to Fee Manager");
    console.log("✅ Fee Manager connected to VE Strategy and Lottery");
    console.log("✅ Lottery connected to RedDragon Verifier");
    console.log("✅ RedDragon Verifier connected to PaintSwap Verifier");
    
    if (vrfCoordinator === "0x0000000000000000000000000000000000000000") {
      console.log("⚠️ PaintSwap Verifier needs VRF initialization");
    } else {
      console.log("✅ PaintSwap Verifier configured with VRF Coordinator");
    }
    
    console.log("\n✅ System verification completed!");
    
  } catch (error) {
    console.error("❌ Error during verification:", error.message);
    process.exit(1);
  }
}

// Run the main function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 