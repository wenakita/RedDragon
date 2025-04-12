const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Ve8020FeeDistributor", function () {
  let veToken, lpToken, rewardToken, feeDistributor;
  let owner, user1, user2, user3, feeManager;
  const WEEK = 7 * 24 * 60 * 60; // 1 week in seconds
  const YEAR = 365 * 24 * 60 * 60; // 1 year in seconds
  const MAX_LOCK = 4 * YEAR; // 4 years in seconds
  const MIN_LOCK = WEEK; // 1 week in seconds

  beforeEach(async function () {
    [owner, user1, user2, user3, feeManager] = await ethers.getSigners();
    
    // Deploy mock LP token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    lpToken = await MockERC20.deploy("80/20 LP Token", "LP8020", ethers.parseEther("1000000"));
    
    // Deploy mock reward token (DRAGON)
    rewardToken = await MockERC20.deploy("Dragon Token", "DRAGON", ethers.parseEther("1000000"));
    
    // Deploy ve8020 contract
    const Ve8020 = await ethers.getContractFactory("ve8020");
    veToken = await Ve8020.deploy(await lpToken.getAddress());
    
    // Deploy fee distributor
    const FeeDistributor = await ethers.getContractFactory("Ve8020FeeDistributor");
    feeDistributor = await FeeDistributor.deploy(
      await veToken.getAddress(),
      await rewardToken.getAddress()
    );
    
    // Fund users with LP tokens
    await lpToken.transfer(user1.address, ethers.parseEther("10000"));
    await lpToken.transfer(user2.address, ethers.parseEther("10000"));
    await lpToken.transfer(user3.address, ethers.parseEther("10000"));
    
    // Fund fee manager with reward tokens
    await rewardToken.transfer(feeManager.address, ethers.parseEther("100000"));
    
    // Approve ve8020 contract to spend LP tokens
    await lpToken.connect(user1).approve(await veToken.getAddress(), ethers.parseEther("10000"));
    await lpToken.connect(user2).approve(await veToken.getAddress(), ethers.parseEther("10000"));
    await lpToken.connect(user3).approve(await veToken.getAddress(), ethers.parseEther("10000"));
    
    // Approve fee distributor contract to spend reward tokens
    await rewardToken.connect(feeManager).approve(await feeDistributor.getAddress(), ethers.parseEther("100000"));
  });

  describe("Initialization", function () {
    it("Should initialize with correct token addresses", async function () {
      expect(await feeDistributor.veToken()).to.equal(await veToken.getAddress());
      expect(await feeDistributor.rewardToken()).to.equal(await rewardToken.getAddress());
    });
    
    it("Should initialize with correct epoch values", async function () {
      expect(await feeDistributor.currentEpoch()).to.equal(0);
      
      const epochInfo = await feeDistributor.getCurrentEpochInfo();
      expect(epochInfo[0]).to.equal(0); // currentEpoch
      // Time until next epoch should be less than WEEK
      expect(epochInfo[2]).to.be.lte(WEEK);
    });
    
    it("Should have zero rewards for initial epoch", async function () {
      expect(await feeDistributor.epochRewards(0)).to.equal(0);
    });
  });
  
  describe("Epoch Advancement", function () {
    it("Should advance epoch after EPOCH_DURATION", async function () {
      // Fast forward time past first epoch
      await time.increase(WEEK + 60); // Add a little buffer
      
      // Check epoch has not advanced yet (needs a transaction to trigger)
      expect(await feeDistributor.currentEpoch()).to.equal(0);
      
      // Trigger epoch advancement
      await feeDistributor.checkAdvanceEpoch();
      
      // Epoch should have advanced
      expect(await feeDistributor.currentEpoch()).to.equal(1);
    });
    
    it("Should take voting power snapshot when advancing epochs", async function () {
      // Create a lock for user1
      const lockAmount = ethers.parseEther("1000");
      const unlockTime = (await time.latest()) + MAX_LOCK;
      await veToken.connect(user1).createLock(lockAmount, unlockTime);
      
      // Initial total voting power
      const initialVotingPower = await veToken.totalVotingPower();
      
      // Fast forward time past first epoch
      await time.increase(WEEK + 60);
      
      // Trigger epoch advancement
      await feeDistributor.checkAdvanceEpoch();
      
      // Check voting power was correctly captured in snapshot
      expect(await feeDistributor.epochTotalVotingPower(1)).to.equal(initialVotingPower);
    });
    
    it("Should advance multiple epochs if needed", async function () {
      // Fast forward time past multiple epochs
      await time.increase(3 * WEEK + 60);
      
      // Trigger epoch advancement
      await feeDistributor.checkAdvanceEpoch();
      
      // Should have advanced to epoch 3
      expect(await feeDistributor.currentEpoch()).to.equal(3);
    });
  });
  
  describe("Reward Distribution", function () {
    beforeEach(async function () {
      // Create locks for users
      const unlockTime = (await time.latest()) + MAX_LOCK;
      
      // User1: 1000 LP tokens for max time (full voting power)
      await veToken.connect(user1).createLock(ethers.parseEther("1000"), unlockTime);
      
      // User2: 2000 LP tokens for max time (full voting power)
      await veToken.connect(user2).createLock(ethers.parseEther("2000"), unlockTime);
      
      // User3: 3000 LP tokens for half time (half voting power)
      await veToken.connect(user3).createLock(ethers.parseEther("3000"), (await time.latest()) + MAX_LOCK/2);
      
      // Add rewards for epoch 0
      await feeDistributor.connect(feeManager).addRewards(ethers.parseEther("6000"));
    });
    
    it("Should add rewards to current epoch", async function () {
      expect(await feeDistributor.epochRewards(0)).to.equal(ethers.parseEther("6000"));
    });
    
    it("Should not allow claiming current epoch rewards", async function () {
      await expect(
        feeDistributor.connect(user1).claimEpochRewards(0)
      ).to.be.revertedWith("Epoch not finalized yet");
    });
    
    it("Should distribute rewards proportional to voting power", async function () {
      // Fast forward to next epoch
      await time.increase(WEEK + 60);
      await feeDistributor.checkAdvanceEpoch();
      
      // User1 has 1000 LP tokens locked for max time = 1000 voting power
      // User2 has 2000 LP tokens locked for max time = 2000 voting power
      // User3 has 3000 LP tokens locked for half time = 1500 voting power
      // Total voting power: 4500
      
      // User1 claims epoch 0 rewards
      await feeDistributor.connect(user1).claimEpochRewards(0);
      
      // User1 should get 1000/4500 of 6000 = 1333.33 DRAGON tokens
      const user1Balance = await rewardToken.balanceOf(user1.address);
      expect(user1Balance).to.be.closeTo(
        ethers.parseEther("1333.33"), 
        ethers.parseEther("0.01")
      );
      
      // User2 claims epoch 0 rewards
      await feeDistributor.connect(user2).claimEpochRewards(0);
      
      // User2 should get 2000/4500 of 6000 = 2666.67 DRAGON tokens
      const user2Balance = await rewardToken.balanceOf(user2.address);
      expect(user2Balance).to.be.closeTo(
        ethers.parseEther("2666.67"), 
        ethers.parseEther("0.01")
      );
      
      // User3 claims epoch 0 rewards
      await feeDistributor.connect(user3).claimEpochRewards(0);
      
      // User3 should get 1500/4500 of 6000 = 2000 DRAGON tokens
      const user3Balance = await rewardToken.balanceOf(user3.address);
      expect(user3Balance).to.be.closeTo(
        ethers.parseEther("2000"), 
        ethers.parseEther("0.01")
      );
    });
    
    it("Should not allow claiming rewards twice", async function () {
      // Fast forward to next epoch
      await time.increase(WEEK + 60);
      await feeDistributor.checkAdvanceEpoch();
      
      // Claim rewards first time
      await feeDistributor.connect(user1).claimEpochRewards(0);
      
      // Trying to claim again should fail
      await expect(
        feeDistributor.connect(user1).claimEpochRewards(0)
      ).to.be.revertedWith("Rewards already claimed for this epoch");
    });
    
    it("Should allow claiming multiple epochs at once", async function () {
      // Fast forward to epoch 1
      await time.increase(WEEK + 60);
      await feeDistributor.checkAdvanceEpoch();
      
      // Add rewards for epoch 1
      await feeDistributor.connect(feeManager).addRewards(ethers.parseEther("3000"));
      
      // Fast forward to epoch 2
      await time.increase(WEEK + 60);
      await feeDistributor.checkAdvanceEpoch();
      
      // User1 claims both epochs
      await feeDistributor.connect(user1).claimMultipleEpochRewards([0, 1]);
      
      // User1 should get 1000/4500 of 6000 + 1000/4500 of 3000 = 2000 DRAGON tokens
      const user1Balance = await rewardToken.balanceOf(user1.address);
      expect(user1Balance).to.be.closeTo(
        ethers.parseEther("2000"), 
        ethers.parseEther("0.01")
      );
    });
  });
  
  describe("Reward Calculation", function () {
    beforeEach(async function () {
      // Create locks for users
      const unlockTime = (await time.latest()) + MAX_LOCK;
      
      // User1: 1000 LP tokens for max time (full voting power)
      await veToken.connect(user1).createLock(ethers.parseEther("1000"), unlockTime);
      
      // Add rewards for epoch 0
      await feeDistributor.connect(feeManager).addRewards(ethers.parseEther("5000"));
      
      // Fast forward to next epoch
      await time.increase(WEEK + 60);
      await feeDistributor.checkAdvanceEpoch();
    });
    
    it("Should correctly calculate user's claimable rewards", async function () {
      const claimable = await feeDistributor.getUserClaimableRewards(user1.address, 0);
      expect(claimable).to.equal(ethers.parseEther("5000")); // User1 is the only ve token holder
    });
    
    it("Should return zero for already claimed epochs", async function () {
      // Claim rewards
      await feeDistributor.connect(user1).claimEpochRewards(0);
      
      // Check claimable is now zero
      const claimable = await feeDistributor.getUserClaimableRewards(user1.address, 0);
      expect(claimable).to.equal(0);
    });
    
    it("Should calculate total claimable rewards across epochs", async function () {
      // Add rewards for epoch 1
      await feeDistributor.connect(feeManager).addRewards(ethers.parseEther("3000"));
      
      // Fast forward to epoch 2
      await time.increase(WEEK + 60);
      await feeDistributor.checkAdvanceEpoch();
      
      // User1 should have rewards from epochs 0 and 1
      const totalClaimable = await feeDistributor.getUserTotalClaimableRewards(user1.address);
      expect(totalClaimable).to.equal(ethers.parseEther("8000")); // 5000 + 3000
    });
  });
  
  describe("Reward Addition", function () {
    it("Should allow adding rewards via addRewards", async function () {
      await feeDistributor.connect(feeManager).addRewards(ethers.parseEther("1000"));
      expect(await feeDistributor.epochRewards(0)).to.equal(ethers.parseEther("1000"));
    });
    
    it("Should allow adding rewards via receiveRewards", async function () {
      await feeDistributor.receiveRewards(ethers.parseEther("500"));
      expect(await feeDistributor.epochRewards(0)).to.equal(ethers.parseEther("500"));
    });
    
    it("Should not allow adding zero rewards", async function () {
      await expect(
        feeDistributor.connect(feeManager).addRewards(0)
      ).to.be.revertedWith("Amount must be greater than 0");
      
      await expect(
        feeDistributor.receiveRewards(0)
      ).to.be.revertedWith("Amount must be greater than 0");
    });
    
    it("Should check and advance epoch when adding rewards", async function () {
      // Fast forward time past first epoch
      await time.increase(WEEK + 60);
      
      // Add rewards (should advance epoch)
      await feeDistributor.connect(feeManager).addRewards(ethers.parseEther("1000"));
      
      // Epoch should have advanced
      expect(await feeDistributor.currentEpoch()).to.equal(1);
      
      // Rewards should be added to new epoch
      expect(await feeDistributor.epochRewards(1)).to.equal(ethers.parseEther("1000"));
    });
  });
}); 