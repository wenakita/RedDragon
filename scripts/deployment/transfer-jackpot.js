const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Transfer jackpot fees from your wallet to the lottery contract
 * Since jackpotVault is set to your wallet, this script helps manually transfer the fees
 */
async function main() {
  console.log("💰 Transferring jackpot fees to lottery contract...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);
    
    // Load deployment addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    let addresses = {};
    try {
      addresses = JSON.parse(fs.readFileSync(deploymentFile));
      console.log("📝 Loaded deployment addresses");
    } catch (error) {
      console.error("❌ Error loading deployment addresses:", error);
      return;
    }
    
    // Check for required addresses
    if (!addresses.redDragon) {
      console.error("❌ RedDragon token address not found in deployment file");
      return;
    }
    
    if (!addresses.lottery) {
      console.error("❌ Lottery address not found in deployment file");
      return;
    }
    
    if (!addresses.wrappedSonic) {
      console.error("❌ WrappedSonic address not found in deployment file");
      return;
    }
    
    console.log("\n📋 Contract addresses:");
    console.log(`- RedDragon: ${addresses.redDragon}`);
    console.log(`- Lottery: ${addresses.lottery}`);
    console.log(`- WrappedSonic: ${addresses.wrappedSonic}`);
    
    // Connect to contracts
    const wrappedSonic = await hre.ethers.getContractAt("IERC20", addresses.wrappedSonic);
    const lottery = await hre.ethers.getContractAt("RedDragonSwapLottery", addresses.lottery);
    
    // Check wS balance of deployer (jackpot fees collected here)
    const wSBalance = await wrappedSonic.balanceOf(deployer.address);
    console.log(`\n💰 Your wS balance: ${hre.ethers.utils.formatEther(wSBalance)} wS`);
    
    // Check current jackpot amount
    const currentJackpot = await lottery.jackpot();
    console.log(`🏆 Current jackpot amount: ${hre.ethers.utils.formatEther(currentJackpot)} wS`);
    
    // Ask for amount to transfer
    const transferAmount = process.env.JACKPOT_TRANSFER_AMOUNT 
      ? hre.ethers.utils.parseEther(process.env.JACKPOT_TRANSFER_AMOUNT)
      : wSBalance;
    
    console.log(`\n🔄 Transferring ${hre.ethers.utils.formatEther(transferAmount)} wS to lottery contract...`);
    
    // First approve the lottery contract to spend wS
    console.log("- Approving lottery contract...");
    const approveTx = await wrappedSonic.approve(addresses.lottery, transferAmount);
    await approveTx.wait();
    console.log("✅ Approval successful");
    
    // Transfer to lottery contract
    console.log("- Transferring wS to lottery jackpot...");
    const transferTx = await lottery.increaseJackpot(transferAmount);
    await transferTx.wait();
    console.log("✅ Transfer successful");
    
    // Verify transfer
    const newJackpot = await lottery.jackpot();
    console.log(`\n🏆 New jackpot amount: ${hre.ethers.utils.formatEther(newJackpot)} wS`);
    console.log(`💰 Jackpot increased by: ${hre.ethers.utils.formatEther(newJackpot.sub(currentJackpot))} wS`);
    
    console.log("\n🎉 Jackpot transfer completed!");
    
  } catch (error) {
    console.error("❌ Transfer error:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Script error:", error);
    process.exit(1);
  }); 