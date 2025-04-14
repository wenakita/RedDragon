/**
 * Verification script for wS rewards in Ve8020FeeDistributor
 * 
 * This script:
 * 1. Connects to deployed contracts
 * 2. Adds wS rewards to the fee distributor
 * 3. Creates ve8020 locks for test users (if they don't exist already)
 * 4. Advances time to simulate epoch transitions
 * 5. Claims rewards to verify they are distributed in wS tokens
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Load deployment info
  const deploymentPath = path.join(__dirname, "../../deployments/deployment-localhost.json");
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ Deployment file not found. Deploy contracts first.");
    process.exit(1);
  }
  
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const addresses = deploymentInfo.contracts;
  
  // Get signers
  const [owner, user1, user2] = await ethers.getSigners();
  console.log("Using accounts:");
  console.log("- Owner:", owner.address);
  console.log("- User1:", user1.address);
  console.log("- User2:", user2.address);
  
  // Connect to contracts
  console.log("\n📄 Connecting to deployed contracts...");
  const redDragon = await ethers.getContractAt("MockERC20", addresses.RedDragon);
  const wrappedSonic = await ethers.getContractAt("MockERC20", addresses.wrappedSonic);
  const ve8020Token = await ethers.getContractAt("ve8020", addresses.ve8020);
  const feeDistributor = await ethers.getContractAt("Ve8020FeeDistributor", addresses.Ve8020FeeDistributor);
  
  console.log("- RedDragon:", redDragon.address);
  console.log("- wrappedSonic:", wrappedSonic.address);
  console.log("- ve8020:", ve8020Token.address);
  console.log("- Ve8020FeeDistributor:", feeDistributor.address);
  
  // Check if users already have locks
  console.log("\n🔍 Checking if users already have ve8020 locks...");
  let user1HasLock = false;
  let user2HasLock = false;
  try {
    const user1Lock = await ve8020Token.locked(user1.address);
    user1HasLock = user1Lock.amount.gt(0);
    console.log(`- User1 ${user1HasLock ? 'has' : 'does not have'} a lock`);
  } catch (e) {
    console.log("- User1 does not have a lock");
  }
  
  try {
    const user2Lock = await ve8020Token.locked(user2.address);
    user2HasLock = user2Lock.amount.gt(0);
    console.log(`- User2 ${user2HasLock ? 'has' : 'does not have'} a lock`);
  } catch (e) {
    console.log("- User2 does not have a lock");
  }
  
  // Create locks if they don't exist
  if (!user1HasLock || !user2HasLock) {
    // Transfer tokens to users
    console.log("\n💰 Transferring tokens to users...");
    
    // Send RedDragon tokens to users for locking
    if (!user1HasLock) {
      await redDragon.transfer(user1.address, ethers.utils.parseEther("10000"));
      console.log("- Sent 10,000 RedDragon to user1");
    }
    
    if (!user2HasLock) {
      await redDragon.transfer(user2.address, ethers.utils.parseEther("5000"));
      console.log("- Sent 5,000 RedDragon to user2");
    }
    
    // Lock tokens in ve8020
    console.log("\n🔒 Creating ve8020 locks...");
    
    // Get current time and set lock duration to 1 year
    const currentTime = (await ethers.provider.getBlock('latest')).timestamp;
    const lockDuration = 365 * 24 * 60 * 60; // 1 year in seconds
    const unlockTime = currentTime + lockDuration;
    
    // Approve and lock tokens for user1
    if (!user1HasLock) {
      await redDragon.connect(user1).approve(ve8020Token.address, ethers.utils.parseEther("10000"));
      await ve8020Token.connect(user1).createLock(ethers.utils.parseEther("10000"), unlockTime);
      console.log("- User1 locked 10,000 tokens for 1 year");
    }
    
    // Approve and lock tokens for user2
    if (!user2HasLock) {
      await redDragon.connect(user2).approve(ve8020Token.address, ethers.utils.parseEther("5000"));
      await ve8020Token.connect(user2).createLock(ethers.utils.parseEther("5000"), unlockTime);
      console.log("- User2 locked 5,000 tokens for 1 year");
    }
  } else {
    console.log("- Both users already have locks, skipping token transfer and lock creation");
  }
  
  // Check voting power
  const user1VotingPower = await ve8020Token.balanceOf(user1.address);
  const user2VotingPower = await ve8020Token.balanceOf(user2.address);
  console.log(`- User1 voting power: ${ethers.utils.formatEther(user1VotingPower)}`);
  console.log(`- User2 voting power: ${ethers.utils.formatEther(user2VotingPower)}`);
  
  // Add rewards to the fee distributor
  console.log("\n💧 Adding wS rewards to fee distributor...");
  const rewardAmount = ethers.utils.parseEther("1000");
  await wrappedSonic.approve(feeDistributor.address, rewardAmount);
  await feeDistributor.addRewards(rewardAmount);
  console.log(`- Added ${ethers.utils.formatEther(rewardAmount)} wS tokens as rewards`);
  
  // Get current epoch info
  const epochInfo = await feeDistributor.getCurrentEpochInfo();
  console.log(`- Current epoch: ${epochInfo[0]}`);
  console.log(`- Epoch start time: ${new Date(epochInfo[1] * 1000).toISOString()}`);
  console.log(`- Time until next epoch: ${epochInfo[2] / 3600} hours`);
  
  // Advance time to next epoch to allow claiming
  console.log("\n⏱️ Advancing time to next epoch...");
  const epochDuration = 7 * 24 * 60 * 60; // 7 days
  await ethers.provider.send("evm_increaseTime", [epochDuration]);
  await ethers.provider.send("evm_mine");
  
  // Force epoch advancement
  await feeDistributor.checkAdvanceEpoch();
  
  // Get updated epoch info
  const newEpochInfo = await feeDistributor.getCurrentEpochInfo();
  console.log(`- New epoch: ${newEpochInfo[0]}`);
  
  // Check total voting power and rewards for the epoch
  console.log("\n🔍 Checking epoch details...");
  try {
    const totalVotingPower = await feeDistributor.epochTotalVotingPower(0);
    console.log(`- Total voting power for epoch 0: ${ethers.utils.formatEther(totalVotingPower)}`);
  } catch (error) {
    console.log(`- Error getting total voting power: ${error.message}`);
  }
  
  try {
    const epochRewards = await feeDistributor.epochRewards(0);
    console.log(`- Total rewards for epoch 0: ${ethers.utils.formatEther(epochRewards)}`);
  } catch (error) {
    console.log(`- Error getting epoch rewards: ${error.message}`);
  }
  
  // Check user wS balances before claiming
  const user1BalanceBefore = await wrappedSonic.balanceOf(user1.address);
  const user2BalanceBefore = await wrappedSonic.balanceOf(user2.address);
  
  console.log("\n🎯 Claiming rewards...");
  console.log(`- User1 wS balance before: ${ethers.utils.formatEther(user1BalanceBefore)}`);
  console.log(`- User2 wS balance before: ${ethers.utils.formatEther(user2BalanceBefore)}`);
  
  // Claim rewards for epoch 0
  try {
    await feeDistributor.connect(user1).claimRewards(0);
    console.log("- User1 claimed rewards successfully");
  } catch (error) {
    console.log(`- User1 claim failed: ${error.message}`);
  }
  
  try {
    await feeDistributor.connect(user2).claimRewards(0);
    console.log("- User2 claimed rewards successfully");
  } catch (error) {
    console.log(`- User2 claim failed: ${error.message}`);
  }
  
  // Check user wS balances after claiming
  const user1BalanceAfter = await wrappedSonic.balanceOf(user1.address);
  const user2BalanceAfter = await wrappedSonic.balanceOf(user2.address);
  
  console.log(`- User1 wS balance after: ${ethers.utils.formatEther(user1BalanceAfter)}`);
  console.log(`- User2 wS balance after: ${ethers.utils.formatEther(user2BalanceAfter)}`);
  console.log(`- User1 received: ${ethers.utils.formatEther(user1BalanceAfter.sub(user1BalanceBefore))} wS tokens`);
  console.log(`- User2 received: ${ethers.utils.formatEther(user2BalanceAfter.sub(user2BalanceBefore))} wS tokens`);
  
  // Verify rewards are distributed proportionally to voting power
  console.log("\n✅ Verification results:");
  
  const user1Reward = user1BalanceAfter.sub(user1BalanceBefore);
  const user2Reward = user2BalanceAfter.sub(user2BalanceBefore);
  const totalRewardsDistributed = user1Reward.add(user2Reward);
  
  if (totalRewardsDistributed.isZero()) {
    console.log("❌ No rewards were distributed. This might be because users already claimed for this epoch.");
  } else {
    // User1 should get roughly 2/3 of rewards (10000 / 15000)
    // User2 should get roughly 1/3 of rewards (5000 / 15000)
    const user1Percentage = user1Reward.mul(100).div(totalRewardsDistributed);
    const user2Percentage = user2Reward.mul(100).div(totalRewardsDistributed);
    
    console.log(`- Total wS rewards distributed: ${ethers.utils.formatEther(totalRewardsDistributed)}`);
    console.log(`- User1 received ~${user1Percentage}% of rewards`);
    console.log(`- User2 received ~${user2Percentage}% of rewards`);
    
    if (user1Percentage.gte(60) && user1Percentage.lte(70) &&
        user2Percentage.gte(30) && user2Percentage.lte(40)) {
      console.log("\n✅ Success! Rewards were distributed in wS tokens proportionally to voting power.");
    } else {
      console.log("\n❌ Test failed! Rewards were not distributed as expected.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed!");
    console.error(error);
    process.exit(1);
  }); 