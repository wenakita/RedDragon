const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const readline = require("readline");
require('dotenv').config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const prompt = (question) => new Promise((resolve) => rl.question(question, resolve));

/**
 * Main launch wizard function
 */
async function launchRedDragon(hre, taskArgs) {
  try {
    console.log("\n🐉 WELCOME TO THE RED DRAGON LAUNCH WIZARD 🐉\n");
    console.log("This script will guide you through the deployment process of the Dragon project.");
    console.log("Please follow the instructions carefully.\n");
    
    // Create config directory if it doesn't exist
    const configDir = path.join(__dirname, "config");
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir);
    }
    
    // Copy contract-addresses-template.json to config/contract-addresses.json if it doesn't exist
    const contractAddressesPath = path.join(configDir, "contract-addresses.json");
    const contractAddressesTemplatePath = path.join(__dirname, "contract-addresses-template.json");
    
    if (!fs.existsSync(contractAddressesPath)) {
      fs.copyFileSync(contractAddressesTemplatePath, contractAddressesPath);
    }
    
    // Check if .env file exists
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
      console.log("\n⚠️ WARNING: No .env file found ⚠️");
      console.log("It's recommended to set up a .env file with your configuration before proceeding.");
      console.log("Please refer to .env.example for the required variables.");
      
      const continueWithoutEnv = await prompt("Do you want to continue without a .env file? (y/n): ");
      if (continueWithoutEnv.toLowerCase() !== 'y') {
        console.log("Exiting the wizard. Please set up your .env file and try again.");
        rl.close();
        return;
      }
    } else {
      console.log("✅ .env file found");
    }
    
    // Initial loading of contract addresses
    let contractAddresses = JSON.parse(fs.readFileSync(contractAddressesPath, "utf8"));
    
    // Step 1: Deploy $DRAGON Token
    console.log("\n== Step 1: Deploy $DRAGON Token ==\n");
    // Check if DRAGON_TOKEN_ADDRESS is in .env
    if (process.env.DRAGON_TOKEN_ADDRESS && process.env.DRAGON_TOKEN_ADDRESS.startsWith("0x")) {
      console.log(`Found DRAGON_TOKEN_ADDRESS in .env: ${process.env.DRAGON_TOKEN_ADDRESS}`);
      const useEnvAddress = await prompt("Use this address instead of deploying a new token? (y/n): ");
      
      if (useEnvAddress.toLowerCase() === 'y') {
        contractAddresses.dragon = process.env.DRAGON_TOKEN_ADDRESS;
        fs.writeFileSync(contractAddressesPath, JSON.stringify(contractAddresses, null, 2));
        console.log(`Using DRAGON token from .env: ${process.env.DRAGON_TOKEN_ADDRESS}`);
      } else {
        await handleDragonDeployment(contractAddresses);
      }
    } else {
      await handleDragonDeployment(contractAddresses);
    }
    
    // Reload contract addresses after dragon deployment
    contractAddresses = JSON.parse(fs.readFileSync(contractAddressesPath, "utf8"));
    
    // Step 2: Create LP Pool (manual step)
    console.log("\n== Step 2: Create LP Pool ==\n");
    console.log("This step needs to be done manually through the Beets/Balancer UI:");
    console.log("1. Go to https://beets.fi and connect your wallet");
    console.log("2. Create a new liquidity pool with $DRAGON and the pair token (e.g., USDC)");
    console.log("3. Typical ratio is 69% $DRAGON / 31% pair token");
    console.log("4. Add initial liquidity to the pool");
    
    // Check if LP_TOKEN_ADDRESS is in .env
    let lpTokenAddress = "";
    if (process.env.LP_TOKEN_ADDRESS && process.env.LP_TOKEN_ADDRESS.startsWith("0x")) {
      lpTokenAddress = process.env.LP_TOKEN_ADDRESS;
      console.log(`Found LP_TOKEN_ADDRESS in .env: ${lpTokenAddress}`);
    } else {
      // Ask for LP token address
      lpTokenAddress = await prompt("\nEnter the LP token address (or press Enter to skip if not ready): ");
    }
    
    if (lpTokenAddress && lpTokenAddress.startsWith("0x")) {
      contractAddresses.lpToken = lpTokenAddress;
      fs.writeFileSync(contractAddressesPath, JSON.stringify(contractAddresses, null, 2));
      console.log(`LP token address saved: ${lpTokenAddress}`);
    } else {
      console.log("Skipping LP token address update. You can update it later in config/contract-addresses.json");
    }
    
    // Continue with remaining deployment steps, checking for environment variables...
    // Step 3: Deploy ve69LP
    console.log("\n== Step 3: Deploy ve69LP ==\n");
    if (process.env.VE69LP_ADDRESS && process.env.VE69LP_ADDRESS.startsWith("0x")) {
      console.log(`Found VE69LP_ADDRESS in .env: ${process.env.VE69LP_ADDRESS}`);
      const useEnvAddress = await prompt("Use this address instead of deploying a new ve69LP? (y/n): ");
      
      if (useEnvAddress.toLowerCase() === 'y') {
        contractAddresses.ve69LP = process.env.VE69LP_ADDRESS;
        fs.writeFileSync(contractAddressesPath, JSON.stringify(contractAddresses, null, 2));
        console.log(`Using ve69LP from .env: ${process.env.VE69LP_ADDRESS}`);
      } else {
        await handleVe69LPDeployment(contractAddresses);
      }
    } else {
      await handleVe69LPDeployment(contractAddresses);
    }
    
    // Reload contract addresses
    contractAddresses = JSON.parse(fs.readFileSync(contractAddressesPath, "utf8"));
    
    // Step 4: Deploy Jackpot
    console.log("\n== Step 4: Deploy Jackpot ==\n");
    if (process.env.JACKPOT_ADDRESS && process.env.JACKPOT_ADDRESS.startsWith("0x")) {
      console.log(`Found JACKPOT_ADDRESS in .env: ${process.env.JACKPOT_ADDRESS}`);
      const useEnvAddress = await prompt("Use this address instead of deploying a new Jackpot? (y/n): ");
      
      if (useEnvAddress.toLowerCase() === 'y') {
        contractAddresses.jackpot = process.env.JACKPOT_ADDRESS;
        fs.writeFileSync(contractAddressesPath, JSON.stringify(contractAddresses, null, 2));
        console.log(`Using Jackpot from .env: ${process.env.JACKPOT_ADDRESS}`);
      } else {
        await handleJackpotDeployment(contractAddresses);
      }
    } else {
      await handleJackpotDeployment(contractAddresses);
    }
    
    // Reload contract addresses
    contractAddresses = JSON.parse(fs.readFileSync(contractAddressesPath, "utf8"));
    
    // Step 5: Deploy ve69LPBoost
    console.log("\n== Step 5: Deploy ve69LPBoost ==\n");
    if (process.env.VE69LP_BOOST_ADDRESS && process.env.VE69LP_BOOST_ADDRESS.startsWith("0x")) {
      console.log(`Found VE69LP_BOOST_ADDRESS in .env: ${process.env.VE69LP_BOOST_ADDRESS}`);
      const useEnvAddress = await prompt("Use this address instead of deploying a new ve69LPBoost? (y/n): ");
      
      if (useEnvAddress.toLowerCase() === 'y') {
        contractAddresses.ve69lpBoost = process.env.VE69LP_BOOST_ADDRESS;
        fs.writeFileSync(contractAddressesPath, JSON.stringify(contractAddresses, null, 2));
        console.log(`Using ve69LPBoost from .env: ${process.env.VE69LP_BOOST_ADDRESS}`);
      } else {
        await handleVe69LPBoostDeployment(contractAddresses);
      }
    } else {
      await handleVe69LPBoostDeployment(contractAddresses);
    }
    
    // Reload contract addresses
    contractAddresses = JSON.parse(fs.readFileSync(contractAddressesPath, "utf8"));
    
    // Step 6: Deploy ve69LPfeedistributor
    console.log("\n== Step 6: Deploy ve69LPFeeDistributor ==\n");
    if (process.env.VE69LP_FEE_DISTRIBUTOR_ADDRESS && process.env.VE69LP_FEE_DISTRIBUTOR_ADDRESS.startsWith("0x")) {
      console.log(`Found VE69LP_FEE_DISTRIBUTOR_ADDRESS in .env: ${process.env.VE69LP_FEE_DISTRIBUTOR_ADDRESS}`);
      const useEnvAddress = await prompt("Use this address instead of deploying a new ve69LPFeeDistributor? (y/n): ");
      
      if (useEnvAddress.toLowerCase() === 'y') {
        contractAddresses.ve69LPFeeDistributor = process.env.VE69LP_FEE_DISTRIBUTOR_ADDRESS;
        fs.writeFileSync(contractAddressesPath, JSON.stringify(contractAddresses, null, 2));
        console.log(`Using ve69LPFeeDistributor from .env: ${process.env.VE69LP_FEE_DISTRIBUTOR_ADDRESS}`);
      } else {
        await handleVe69LPFeeDistributorDeployment(contractAddresses);
      }
    } else {
      await handleVe69LPFeeDistributorDeployment(contractAddresses);
    }
    
    // Reload contract addresses
    contractAddresses = JSON.parse(fs.readFileSync(contractAddressesPath, "utf8"));
    
    // Step 7: Deploy DragonLotterySwap
    console.log("\n== Step 7: Deploy DragonLotterySwap ==\n");
    if (process.env.DRAGON_LOTTERY_SWAP_ADDRESS && process.env.DRAGON_LOTTERY_SWAP_ADDRESS.startsWith("0x")) {
      console.log(`Found DRAGON_LOTTERY_SWAP_ADDRESS in .env: ${process.env.DRAGON_LOTTERY_SWAP_ADDRESS}`);
      const useEnvAddress = await prompt("Use this address instead of deploying a new DragonLotterySwap? (y/n): ");
      
      if (useEnvAddress.toLowerCase() === 'y') {
        contractAddresses.dragonLotterySwap = process.env.DRAGON_LOTTERY_SWAP_ADDRESS;
        fs.writeFileSync(contractAddressesPath, JSON.stringify(contractAddresses, null, 2));
        console.log(`Using DragonLotterySwap from .env: ${process.env.DRAGON_LOTTERY_SWAP_ADDRESS}`);
      } else {
        await handleDragonLotterySwapDeployment(contractAddresses);
      }
    } else {
      await handleDragonLotterySwapDeployment(contractAddresses);
    }
    
    // Reload contract addresses
    contractAddresses = JSON.parse(fs.readFileSync(contractAddressesPath, "utf8"));
    
    // Step 8: Deploy DragonPartnerRegistry
    console.log("\n== Step 8: Deploy DragonPartnerRegistry ==\n");
    if (process.env.PARTNER_REGISTRY_ADDRESS && process.env.PARTNER_REGISTRY_ADDRESS.startsWith("0x")) {
      console.log(`Found PARTNER_REGISTRY_ADDRESS in .env: ${process.env.PARTNER_REGISTRY_ADDRESS}`);
      const useEnvAddress = await prompt("Use this address instead of deploying a new DragonPartnerRegistry? (y/n): ");
      
      if (useEnvAddress.toLowerCase() === 'y') {
        contractAddresses.partnerRegistry = process.env.PARTNER_REGISTRY_ADDRESS;
        fs.writeFileSync(contractAddressesPath, JSON.stringify(contractAddresses, null, 2));
        console.log(`Using DragonPartnerRegistry from .env: ${process.env.PARTNER_REGISTRY_ADDRESS}`);
      } else {
        await handlePartnerRegistryDeployment(contractAddresses);
      }
    } else {
      await handlePartnerRegistryDeployment(contractAddresses);
    }
    
    // Reload contract addresses
    contractAddresses = JSON.parse(fs.readFileSync(contractAddressesPath, "utf8"));
    
    // Step 9: Deploy ve69LPPoolVoting
    console.log("\n== Step 9: Deploy ve69LPPoolVoting ==\n");
    if (process.env.VE69LP_POOL_VOTING_ADDRESS && process.env.VE69LP_POOL_VOTING_ADDRESS.startsWith("0x")) {
      console.log(`Found VE69LP_POOL_VOTING_ADDRESS in .env: ${process.env.VE69LP_POOL_VOTING_ADDRESS}`);
      const useEnvAddress = await prompt("Use this address instead of deploying a new ve69LPPoolVoting? (y/n): ");
      
      if (useEnvAddress.toLowerCase() === 'y') {
        contractAddresses.ve69LPPoolVoting = process.env.VE69LP_POOL_VOTING_ADDRESS;
        fs.writeFileSync(contractAddressesPath, JSON.stringify(contractAddresses, null, 2));
        console.log(`Using ve69LPPoolVoting from .env: ${process.env.VE69LP_POOL_VOTING_ADDRESS}`);
      } else {
        await handleVe69LPPoolVotingDeployment(contractAddresses);
      }
    } else {
      await handleVe69LPPoolVotingDeployment(contractAddresses);
    }
    
    // Reload contract addresses
    contractAddresses = JSON.parse(fs.readFileSync(contractAddressesPath, "utf8"));
    
    // Step 10: Configure All Contracts
    console.log("\n== Step 10: Configure All Contracts ==\n");
    const skipVrf = taskArgs.skipVrf || false;
    
    if (skipVrf) {
      console.log("Skipping VRF subscription funding as requested.");
    } else {
      console.log("WARNING: Before configuring, you may need to fund the VRF subscription.");
      console.log("This typically requires manual interaction with the PaintSwap VRF system.");
      const proceedWithConfig = await prompt("Do you want to proceed with configuration now? (y/n): ");
      
      if (proceedWithConfig.toLowerCase() !== 'y') {
        console.log("Configuration skipped. You can run it later with:");
        console.log("npx hardhat run deployment/configure-all.js --network sonic");
        
        console.log("\n🐉 RED DRAGON DEPLOYMENT COMPLETED! 🐉\n");
        console.log("Remember to configure the contracts after funding the VRF subscription.");
        
        rl.close();
        return;
      }
    }
    
    // Configure all contracts
    await configureAllContracts();
    
    console.log("\n🐉 RED DRAGON DEPLOYMENT AND CONFIGURATION COMPLETED! 🐉\n");
    console.log("All contracts have been deployed and configured successfully.");
    console.log("You can find the contract addresses in config/contract-addresses.json\n");
    
    rl.close();
  } catch (error) {
    console.error("Error in RED DRAGON LAUNCH WIZARD:", error);
    rl.close();
    process.exit(1);
  }
}

