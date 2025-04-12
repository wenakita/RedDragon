const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Boost Simulation", function () {
  let veToken, lpToken;
  let owner, user1, user2, user3, user4;
  const WEEK = 7 * 24 * 60 * 60; // 1 week in seconds
  const YEAR = 365 * 24 * 60 * 60; // 1 year in seconds
  const MAX_LOCK = 4 * YEAR; // 4 years in seconds

  beforeEach(async function () {
    [owner, user1, user2, user3, user4] = await ethers.getSigners();
    
    // Deploy mock LP token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    lpToken = await MockERC20.deploy("80/20 LP Token", "LP8020", ethers.parseEther("1000000"));
    
    // Deploy ve8020 contract
    const Ve8020 = await ethers.getContractFactory("ve8020");
    veToken = await Ve8020.deploy(await lpToken.getAddress());
    
    // Fund users with LP tokens - total circulating is 400k (40% of supply)
    await lpToken.transfer(user1.address, ethers.parseEther("100000")); // 25% of circulating
    await lpToken.transfer(user2.address, ethers.parseEther("100000")); // 25% of circulating
    await lpToken.transfer(user3.address, ethers.parseEther("100000")); // 25% of circulating
    await lpToken.transfer(user4.address, ethers.parseEther("100000")); // 25% of circulating
    
    // Approve ve8020 contract to spend LP tokens
    await lpToken.connect(user1).approve(await veToken.getAddress(), ethers.parseEther("100000"));
    await lpToken.connect(user2).approve(await veToken.getAddress(), ethers.parseEther("100000"));
    await lpToken.connect(user3).approve(await veToken.getAddress(), ethers.parseEther("100000"));
    await lpToken.connect(user4).approve(await veToken.getAddress(), ethers.parseEther("100000"));
  });

  async function calculateUserBoost(user, lockedPercent, lockDuration) {
    // The Curve boost formula (simplified): min(userLPAmount, (userVotePower / totalVotePower) * totalLPAmount * 2.5)
    const userLPAmount = ethers.parseEther(String(100000 * lockedPercent));
    const userLockTime = (await time.latest()) + (MAX_LOCK * lockDuration);
    
    // Check if user has a lock already
    const lockInfo = await veToken.getLock(user.address);
    if (lockInfo[0] > 0) {
      // Withdraw existing lock if expired
      if (lockInfo[1] <= await time.latest()) {
        await veToken.connect(user).withdraw();
      } else {
        // Otherwise create a new account
        [user] = await ethers.getSigners();
        await lpToken.transfer(user.address, userLPAmount);
        await lpToken.connect(user).approve(await veToken.getAddress(), userLPAmount);
      }
    }
    
    // Create lock with specified percentage and duration
    await veToken.connect(user).createLock(userLPAmount, userLockTime);
    
    // Get user voting power
    const userVotingPower = await veToken.balanceOf(user.address);
    
    // Get total voting power
    const totalVotingPower = await veToken.totalVotingPower();
    
    // Calculate boost according to Curve's formula
    // Base boost is 1.0x
    let theoreticalBoost = 100; // 1.0x
    
    if (totalVotingPower > 0) {
      // User's share of total voting power
      const votingPowerRatio = Number(userVotingPower) / Number(totalVotingPower);
      
      // User's share of total LP tokens (25% in this simulation)
      const lpRatio = lockedPercent * 0.25; // 25% is the user's allocation
      
      // Apply Curve's boost formula: min(lpRatio * 2.5, lpRatio + 1.5 * votingPowerRatio)
      // This means a user can get up to 2.5x their base reward proportional to their voting power
      const boostMultiplier = Math.min(2.5, 1 + 1.5 * (votingPowerRatio / lpRatio));
      theoreticalBoost = Math.floor(boostMultiplier * 100);
    }
    
    // Return user voting power, total voting power, and theoretical boost
    return { 
      userVotingPower, 
      totalVotingPower, 
      theoreticalBoost,
      votingPowerPercentage: totalVotingPower > 0 ? (userVotingPower * 100n) / totalVotingPower : 0n
    };
  }
  
  describe("Boost Calculations", function () {
    it("Should calculate boost for user with 25% of LP tokens locked for max duration", async function () {
      // User locks 25% of their LP tokens (100% of their allocation) for max duration
      const result = await calculateUserBoost(user1, 1.0, 1.0); // 100% of user1's tokens for 100% duration
      
      console.log("User with 25% of circulating LP locked for max duration:");
      console.log("User voting power:", ethers.formatEther(result.userVotingPower));
      console.log("Total voting power:", ethers.formatEther(result.totalVotingPower));
      console.log("Voting power percentage:", Number(result.votingPowerPercentage), "%");
      console.log("Theoretical boost:", result.theoreticalBoost / 100, "x");
      
      // Since user has 100% of total voting power, they should get max boost (2.5x)
      expect(result.theoreticalBoost).to.equal(250); // 2.5x
    });
    
    it("Should calculate boost for user with 25% of LP tokens with different users in the system", async function () {
      // Set up other users with locks
      // User2: 25% LP tokens for half duration
      await veToken.connect(user2).createLock(
        ethers.parseEther("100000"), 
        (await time.latest()) + (MAX_LOCK / 2)
      );
      
      // User3: 12.5% LP tokens for max duration
      await veToken.connect(user3).createLock(
        ethers.parseEther("50000"),
        (await time.latest()) + MAX_LOCK
      );
      
      // Calculate boost for user1 with 25% of LP tokens for max duration
      const result = await calculateUserBoost(user1, 1.0, 1.0);
      
      console.log("User with 25% of circulating LP in a system with other users:");
      console.log("User voting power:", ethers.formatEther(result.userVotingPower));
      console.log("Total voting power:", ethers.formatEther(result.totalVotingPower));
      console.log("Voting power percentage:", Number(result.votingPowerPercentage), "%");
      console.log("Theoretical boost:", result.theoreticalBoost / 100, "x");
      
      // User should get a boost between 1.0x and 2.5x depending on their voting power percentage
      expect(result.theoreticalBoost).to.be.gt(100); // > 1.0x
      expect(result.theoreticalBoost).to.be.lte(250); // <= 2.5x
    });
    
    it("Should simulate boosts for various lock durations with 25% of LP", async function () {
      // Create a table of boost values for different lock durations
      const durations = [0.25, 0.5, 0.75, 1.0]; // 1, 2, 3, and 4 years
      
      console.log("\nBoost simulation for 25% of LP with varying lock durations:");
      console.log("------------------------------------------------------------");
      console.log("Duration | Voting Power | VP % | Boost");
      console.log("------------------------------------------------------------");
      
      for (const duration of durations) {
        const result = await calculateUserBoost(user1, 1.0, duration);
        console.log(
          `${duration * 4} years | ${ethers.formatEther(result.userVotingPower).padStart(10)} | ${Number(result.votingPowerPercentage).toFixed(2).padStart(4)}% | ${(result.theoreticalBoost / 100).toFixed(2)}x`
        );
      }
    });
    
    it("Should simulate boosts for various LP percentages with max lock", async function () {
      // Create a table of boost values for different LP percentages
      const percentages = [0.25, 0.5, 0.75, 1.0]; // 25%, 50%, 75%, 100% of user's tokens
      
      console.log("\nBoost simulation for varying LP percentages with max lock:");
      console.log("------------------------------------------------------------");
      console.log("LP % | Voting Power | VP % | Boost");
      console.log("------------------------------------------------------------");
      
      // Use different users for each test to avoid lock conflicts
      const testUsers = [user1, user2, user3, user4];
      
      for (let i = 0; i < percentages.length; i++) {
        const percentage = percentages[i];
        const testUser = testUsers[i];
        const result = await calculateUserBoost(testUser, percentage, 1.0);
        console.log(
          `${(percentage * 25).toFixed(2).padStart(4)}% | ${ethers.formatEther(result.userVotingPower).padStart(10)} | ${Number(result.votingPowerPercentage).toFixed(2).padStart(4)}% | ${(result.theoreticalBoost / 100).toFixed(2)}x`
        );
      }
    });

    it("Should provide a comprehensive boost analysis for a user with 25% of LP tokens", async function () {
      // This test simulates various scenarios for a user with 25% of LP tokens
      
      console.log("\n===============================================================");
      console.log("COMPREHENSIVE BOOST ANALYSIS FOR A USER WITH 25% OF LP TOKENS");
      console.log("===============================================================");
      
      // Scenario 1: User is the only one with locked tokens
      console.log("\nScenario 1: User is the only one with locked tokens");
      console.log("------------------------------------------------------------");
      console.log("Lock Duration | Voting Power | % of Total VP | Boost");
      console.log("------------------------------------------------------------");
      
      const durations = [0.25, 0.5, 0.75, 1.0]; // 1, 2, 3, and 4 years
      for (const duration of durations) {
        const result = await calculateUserBoost(user1, 1.0, duration);
        console.log(
          `${(duration * 4).toFixed(1).padStart(4)} years | ${ethers.formatEther(result.userVotingPower).padStart(12)} | ${Number(result.votingPowerPercentage).toFixed(2).padStart(10)}% | ${(result.theoreticalBoost / 100).toFixed(2)}x`
        );
      }
      
      // Scenario 2: Different participation rates with user having 25% of LP for max duration
      console.log("\nScenario 2: Different participation rates (user locks 25% LP for max duration)");
      console.log("------------------------------------------------------------");
      console.log("% of LP Locked | User VP % | Boost");
      console.log("------------------------------------------------------------");
      
      // Reset system by withdrawing any existing locks
      await time.increase(MAX_LOCK);
      try { await veToken.connect(user1).withdraw(); } catch {}
      try { await veToken.connect(user2).withdraw(); } catch {}
      try { await veToken.connect(user3).withdraw(); } catch {}
      try { await veToken.connect(user4).withdraw(); } catch {}
      
      // Reset to current time instead of trying to go back
      const currentTime = await time.latest();
      
      // Ensure all users have approvals
      await lpToken.connect(user1).approve(await veToken.getAddress(), ethers.parseEther("100000"));
      await lpToken.connect(user2).approve(await veToken.getAddress(), ethers.parseEther("100000"));
      await lpToken.connect(user3).approve(await veToken.getAddress(), ethers.parseEther("100000"));
      await lpToken.connect(user4).approve(await veToken.getAddress(), ethers.parseEther("100000"));
      
      // User1 locks 25% of LP tokens for max duration
      await veToken.connect(user1).createLock(
        ethers.parseEther("100000"),
        currentTime + MAX_LOCK
      );
      
      // Get voting power with only user1 locked
      let result = { 
        userVotingPower: await veToken.balanceOf(user1.address),
        totalVotingPower: await veToken.totalVotingPower()
      };
      result.votingPowerPercentage = (result.userVotingPower * 100n) / result.totalVotingPower;
      
      // User's share of total LP tokens (25% in this simulation)
      const userLpRatio = 0.25; // 25% of total LP
      
      // Apply Curve's boost formula: min(2.5, 1 + 1.5 * (votingPowerRatio / lpRatio))
      const votingPowerRatio1 = Number(result.userVotingPower) / Number(result.totalVotingPower);
      result.theoreticalBoost = Math.min(250, Math.floor((1 + 1.5 * (votingPowerRatio1 / userLpRatio)) * 100));
      
      console.log(`25% of LP | ${Number(result.votingPowerPercentage).toFixed(2).padStart(8)}% | ${(result.theoreticalBoost / 100).toFixed(2)}x  (only user1 locked)`);
      
      // Lock 25% more LP tokens with user2 (half duration)
      await veToken.connect(user2).createLock(
        ethers.parseEther("100000"),
        currentTime + (MAX_LOCK / 2)
      );
      
      // Get voting power with user1 and user2 locked
      result.userVotingPower = await veToken.balanceOf(user1.address);
      result.totalVotingPower = await veToken.totalVotingPower();
      result.votingPowerPercentage = (result.userVotingPower * 100n) / result.totalVotingPower;
      
      // Apply Curve's boost formula with updated voting power
      const votingPowerRatio2 = Number(result.userVotingPower) / Number(result.totalVotingPower);
      result.theoreticalBoost = Math.min(250, Math.floor((1 + 1.5 * (votingPowerRatio2 / userLpRatio)) * 100));
      
      console.log(`50% of LP | ${Number(result.votingPowerPercentage).toFixed(2).padStart(8)}% | ${(result.theoreticalBoost / 100).toFixed(2)}x  (user1 + user2 locked)`);
      
      // Lock 25% more LP tokens with user3 (3/4 duration)
      await veToken.connect(user3).createLock(
        ethers.parseEther("100000"),
        currentTime + (MAX_LOCK * 0.75)
      );
      
      // Get voting power with user1, user2, and user3 locked
      result.userVotingPower = await veToken.balanceOf(user1.address);
      result.totalVotingPower = await veToken.totalVotingPower();
      result.votingPowerPercentage = (result.userVotingPower * 100n) / result.totalVotingPower;
      
      // Apply Curve's boost formula with updated voting power
      const votingPowerRatio3 = Number(result.userVotingPower) / Number(result.totalVotingPower);
      result.theoreticalBoost = Math.min(250, Math.floor((1 + 1.5 * (votingPowerRatio3 / userLpRatio)) * 100));
      
      console.log(`75% of LP | ${Number(result.votingPowerPercentage).toFixed(2).padStart(8)}% | ${(result.theoreticalBoost / 100).toFixed(2)}x  (user1 + user2 + user3 locked)`);
      
      // Lock remaining 25% LP tokens with user4 (1/4 duration)
      await veToken.connect(user4).createLock(
        ethers.parseEther("100000"),
        currentTime + (MAX_LOCK * 0.25)
      );
      
      // Get voting power with all users locked
      result.userVotingPower = await veToken.balanceOf(user1.address);
      result.totalVotingPower = await veToken.totalVotingPower();
      result.votingPowerPercentage = (result.userVotingPower * 100n) / result.totalVotingPower;
      
      // Apply Curve's boost formula with updated voting power
      const votingPowerRatio4 = Number(result.userVotingPower) / Number(result.totalVotingPower);
      result.theoreticalBoost = Math.min(250, Math.floor((1 + 1.5 * (votingPowerRatio4 / userLpRatio)) * 100));
      
      console.log(`100% of LP | ${Number(result.votingPowerPercentage).toFixed(2).padStart(8)}% | ${(result.theoreticalBoost / 100).toFixed(2)}x  (all users locked)`);
      
      // Scenario 3: Percentage of 25% LP locked for max duration
      console.log("\nScenario 3: Effect of locking different % of your 25% LP allocation for max duration");
      console.log("------------------------------------------------------------");
      console.log("% of User's LP | Amount Locked | VP % | Boost");
      console.log("------------------------------------------------------------");
      
      // Reset system
      await time.increase(MAX_LOCK);
      try { await veToken.connect(user1).withdraw(); } catch {}
      try { await veToken.connect(user2).withdraw(); } catch {}
      try { await veToken.connect(user3).withdraw(); } catch {}
      try { await veToken.connect(user4).withdraw(); } catch {}
      
      // Get a fresh current time
      let freshTime = await time.latest();
      
      // Ensure approvals
      await lpToken.connect(user1).approve(await veToken.getAddress(), ethers.parseEther("100000"));
      
      const lpPercentages = [0.25, 0.5, 0.75, 1.0]; // 25%, 50%, 75%, 100% of user's tokens
      
      for (const percentage of lpPercentages) {
        const amount = ethers.parseEther(String(100000 * percentage));
        await veToken.connect(user1).createLock(
          amount,
          freshTime + MAX_LOCK
        );
        
        result.userVotingPower = await veToken.balanceOf(user1.address);
        result.totalVotingPower = await veToken.totalVotingPower();
        result.votingPowerPercentage = (result.userVotingPower * 100n) / result.totalVotingPower;
        
        // User's actual LP ratio (percentage of their 25% allocation)
        const actualLpRatio = percentage * 0.25;
        
        // Apply Curve's boost formula with partial lock
        const partialVotingPowerRatio = Number(result.userVotingPower) / Number(result.totalVotingPower);
        result.theoreticalBoost = Math.min(250, Math.floor((1 + 1.5 * (partialVotingPowerRatio / actualLpRatio)) * 100));
        
        console.log(
          `${(percentage * 100).toFixed(0).padStart(3)}% | ${ethers.formatEther(amount).padStart(12)} | ${Number(result.votingPowerPercentage).toFixed(2).padStart(5)}% | ${(result.theoreticalBoost / 100).toFixed(2)}x`
        );
        
        // Reset for next test
        await time.increase(MAX_LOCK);
        try { await veToken.connect(user1).withdraw(); } catch {}
        
        // Renew approval for next iteration
        await lpToken.connect(user1).approve(await veToken.getAddress(), ethers.parseEther("100000"));
        
        // Get a fresh timestamp for the next iteration
        freshTime = await time.latest();
      }
      
      // Summary and recommendations
      console.log("\nSUMMARY AND RECOMMENDATIONS FOR 25% LP HOLDER:");
      console.log("------------------------------------------------------------");
      console.log("1. Locking all of your 25% LP position for the maximum duration (4 years) gives you the highest boost.");
      console.log("2. As more users lock their LP tokens, your relative boost decreases even with maximum lock time.");
      console.log("3. Even with 100% of all LP tokens locked, you can still maintain a significant boost by locking for longer.");
      console.log("4. Optimal strategy: Lock the maximum amount of your LP tokens for the maximum duration.");
    });
  });
}); 