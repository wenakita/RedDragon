const hre = require("hardhat");
const fs = require('fs');
const path = require('path');
require("dotenv").config();

/**
 * Deploy the complete RedDragon system with swap-based jackpot distribution
 * This script has improved error handling and logging
 */
async function main() {
  console.log("\n🚀 REDEPLOYING COMPLETE REDDRAGON SYSTEM");
  console.log("📡 Chain ID: 146 (Sonic)");
  console.log("⏱️ " + new Date().toISOString());
  console.log("------------------------------------------------");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using deployer:", deployer.address);
    const deployerBalance = await deployer.provider.getBalance(deployer.address);
    console.log("💰 Deployer balance:", hre.ethers.utils.formatEther(deployerBalance), "wS");

    // Set up deployment options with higher gas price
    const deployOptions = {
      gasPrice: hre.ethers.utils.parseUnits("5", "gwei"),
      gasLimit: 5000000
    };
    console.log("⛽ Using gas price:", hre.ethers.utils.formatUnits(deployOptions.gasPrice, "gwei"), "gwei");
    console.log("⛽ Using gas limit:", deployOptions.gasLimit.toString());

    // Initialize deployment addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    let addresses = {
      wrappedSonic: process.env.WRAPPED_SONIC_ADDRESS || "0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38",
      burnAddress: process.env.BURN_ADDRESS || "0x000000000000000000000000000000000000dEaD"
    };
    
    console.log("\n📦 STEP 1: DEPLOY PAINTSWAP VRF VERIFIER");
    try {
      const PaintSwapVerifier = await hre.ethers.getContractFactory("RedDragonPaintSwapVerifier");
      const verifier = await PaintSwapVerifier.deploy({
        ...deployOptions
      });
      await verifier.deployed();
      console.log("✅ PaintSwap Verifier deployed to:", verifier.address);
      addresses.paintswapVerifier = verifier.address;
      
      // Save early in case of later failures
      fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    } catch (error) {
      console.error("❌ PaintSwap Verifier deployment failed:", error.message);
      console.error(error);
      return;
    }

    console.log("\n📦 STEP 2: DEPLOY LOTTERY CONTRACT");
    try {
      const RedDragonSwapLottery = await hre.ethers.getContractFactory("RedDragonSwapLottery");
      const lottery = await RedDragonSwapLottery.deploy(
        addresses.wrappedSonic,
        addresses.paintswapVerifier,
        {
          ...deployOptions
        }
      );
      await lottery.deployed();
      console.log("✅ Lottery deployed to:", lottery.address);
      addresses.lottery = lottery.address;
      
      // Save after each successful deployment
      fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    } catch (error) {
      console.error("❌ Lottery deployment failed:", error.message);
      console.error(error);
      return;
    }

    console.log("\n📦 STEP 3: DEPLOY REDDRAGON TOKEN");
    try {
      const RedDragon = await hre.ethers.getContractFactory("RedDragon");
      const redDragon = await RedDragon.deploy(
        addresses.lottery,
        addresses.wrappedSonic,
        {
          ...deployOptions
        }
      );
      await redDragon.deployed();
      console.log("✅ RedDragon token deployed to:", redDragon.address);
      addresses.redDragon = redDragon.address;
      
      // Save after each successful deployment
      fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    } catch (error) {
      console.error("❌ RedDragon token deployment failed:", error.message);
      console.error(error);
      return;
    }

    console.log("\n⚙️ STEP 4: CONFIGURE LOTTERY WITH TOKEN CONTRACT");
    try {
      const lottery = await hre.ethers.getContractAt("RedDragonSwapLottery", addresses.lottery);
      const tx = await lottery.setTokenContract(addresses.redDragon, {
        ...deployOptions
      });
      await tx.wait();
      console.log("✅ Lottery configured with token contract");
    } catch (error) {
      console.error("❌ Failed to configure lottery with token contract:", error.message);
      console.error(error);
      // Continue anyway as this can be fixed later
    }

    console.log("\n📦 STEP 5: DEPLOY LP BOOSTER");
    try {
      const LpBooster = await hre.ethers.getContractFactory("RedDragonLPBooster");
      const lpBooster = await LpBooster.deploy(
        addresses.lottery,
        {
          ...deployOptions
        }
      );
      await lpBooster.deployed();
      console.log("✅ LP Booster deployed to:", lpBooster.address);
      addresses.lpBooster = lpBooster.address;
      
      // Save after each successful deployment
      fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    } catch (error) {
      console.error("❌ LP Booster deployment failed:", error.message);
      console.error(error);
      // Continue anyway as this is not critical
    }

    console.log("\n⚙️ STEP 6: SET LP BOOSTER IN LOTTERY");
    try {
      if (addresses.lpBooster) {
        const lottery = await hre.ethers.getContractAt("RedDragonSwapLottery", addresses.lottery);
        const tx = await lottery.setLPBooster(addresses.lpBooster, {
          ...deployOptions
        });
        await tx.wait();
        console.log("✅ LP Booster set in lottery");
      } else {
        console.log("⚠️ Skipping LP Booster configuration - not deployed");
      }
    } catch (error) {
      console.error("❌ Failed to set LP Booster in lottery:", error.message);
      console.error(error);
      // Continue anyway as this can be fixed later
    }

    console.log("\n📦 STEP 7: DEPLOY VE8020 TOKEN");
    try {
      const Ve8020 = await hre.ethers.getContractFactory("ve8020");
      const ve8020 = await Ve8020.deploy(
        addresses.redDragon,
        {
          ...deployOptions
        }
      );
      await ve8020.deployed();
      console.log("✅ ve8020 token deployed to:", ve8020.address);
      addresses.ve8020 = ve8020.address;
      
      // Save after each successful deployment
      fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    } catch (error) {
      console.error("❌ ve8020 token deployment failed:", error.message);
      console.error(error);
      // Continue anyway as this is not critical
    }

    console.log("\n⚙️ STEP 8: SET VOTING TOKEN IN LOTTERY");
    try {
      if (addresses.ve8020) {
        const lottery = await hre.ethers.getContractAt("RedDragonSwapLottery", addresses.lottery);
        const tx = await lottery.setVotingToken(addresses.ve8020, {
          ...deployOptions
        });
        await tx.wait();
        console.log("✅ Voting token set in lottery");
      } else {
        console.log("⚠️ Skipping voting token configuration - not deployed");
      }
    } catch (error) {
      console.error("❌ Failed to set voting token in lottery:", error.message);
      console.error(error);
      // Continue anyway as this can be fixed later
    }

    console.log("\n📦 STEP 9: DEPLOY FEE MANAGER");
    try {
      const FeeManager = await hre.ethers.getContractFactory("RedDragonFeeManager");
      const feeManager = await FeeManager.deploy(
        addresses.redDragon,
        addresses.wrappedSonic,
        addresses.burnAddress,
        {
          ...deployOptions
        }
      );
      await feeManager.deployed();
      console.log("✅ Fee Manager deployed to:", feeManager.address);
      addresses.feeManager = feeManager.address;
      
      // Save after each successful deployment
      fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    } catch (error) {
      console.error("❌ Fee Manager deployment failed:", error.message);
      console.error(error);
      // Continue anyway as this is not critical
    }

    console.log("\n📦 STEP 10: DEPLOY MULTISIG");
    try {
      // Get owners from environment variables or use default
      const owner1 = process.env.MULTISIG_OWNER_1 || deployer.address;
      const owner2 = process.env.MULTISIG_OWNER_2 || deployer.address;
      let owners = [owner1, owner2];
      
      // Add optional third owner if provided
      if (process.env.MULTISIG_OWNER_3) {
        owners.push(process.env.MULTISIG_OWNER_3);
      }
      
      const requiredConfirmations = process.env.MULTISIG_REQUIRED_CONFIRMATIONS || 2;
      
      const MultiSig = await hre.ethers.getContractFactory("RedDragonMultiSig");
      const multiSig = await MultiSig.deploy(
        owners,
        requiredConfirmations,
        {
          ...deployOptions
        }
      );
      await multiSig.deployed();
      console.log("✅ MultiSig deployed to:", multiSig.address);
      addresses.multiSig = multiSig.address;
      
      // Save after each successful deployment
      fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    } catch (error) {
      console.error("❌ MultiSig deployment failed:", error.message);
      console.error(error);
      // Continue anyway as this is not critical
    }

    console.log("\n🎮 STEP 11: SETUP SWAP-BASED JACKPOT DISTRIBUTION");
    
    // Set environment variables
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
      console.error(error);
      // Continue anyway as this is not critical
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
      console.error(error);
      // Continue anyway as this is not critical
    }

    console.log("\n🎉 DEPLOYMENT COMPLETED");
    console.log("------------------------------------------------");
    console.log("📋 KEY CONTRACT ADDRESSES:");
    console.log("- PaintSwap Verifier:", addresses.paintswapVerifier || "NOT DEPLOYED");
    console.log("- Lottery:", addresses.lottery || "NOT DEPLOYED");
    console.log("- RedDragon Token:", addresses.redDragon || "NOT DEPLOYED");
    console.log("- LP Booster:", addresses.lpBooster || "NOT DEPLOYED");
    console.log("- ve8020 Token:", addresses.ve8020 || "NOT DEPLOYED");
    console.log("- Fee Manager:", addresses.feeManager || "NOT DEPLOYED");
    console.log("- MultiSig:", addresses.multiSig || "NOT DEPLOYED");
    console.log("------------------------------------------------");
    
    console.log("\n⚠️ NEXT STEPS:");
    console.log("1. Create a liquidity pair for the RedDragon token");
    console.log("2. Set the LP token address in the lottery contract");
    console.log("3. Set the exchange pair address in the lottery contract");
    console.log("4. Transfer ownership of contracts to the MultiSig");
    console.log("5. Test the jackpot distribution with: npx hardhat run scripts/jackpot/swap-with-jackpot.js --network sonic");
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