/**
 * Helper function to execute a script
 */
async function executeScript(scriptName) {
  return new Promise((resolve, reject) => {
    const command = `npx hardhat run deployment/${scriptName} --network sonic`;
    console.log(`Executing: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing ${scriptName}:`, error);
        return reject(error);
      }
      
      console.log(stdout);
      if (stderr) {
        console.error(stderr);
      }
      
      resolve();
    });
  });
}

/**
 * Handle Dragon token deployment with checks
 */
async function handleDragonDeployment(contractAddresses) {
  if (contractAddresses.dragon && contractAddresses.dragon !== "DRAGON_ADDRESS_HERE") {
    console.log(`$DRAGON Token already deployed at: ${contractAddresses.dragon}`);
    const redeploy = await prompt("Do you want to redeploy it? (y/n): ");
    if (redeploy.toLowerCase() !== 'y') {
      console.log("Skipping $DRAGON Token deployment.");
    } else {
      await deployDragon();
    }
  } else {
    await deployDragon();
  }
}

/**
 * Handle ve69LP deployment with checks
 */
async function handleVe69LPDeployment(contractAddresses) {
  if (contractAddresses.ve69LP && contractAddresses.ve69LP !== "VE69LP_ADDRESS_HERE") {
    console.log(`ve69LP already deployed at: ${contractAddresses.ve69LP}`);
    const redeploy = await prompt("Do you want to redeploy it? (y/n): ");
    if (redeploy.toLowerCase() !== 'y') {
      console.log("Skipping ve69LP deployment.");
    } else {
      await deployVe69LP();
    }
  } else {
    await deployVe69LP();
  }
}

