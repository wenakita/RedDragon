const hre = require("hardhat");
const fs = require('fs');
const path = require('path');
require("dotenv").config();

/**
 * Simple deployment of core RedDragon contracts with swap-based jackpot
 */
async function main() {
  console.log("\n🚀 DEPLOYING CORE REDDRAGON SYSTEM");
  console.log("📡 Chain ID: 146 (Sonic)");
  console.log("⏱️ " + new Date().toISOString());
  console.log("------------------------------------------------");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using deployer:", deployer.address);
    const deployerBalance = await deployer.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", hre.ethers.utils.formatEther(deployerBalance), "wS");

    // Initialize deployment addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    let addresses = {
      wrappedSonic: process.env.WRAPPED_SONIC_ADDRESS || "0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38",
      burnAddress: process.env.BURN_ADDRESS || "0x000000000000000000000000000000000000dEaD"
    };
    
    console.log("\n📦 STEP 1: DEPLOY PAINTSWAP VRF VERIFIER");
    try {
      const RedDragonPaintSwapVerifier = await hre.ethers.getContractFactory("RedDragonPaintSwapVerifier");
      const verifier = await RedDragonPaintSwapVerifier.deploy();
      await verifier.deployed();
      console.log("✅ PaintSwap Verifier deployed to:", verifier.address);
      addresses.paintswapVerifier = verifier.address;
      
      // Save addresses
      fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    } catch (error) {
      console.error("❌ PaintSwap Verifier deployment failed:", error.message);
      return;
    }

    console.log("\n📦 STEP 2: DEPLOY LOTTERY CONTRACT");
    try {
      const RedDragonSwapLottery = await hre.ethers.getContractFactory("RedDragonSwapLottery");
      const lottery = await RedDragonSwapLottery.deploy(
        addresses.wrappedSonic,
        addresses.paintswapVerifier
      );
      await lottery.deployed();
      console.log("✅ Lottery deployed to:", lottery.address);
      addresses.lottery = lottery.address;
      
      // Save addresses
      fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    } catch (error) {
      console.error("❌ Lottery deployment failed:", error.message);
      return;
    }

    console.log("\n📦 STEP 3: DEPLOY REDDRAGON TOKEN");
    try {
      const RedDragon = await hre.ethers.getContractFactory("RedDragon");
      const redDragon = await RedDragon.deploy(
        addresses.lottery,
        addresses.wrappedSonic
      );
      await redDragon.deployed();
      console.log("✅ RedDragon token deployed to:", redDragon.address);
      addresses.redDragon = redDragon.address;
      
      // Save addresses
      fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    } catch (error) {
      console.error("❌ RedDragon token deployment failed:", error.message);
      return;
    }

    console.log("\n⚙️ STEP 4: CONFIGURE LOTTERY WITH TOKEN CONTRACT");
    try {
      const lottery = await hre.ethers.getContractAt("RedDragonSwapLottery", addresses.lottery);
      const tx = await lottery.setTokenContract(addresses.redDragon);
      await tx.wait();
      console.log("✅ Lottery configured with token contract");
    } catch (error) {
      console.error("❌ Failed to configure lottery with token contract:", error.message);
    }

    // Set up swap-based jackpot distribution
    console.log("\n🎮 STEP 5: SETUP SWAP-BASED JACKPOT DISTRIBUTION");
    
    // Update environment configuration
    try {
      // Read .env file if it exists
      const envPath = path.join(__dirname, '..', '..', '.env');
      let envContent = '';
      
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }
      
      // Update or add jackpot configuration
      const minJackpotAmount = process.env.MIN_JACKPOT_AMOUNT || "100";
      
      let updatedEnv = false;
      
      // Check if MIN_JACKPOT_AMOUNT already exists in the .env file
      if (!envContent.includes('MIN_JACKPOT_AMOUNT=')) {
        // Add MIN_JACKPOT_AMOUNT to .env file
        envContent += `\n# Auto Jackpot Distribution Configuration\nMIN_JACKPOT_AMOUNT="${minJackpotAmount}"\n`;
        updatedEnv = true;
      }
      
      // Set the lottery contract address in .env
      if (!envContent.includes('LOTTERY_CONTRACT_ADDRESS=')) {
        envContent += `LOTTERY_CONTRACT_ADDRESS="${addresses.lottery}"\n`;
        updatedEnv = true;
      }
      
      // Set the RedDragon address in .env
      if (!envContent.includes('REDDRAGON_ADDRESS=')) {
        envContent += `REDDRAGON_ADDRESS="${addresses.redDragon}"\n`;
        updatedEnv = true;
      }
      
      if (updatedEnv) {
        fs.writeFileSync(envPath, envContent);
        console.log("✅ Updated environment configuration");
      } else {
        console.log("✅ Environment configuration already set up");
      }
    } catch (error) {
      console.error("❌ Failed to update environment configuration:", error.message);
    }
    
    // Copy jackpot scripts to the jackpot directory
    try {
      const sourcePath = path.join(__dirname, '..', '..', 'scripts');
      const scriptPaths = [
        'autodistribute-jackpot.js',
        'swap-with-jackpot.js'
      ];

      // Create jackpot directory if it doesn't exist
      const jackpotDir = path.join(sourcePath, 'jackpot');
      if (!fs.existsSync(jackpotDir)) {
        fs.mkdirSync(jackpotDir, { recursive: true });
      }

      let copiedFiles = 0;
      // Copy scripts to jackpot directory
      for (const scriptName of scriptPaths) {
        const sourceFile = path.join(sourcePath, scriptName);
        const destFile = path.join(jackpotDir, scriptName);
        
        if (fs.existsSync(sourceFile)) {
          fs.copyFileSync(sourceFile, destFile);
          copiedFiles++;
        }
      }
      
      console.log(`✅ Copied ${copiedFiles} script files to jackpot directory`);
    } catch (error) {
      console.error("❌ Failed to copy jackpot scripts:", error.message);
    }

    console.log("\n🎉 DEPLOYMENT COMPLETED");
    console.log("------------------------------------------------");
    console.log("📋 KEY CONTRACT ADDRESSES:");
    console.log("- PaintSwap Verifier:", addresses.paintswapVerifier || "NOT DEPLOYED");
    console.log("- Lottery:", addresses.lottery || "NOT DEPLOYED");
    console.log("- RedDragon Token:", addresses.redDragon || "NOT DEPLOYED");
    console.log("------------------------------------------------");
    
    console.log("\n⚠️ NEXT STEPS:");
    console.log("1. Create a liquidity pair for the RedDragon token");
    console.log("2. Set the LP token address in the lottery contract");
    console.log("3. Test the jackpot distribution with: npx hardhat run scripts/jackpot/swap-with-jackpot.js --network sonic");
    console.log("------------------------------------------------");
    
  } catch (error) {
    console.error("\n❌ DEPLOYMENT FAILED:", error.message);
    if (error.stack) {
      console.error("Error stack:", error.stack);
    }
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  }); 