const hre = require("hardhat");
const fs = require('fs');
const path = require('path');
require("dotenv").config();

/**
 * Deploy the dynamic swap-based jackpot distribution system
 */
async function main() {
  console.log("🎮 Deploying dynamic swap-based jackpot distribution system...");
  console.log("📡 Using chain ID: 146");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);
    const deployerBalance = await deployer.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", hre.ethers.utils.formatEther(deployerBalance), "wS");

    // Load deployment addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    let addresses = {};
    
    try {
      if (fs.existsSync(deploymentFile)) {
        addresses = JSON.parse(fs.readFileSync(deploymentFile));
        console.log("📝 Loaded existing deployment addresses");
      } else {
        console.error("❌ No deployment addresses file found");
        return;
      }
    } catch (error) {
      console.error("❌ Error loading deployment addresses:", error);
      return;
    }

    // Verify required addresses exist
    if (!addresses.lottery) {
      console.error("❌ Lottery contract address not found in deployment addresses");
      return;
    }

    if (!addresses.redDragon) {
      console.error("❌ RedDragon token address not found in deployment addresses");
      return;
    }

    console.log("Using lottery address:", addresses.lottery);
    console.log("Using RedDragon address:", addresses.redDragon);
    console.log("Using chain ID: 146");

    // Copy script files to the right places
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

    // Create or update configuration
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

    // Test jackpot distribution
    console.log("\n🧪 Testing jackpot distribution...");
    
    // Import the checkAndDistributeJackpot function
    const { checkAndDistributeJackpot } = require('../jackpot/autodistribute-jackpot');
    
    // Test jackpot check (without actually distributing)
    const testResult = await checkAndDistributeJackpot({
      lotteryAddress: addresses.lottery,
      signer: deployer,
      // Pass a high min amount to ensure it doesn't actually distribute
      minAmount: "1000000",
      chainId: 146
    });
    
    console.log("Test result:", testResult);
    
    if (testResult.success) {
      console.log("✅ Jackpot check test successful");
    } else {
      console.error("❌ Jackpot check test failed:", testResult.error);
    }

    console.log("\n🎮 Documentation for the swap-based jackpot system:");
    console.log("1. Check JACKPOT-DISTRIBUTION.md for implementation details");
    console.log("2. Test with: npx hardhat run scripts/jackpot/swap-with-jackpot.js --network sonic");
    console.log("3. Integration: Use scripts/jackpot/autodistribute-jackpot.js in your swap functions");
    console.log("4. Chain ID: 146 is used for all operations");
    
    console.log("\n🎉 Dynamic swap-based jackpot distribution system deployed successfully!");
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