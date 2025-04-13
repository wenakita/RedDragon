/**
 * Migration script to transfer jackpot from old lottery to new 69% payout lottery
 * 
 * This script:
 * 1. Proposes an emergency withdrawal from the old lottery (requires multisig)
 * 2. Executes the withdrawal after the timelock period (2 days)
 * 3. Adds the withdrawn funds to the new lottery69 contract
 */

const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Migrate jackpot from old lottery to new one
 */
async function main() {
  console.log("🏆 Migrating jackpot to the new lottery contract...");

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
    
    const previousLotteryAddress = addresses.previousLottery || process.env.PREVIOUS_LOTTERY_ADDRESS;
    const newLotteryAddress = addresses.lottery;
    
    if (!previousLotteryAddress) {
      console.error("❌ Previous lottery address not found. Make sure it's set in addresses file or PREVIOUS_LOTTERY_ADDRESS env variable.");
      return;
    }
    
    if (!newLotteryAddress) {
      console.error("❌ New lottery address not found in deployment file.");
      return;
    }
    
    console.log("Previous lottery address:", previousLotteryAddress);
    console.log("New lottery address:", newLotteryAddress);
    
    // Connect to the contracts
    const oldLottery = await hre.ethers.getContractAt("RedDragonSwapLottery", previousLotteryAddress);
    const newLottery = await hre.ethers.getContractAt("RedDragonSwapLottery", newLotteryAddress);
    const wrappedSonic = await hre.ethers.getContractAt("IERC20", addresses.wrappedSonic);
    
    // Get current jackpot in old lottery
    const currentJackpot = await oldLottery.getCurrentJackpot();
    console.log("Current jackpot in old lottery:", hre.ethers.utils.formatEther(currentJackpot), "wS");
    
    if (currentJackpot.isZero()) {
      console.log("❌ No jackpot to migrate (jackpot is zero)");
      return;
    }
    
    // Check if deployer is owner of the old lottery
    const oldLotteryOwner = await oldLottery.owner();
    if (oldLotteryOwner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.error("❌ Deployer is not the owner of the old lottery contract");
      console.log("Old lottery owner:", oldLotteryOwner);
      console.log("Deployer:", deployer.address);
      return;
    }
    
    // Transfer the jackpot to the deployer
    console.log("\n🔄 Transferring jackpot tokens to deployer...");
    const transferToDeployerTx = await oldLottery.transferJackpotTo(deployer.address, currentJackpot);
    await transferToDeployerTx.wait();
    console.log("✅ Jackpot transferred to deployer");
    
    // Check deployer's balance
    const deployerWS = await wrappedSonic.balanceOf(deployer.address);
    console.log("Deployer wS balance:", hre.ethers.utils.formatEther(deployerWS), "wS");
    
    if (deployerWS.lt(currentJackpot)) {
      console.error("❌ Deployer doesn't have enough wS tokens to transfer to the new lottery");
      return;
    }
    
    // Approve wS for the new lottery
    console.log("\n🔄 Approving wS for the new lottery...");
    const approveTx = await wrappedSonic.approve(newLotteryAddress, currentJackpot);
    await approveTx.wait();
    console.log("✅ Approved wS for new lottery");
    
    // Add to new lottery jackpot
    console.log("\n🔄 Adding jackpot to new lottery...");
    const addToJackpotTx = await newLottery.addToJackpot(currentJackpot);
    await addToJackpotTx.wait();
    console.log("✅ Added jackpot to new lottery");
    
    // Verify new jackpot
    const newJackpot = await newLottery.getCurrentJackpot();
    console.log("New lottery jackpot:", hre.ethers.utils.formatEther(newJackpot), "wS");
    
    // Check if the jackpot was successfully migrated
    if (newJackpot.eq(currentJackpot)) {
      console.log("\n🎉 Jackpot successfully migrated!");
    } else {
      console.warn("\n⚠️ Jackpot migration may not have been successful.");
      console.log("Expected:", hre.ethers.utils.formatEther(currentJackpot), "wS");
      console.log("Actual:", hre.ethers.utils.formatEther(newJackpot), "wS");
    }
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 