/**
 * Handle Jackpot deployment with checks
 */
async function handleJackpotDeployment(contractAddresses) {
  if (contractAddresses.jackpot && contractAddresses.jackpot !== "JACKPOT_ADDRESS_HERE") {
    console.log(`Jackpot already deployed at: ${contractAddresses.jackpot}`);
    const redeploy = await prompt("Do you want to redeploy it? (y/n): ");
    if (redeploy.toLowerCase() !== 'y') {
      console.log("Skipping Jackpot deployment.");
    } else {
      await deployJackpot();
    }
  } else {
    await deployJackpot();
  }
}

/**
 * Handle ve69LPBoost deployment with checks
 */
async function handleVe69LPBoostDeployment(contractAddresses) {
  if (contractAddresses.ve69lpBoost && contractAddresses.ve69lpBoost !== "VE69LP_BOOST_ADDRESS_HERE") {
    console.log(`ve69LPBoost already deployed at: ${contractAddresses.ve69lpBoost}`);
    const redeploy = await prompt("Do you want to redeploy it? (y/n): ");
    if (redeploy.toLowerCase() !== 'y') {
      console.log("Skipping ve69LPBoost deployment.");
    } else {
      await deployVe69LPBoost();
    }
  } else {
    await deployVe69LPBoost();
  }
}

