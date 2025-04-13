const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Deploy the updated RedDragonSwapLottery contract with automatic jackpot distribution
 */
async function main() {
  console.log("🎮 Deploying RedDragonSwapLottery with automatic jackpot distribution...");

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

    // Deploy RedDragonSwapLottery with automatic jackpot distribution
    console.log("\n📦 Deploying RedDragonSwapLottery with automatic jackpot distribution...");
    
    const wrappedSonic = addresses.wrappedSonic || "0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38";
    const paintSwapVerifier = addresses.paintswapVerifier;
    
    console.log("Using wS address:", wrappedSonic);
    console.log("Using PaintSwap Verifier:", paintSwapVerifier);
    
    // Check if the verifier address is set
    if (!paintSwapVerifier) {
      console.error("❌ PaintSwap Verifier address not set in deployment file");
      return;
    }
    
    const RedDragonSwapLottery = await hre.ethers.getContractFactory("RedDragonSwapLottery");
    const lottery = await RedDragonSwapLottery.deploy(
      wrappedSonic,
      paintSwapVerifier
    );
    
    await lottery.deployed();
    console.log("✅ RedDragonSwapLottery deployed to:", lottery.address);
    
    // Save previous lottery address for jackpot migration
    if (addresses.lottery) {
      const previousLotteryAddress = addresses.lottery;
      addresses.previousLottery = previousLotteryAddress;
      console.log("📝 Saved previous lottery address:", previousLotteryAddress);
    }
    
    // Save new lottery address
    addresses.lottery = lottery.address;
    
    // Configure the lottery with the same settings as before
    console.log("\n⚙️ Configuring lottery...");
    
    // Set token contract
    if (addresses.redDragon) {
      console.log("Setting token contract:", addresses.redDragon);
      await lottery.setTokenContract(addresses.redDragon);
    }
    
    // Set LP token
    if (addresses.lpToken) {
      console.log("Setting LP token:", addresses.lpToken);
      await lottery.setLPToken(addresses.lpToken);
    }
    
    // Set voting token (ve8020)
    if (addresses.ve8020) {
      console.log("Setting voting token:", addresses.ve8020);
      await lottery.setVotingToken(addresses.ve8020);
    }
    
    // Set exchange pair if it exists in the deployment addresses
    if (addresses.exchangePair) {
      console.log("Setting exchange pair:", addresses.exchangePair);
      await lottery.setExchangePair(addresses.exchangePair);
    }
    
    // Update RedDragon token to use the new lottery address
    if (addresses.redDragon) {
      try {
        console.log("Updating RedDragon token to use new lottery address...");
        const redDragon = await hre.ethers.getContractAt("RedDragon", addresses.redDragon);
        
        const currentOwner = await redDragon.owner();
        if (currentOwner.toLowerCase() === deployer.address.toLowerCase()) {
          await redDragon.setLotteryAddress(lottery.address);
          console.log("✅ RedDragon token updated to use new lottery address");
        } else {
          console.warn("⚠️ Cannot update RedDragon token - deployer is not the owner");
          console.warn("You need to call redDragon.setLotteryAddress(", lottery.address, ") from the owner account");
        }
      } catch (error) {
        console.error("❌ Error updating RedDragon token:", error.message);
      }
    }

    // Save updated addresses
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    console.log("📝 Saved updated addresses to", deploymentFile);

    console.log("\n🎉 RedDragonSwapLottery with automatic jackpot distribution deployed successfully!");
    console.log("\n⚠️ IMPORTANT: You need to migrate the jackpot from the previous lottery contract.");
    console.log("Run the jackpot migration script: npx hardhat run scripts/deployment/migrate-jackpot.js --network sonic");
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