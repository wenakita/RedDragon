const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Set up liquidity and configure the exchange pair for the RedDragon system
 */
async function main() {
  console.log("🚀 Setting up liquidity and configuring exchange pair...");

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
    
    // Check for required addresses
    if (!addresses.redDragon || !addresses.lottery || !addresses.wrappedSonic) {
      console.error("❌ Missing required contract addresses in deployment file");
      console.log("Required addresses: redDragon, lottery, wrappedSonic");
      return;
    }

    // Connect to deployed contracts
    const redDragon = await hre.ethers.getContractAt("RedDragon", addresses.redDragon);
    const lottery = await hre.ethers.getContractAt("RedDragonSwapLottery", addresses.lottery);
    const wrappedSonic = await hre.ethers.getContractAt("IERC20", addresses.wrappedSonic);

    // Step 1: Create or connect to LP pair
    let lpPairAddress = addresses.lpToken;
    
    if (!lpPairAddress) {
      console.log("\n⚠️ LP pair address not found in deployment file");
      lpPairAddress = process.env.LP_TOKEN_ADDRESS;
      
      if (!lpPairAddress) {
        console.log("⚠️ LP pair address not found in environment variables");
        console.log("Please create an LP pair on your preferred DEX and provide the address");
        const promptLpAddress = prompt("Enter LP token address: ");
        
        if (!promptLpAddress) {
          console.error("❌ LP token address is required");
          return;
        }
        
        lpPairAddress = promptLpAddress;
      }
      
      // Save LP pair address
      addresses.lpToken = lpPairAddress;
      console.log("📝 Saved LP token address:", lpPairAddress);
    }
    
    // Step 2: Set LP token in lottery
    console.log("\n⚙️ Setting LP token in lottery...");
    const setLpTx = await lottery.setLPToken(lpPairAddress);
    await setLpTx.wait();
    console.log("✅ LP token set in lottery");
    
    // Step 3: Set exchange pair in lottery
    let exchangePairAddress = addresses.exchangePair;
    
    if (!exchangePairAddress) {
      console.log("\n⚠️ Exchange pair address not found in deployment file");
      exchangePairAddress = process.env.EXCHANGE_PAIR_ADDRESS;
      
      if (!exchangePairAddress) {
        console.log("⚠️ Exchange pair address not found in environment variables");
        console.log("Please provide the address of the exchange pair/router that will interact with the lottery");
        const promptExchangeAddress = prompt("Enter exchange pair address: ");
        
        if (!promptExchangeAddress) {
          console.error("❌ Exchange pair address is required");
          return;
        }
        
        exchangePairAddress = promptExchangeAddress;
      }
      
      // Save exchange pair address
      addresses.exchangePair = exchangePairAddress;
      console.log("📝 Saved exchange pair address:", exchangePairAddress);
    }
    
    console.log("\n⚙️ Setting exchange pair in lottery...");
    const setExchangeTx = await lottery.setExchangePair(exchangePairAddress);
    await setExchangeTx.wait();
    console.log("✅ Exchange pair set in lottery");
    
    // Step 4: Save updated addresses
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    console.log("\n📝 Saved updated addresses to", deploymentFile);
    
    console.log("\n✅ Liquidity setup and exchange pair configuration completed!");
    
  } catch (error) {
    console.error("❌ Setup failed:", error);
  }
}

// Helper function for prompting user input
function prompt(question) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => {
    readline.question(question, answer => {
      readline.close();
      resolve(answer);
    });
  });
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 