/**
 * Handle ve69LPFeeDistributor deployment with checks
 */
async function handleVe69LPFeeDistributorDeployment(contractAddresses) {
  if (contractAddresses.ve69LPFeeDistributor && contractAddresses.ve69LPFeeDistributor !== "VE69LP_FEE_DISTRIBUTOR_ADDRESS_HERE") {
    console.log(`ve69LPFeeDistributor already deployed at: ${contractAddresses.ve69LPFeeDistributor}`);
    const redeploy = await prompt("Do you want to redeploy it? (y/n): ");
    if (redeploy.toLowerCase() !== 'y') {
      console.log("Skipping ve69LPFeeDistributor deployment.");
    } else {
      await deployVe69LPFeeDistributor();
    }
  } else {
    await deployVe69LPFeeDistributor();
  }
}

/**
 * Handle DragonLotterySwap deployment with checks
 */
async function handleDragonLotterySwapDeployment(contractAddresses) {
  if (contractAddresses.dragonLotterySwap && contractAddresses.dragonLotterySwap !== "DRAGON_LOTTERY_SWAP_ADDRESS_HERE") {
    console.log(`DragonLotterySwap already deployed at: ${contractAddresses.dragonLotterySwap}`);
    const redeploy = await prompt("Do you want to redeploy it? (y/n): ");
    if (redeploy.toLowerCase() !== 'y') {
      console.log("Skipping DragonLotterySwap deployment.");
    } else {
      await deployDragonLotterySwap();
    }
  } else {
    await deployDragonLotterySwap();
  }
}

