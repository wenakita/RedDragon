const hre = require("hardhat");
const fs = require('fs');
const path = require('path');
require("dotenv").config();

/**
 * Deploy the complete RedDragon system with swap-based jackpot distribution
 */
async function main() {
  console.log("🚀 Deploying complete RedDragon system with swap-based jackpot distribution...");
  console.log("📡 Using chain ID: 146 (Sonic)");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);
    const deployerBalance = await deployer.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", hre.ethers.utils.formatEther(deployerBalance), "wS");

    // Initialize deployment addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    let addresses = {};
    
    try {
      if (fs.existsSync(deploymentFile)) {
        addresses = JSON.parse(fs.readFileSync(deploymentFile));
        console.log("📝 Loaded existing deployment addresses");
      } else {
        console.log("Creating new deployment addresses file");
        // Initialize with default values
        addresses = {
          wrappedSonic: process.env.WRAPPED_SONIC_ADDRESS || "0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38",
          burnAddress: process.env.BURN_ADDRESS || "0x000000000000000000000000000000000000dEaD"
        };
      }
    } catch (error) {
      console.error("❌ Error loading/initializing deployment addresses:", error);
      return;
    }

    // Step 1: Deploy PaintSwap VRF Verifier
    console.log("\n📦 Deploying PaintSwap VRF Verifier...");
    const PaintSwapVerifier = await hre.ethers.getContractFactory("RedDragonPaintSwapVerifier");
    const verifier = await PaintSwapVerifier.deploy();
    await verifier.deployed();
    console.log("✅ PaintSwap VRF Verifier deployed to:", verifier.address);
    addresses.paintswapVerifier = verifier.address;

    // Step 2: Deploy RedDragonSwapLottery with swap-based jackpot distribution
    console.log("\n📦 Deploying RedDragonSwapLottery with swap-based jackpot distribution...");
    const RedDragonSwapLottery = await hre.ethers.getContractFactory("RedDragonSwapLottery");
    const lottery = await RedDragonSwapLottery.deploy(
      addresses.wrappedSonic,
      verifier.address
    );
    await lottery.deployed();
    console.log("✅ RedDragonSwapLottery deployed to:", lottery.address);
    addresses.lottery = lottery.address;

    // Step 3: Deploy RedDragon token
    console.log("\n📦 Deploying RedDragon token...");
    const RedDragon = await hre.ethers.getContractFactory("RedDragon");
    const redDragon = await RedDragon.deploy(
      lottery.address,  // Lottery address
      addresses.wrappedSonic // Wrapped Sonic address
    );
    await redDragon.deployed();
    console.log("✅ RedDragon token deployed to:", redDragon.address);
    addresses.redDragon = redDragon.address;

    // Step 4: Configure lottery with token contract
    console.log("\n⚙️ Configuring lottery with token contract...");
    const setTokenTx = await lottery.setTokenContract(redDragon.address);
    await setTokenTx.wait();
    console.log("✅ Lottery configured with token contract");

    // Step 5: Deploy LP Booster
    console.log("\n📦 Deploying LP Booster...");
    const LpBooster = await hre.ethers.getContractFactory("RedDragonLPBooster");
    const lpBooster = await LpBooster.deploy(lottery.address);
    await lpBooster.deployed();
    console.log("✅ LP Booster deployed to:", lpBooster.address);
    addresses.lpBooster = lpBooster.address;

    // Step 6: Configure lottery with LP Booster
    console.log("\n⚙️ Setting LP Booster in lottery...");
    const setBoosterTx = await lottery.setLPBooster(lpBooster.address);
    await setBoosterTx.wait();
    console.log("✅ Lottery configured with LP Booster");

    // Step 7: Deploy ve8020 token if needed
    if (!addresses.ve8020) {
      console.log("\n📦 Deploying ve8020 token...");
      const Ve8020 = await hre.ethers.getContractFactory("ve8020");
      const ve8020 = await Ve8020.deploy(redDragon.address);
      await ve8020.deployed();
      console.log("✅ ve8020 token deployed to:", ve8020.address);
      addresses.ve8020 = ve8020.address;

      // Configure lottery with voting token
      console.log("\n⚙️ Setting voting token in lottery...");
      const setVotingTx = await lottery.setVotingToken(ve8020.address);
      await setVotingTx.wait();
      console.log("✅ Lottery configured with voting token");
    }

    // Step 8: Deploy Fee Manager
    console.log("\n📦 Deploying Fee Manager...");
    const FeeManager = await hre.ethers.getContractFactory("RedDragonFeeManager");
    const feeManager = await FeeManager.deploy(
      addresses.redDragon,
      addresses.wrappedSonic,
      addresses.burnAddress
    );
    await feeManager.deployed();
    console.log("✅ Fee Manager deployed to:", feeManager.address);
    addresses.feeManager = feeManager.address;

    // Step 9: Deploy MultiSig if needed
    if (!addresses.multiSig) {
      console.log("\n📦 Deploying MultiSig...");
      
      // Get owners from environment variables or use default
      const owner1 = process.env.MULTISIG_OWNER_1 || deployer.address;
      const owner2 = process.env.MULTISIG_OWNER_2 || deployer.address;
      let owners = [owner1, owner2];
      
      // Add optional third owner if provided
      if (process.env.MULTISIG_OWNER_3) {
        owners.push(process.env.MULTISIG_OWNER_3);
      }
      
      // Required confirmations
      const requiredConfirmations = process.env.MULTISIG_REQUIRED_CONFIRMATIONS || 2;
      
      const MultiSig = await hre.ethers.getContractFactory("RedDragonMultiSig");
      const multiSig = await MultiSig.deploy(
        owners,
        requiredConfirmations
      );
      await multiSig.deployed();
      console.log("✅ MultiSig deployed to:", multiSig.address);
      addresses.multiSig = multiSig.address;
    }

    // Step 10: Save deployment addresses
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    console.log("\n📝 Saved deployment addresses to", deploymentFile);

    // Step 11: Configure the swap-based jackpot distribution system
    console.log("\n🎮 Setting up swap-based jackpot distribution system...");
    
    // Create or update environment configuration
    console.log("\n⚙️ Updating environment configuration...");
    
    // Read .env file if it exists
    const envPath = path.join(__dirname, '..', '..', '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Update or add jackpot configuration
    const minJackpotAmount = process.env.MIN_JACKPOT_AMOUNT || "100";
    
    // Check if MIN_JACKPOT_AMOUNT already exists in the .env file
    if (envContent.includes('MIN_JACKPOT_AMOUNT=')) {
      console.log("MIN_JACKPOT_AMOUNT already set in .env file");
    } else {
      // Add MIN_JACKPOT_AMOUNT to .env file
      envContent += `\n# Auto Jackpot Distribution Configuration\nMIN_JACKPOT_AMOUNT="${minJackpotAmount}"\n`;
      fs.writeFileSync(envPath, envContent);
      console.log("✅ Added MIN_JACKPOT_AMOUNT to .env file");
    }
    
    // Set the lottery contract address in .env
    if (!envContent.includes('LOTTERY_CONTRACT_ADDRESS=')) {
      envContent += `LOTTERY_CONTRACT_ADDRESS="${addresses.lottery}"\n`;
      fs.writeFileSync(envPath, envContent);
      console.log("✅ Added LOTTERY_CONTRACT_ADDRESS to .env file");
    }
    
    // Set the RedDragon address in .env
    if (!envContent.includes('REDDRAGON_ADDRESS=')) {
      envContent += `REDDRAGON_ADDRESS="${addresses.redDragon}"\n`;
      fs.writeFileSync(envPath, envContent);
      console.log("✅ Added REDDRAGON_ADDRESS to .env file");
    }

    // Copy jackpot distribution scripts to the jackpot directory
    const sourcePath = path.join(__dirname, '..', '..', 'scripts');
    const scriptPaths = [
      'autodistribute-jackpot.js',
      'swap-with-jackpot.js'
    ];

    // Create jackpot directory if it doesn't exist
    const jackpotDir = path.join(sourcePath, 'jackpot');
    if (!fs.existsSync(jackpotDir)) {
      fs.mkdirSync(jackpotDir, { recursive: true });
      console.log("📁 Created jackpot directory:", jackpotDir);
    }

    // Copy scripts to jackpot directory
    for (const scriptName of scriptPaths) {
      const sourceFile = path.join(sourcePath, scriptName);
      const destFile = path.join(jackpotDir, scriptName);
      
      if (fs.existsSync(sourceFile)) {
        fs.copyFileSync(sourceFile, destFile);
        console.log(`📋 Copied ${scriptName} to jackpot directory`);
      } else {
        console.error(`❌ Script file not found: ${sourceFile}`);
      }
    }

    // Create jackpot README if it doesn't exist
    const readmePath = path.join(jackpotDir, 'README.md');
    if (!fs.existsSync(readmePath)) {
      const readmeContent = `# RedDragon Swap-Based Jackpot System

This directory contains scripts for the dynamic swap-based jackpot distribution system.

## Chain Information

- **Chain ID**: 146 (Sonic)

## Files

- \`autodistribute-jackpot.js\` - Core module for checking and distributing jackpots
- \`swap-with-jackpot.js\` - Example implementation showing integration with swaps

## How to Use

### Checking Jackpot Conditions

To check if a jackpot should be distributed:

\`\`\`javascript
const { checkAndDistributeJackpot } = require('./jackpot/autodistribute-jackpot');

// Check jackpot after a swap
const jackpotResult = await checkAndDistributeJackpot({
  lotteryAddress: process.env.LOTTERY_CONTRACT_ADDRESS,
  signer: adminWallet,
  chainId: 146  // Explicitly specify Sonic chain ID
});

if (jackpotResult.success && jackpotResult.distributed) {
  console.log("Jackpot distributed!");
}
\`\`\`

### Testing

Test the jackpot distribution with:

\`\`\`bash
npx hardhat run scripts/jackpot/swap-with-jackpot.js --network sonic
\`\`\`

See \`JACKPOT-DISTRIBUTION.md\` in the root directory for full documentation.`;

      fs.writeFileSync(readmePath, readmeContent);
      console.log("📝 Created jackpot README file");
    }

    // Step 12: Next steps info
    console.log("\n⚠️ NOTE: After deployment, you'll need to:");
    console.log("1. Create a liquidity pair for the RedDragon token");
    console.log("2. Set the LP token address in the lottery contract");
    console.log("3. Set the exchange pair address in the lottery contract");
    console.log("4. Transfer ownership of contracts to the MultiSig");
    console.log("5. Test the jackpot distribution with: npx hardhat run scripts/jackpot/swap-with-jackpot.js --network sonic");

    console.log("\n🎉 Full deployment with swap-based jackpot distribution completed successfully!");
    
    // Print key addresses
    console.log("\n📋 Key Contract Addresses:");
    console.log("- RedDragon Token:", addresses.redDragon);
    console.log("- Lottery:", addresses.lottery);
    console.log("- PaintSwap Verifier:", addresses.paintswapVerifier);
    console.log("- LP Booster:", addresses.lpBooster);
    console.log("- ve8020 Token:", addresses.ve8020);
    console.log("- Fee Manager:", addresses.feeManager);
    console.log("- MultiSig:", addresses.multiSig);
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 