const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

async function main() {
  console.log("🔍 Verifying Lottery setup...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);

    // Load deployment addresses
    const deploymentFile = "deployment-addresses-sonic.json";
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

    // Check Lottery Configuration
    console.log("\n🔷 Checking Lottery Configuration...");
    if (addresses.lottery) {
      const lottery = await hre.ethers.getContractAt("RedDragonSwapLottery", addresses.lottery);
      
      // Verify verifier address
      const verifierAddress = await lottery.verifier();
      console.log("Verifier Address:", verifierAddress);
      
      if (verifierAddress.toLowerCase() === addresses.paintSwapVerifier.toLowerCase()) {
        console.log("✅ Lottery is using correct PaintSwap Verifier address");
      } else {
        console.log("❌ Lottery verifier address mismatch:");
        console.log("  Expected:", addresses.paintSwapVerifier);
        console.log("  Actual:", verifierAddress);
      }

      // Verify token contract address
      const tokenContract = await lottery.tokenContract();
      console.log("Token Contract:", tokenContract);
      
      if (tokenContract.toLowerCase() === addresses.redDragon.toLowerCase()) {
        console.log("✅ Lottery is using correct token contract address");
      } else {
        console.log("❌ Lottery token contract address mismatch:");
        console.log("  Expected:", addresses.redDragon);
        console.log("  Actual:", tokenContract);
      }

      // Verify LP token address
      const lpToken = await lottery.lpToken();
      console.log("LP Token Address:", lpToken);
      
      if (lpToken.toLowerCase() === addresses.lpToken.toLowerCase()) {
        console.log("✅ Lottery is using correct LP token address");
      } else {
        console.log("❌ Lottery LP token address mismatch:");
        console.log("  Expected:", addresses.lpToken);
        console.log("  Actual:", lpToken);
      }

      // Verify voting token address
      const votingToken = await lottery.votingToken();
      console.log("Voting Token Address:", votingToken);
      
      if (votingToken.toLowerCase() === addresses.ve8020.toLowerCase()) {
        console.log("✅ Lottery is using correct voting token address");
      } else {
        console.log("❌ Lottery voting token address mismatch:");
        console.log("  Expected:", addresses.ve8020);
        console.log("  Actual:", votingToken);
      }

      // Get current jackpot
      const jackpot = await lottery.jackpot();
      console.log("Current Jackpot:", hre.ethers.formatUnits(jackpot, 18), "wS");
    } else {
      console.log("❌ No Lottery address found");
    }

    console.log("✅ Verification complete!");
  } catch (error) {
    console.error("❌ Verification failed:", error);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 