/**
 * Handle DragonPartnerRegistry deployment with checks
 */
async function handlePartnerRegistryDeployment(contractAddresses) {
  if (contractAddresses.partnerRegistry && contractAddresses.partnerRegistry !== "PARTNER_REGISTRY_ADDRESS_HERE") {
    console.log(`DragonPartnerRegistry already deployed at: ${contractAddresses.partnerRegistry}`);
    const redeploy = await prompt("Do you want to redeploy it? (y/n): ");
    if (redeploy.toLowerCase() !== 'y') {
      console.log("Skipping DragonPartnerRegistry deployment.");
    } else {
      await deployPartnerRegistry();
    }
  } else {
    await deployPartnerRegistry();
  }
}

/**
 * Handle ve69LPPoolVoting deployment with checks
 */
async function handleVe69LPPoolVotingDeployment(contractAddresses) {
  if (contractAddresses.ve69LPPoolVoting && contractAddresses.ve69LPPoolVoting !== "VE69LP_POOL_VOTING_ADDRESS_HERE") {
    console.log(`ve69LPPoolVoting already deployed at: ${contractAddresses.ve69LPPoolVoting}`);
    const redeploy = await prompt("Do you want to redeploy it? (y/n): ");
    if (redeploy.toLowerCase() !== 'y') {
      console.log("Skipping ve69LPPoolVoting deployment.");
    } else {
      await deployVe69LPPoolVoting();
    }
  } else {
    await deployVe69LPPoolVoting();
  }
}

/**
 * Deploy Dragon token
 */
async function deployDragon() {
  await executeScript("deploy-dragon.js");
}

/**
 * Deploy ve69LP
 */
async function deployVe69LP() {
  await executeScript("deploy-ve69lp.js");
}

/**
 * Deploy Jackpot
 */
async function deployJackpot() {
  await executeScript("deploy-jackpot-vault.js");
}

/**
 * Deploy ve69LPBoost
 */
async function deployVe69LPBoost() {
  await executeScript("deploy-ve69lpboost.js");
}

/**
 * Deploy ve69LPFeeDistributor
 */
async function deployVe69LPFeeDistributor() {
  await executeScript("deploy-feedistributor.js");
}

/**
 * Deploy DragonLotterySwap
 */
async function deployDragonLotterySwap() {
  await executeScript("deploy-lotteryswap.js");
}

/**
 * Deploy DragonPartnerRegistry
 */
async function deployPartnerRegistry() {
  await executeScript("scripts/deploy/deploy-partner-registry.js");
}

/**
 * Deploy ve69LPPoolVoting
 */
async function deployVe69LPPoolVoting() {
  await executeScript("scripts/deploy/deploy-ve69lp-pool-voting.js");
}

/**
 * Configure all contracts
 */
async function configureAllContracts() {
  await executeScript("configure-all.js");
}

// Export the function for the Hardhat task
module.exports = launchRedDragon; 