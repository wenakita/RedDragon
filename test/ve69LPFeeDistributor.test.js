const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("ve69LPFeeDistributor", function () {
  let ve69LPFeeDistributor;
  let wrappedSonic;
  let ve69LP;
  let owner;
  let user1;
  let user2;
  let EPOCH_DURATION;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock wrapped Sonic
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    wrappedSonic = await MockERC20.deploy("Wrapped Sonic", "wS", ethers.utils.parseEther("10000000"));
    await wrappedSonic.deployed();

    // Transfer some tokens to users
    await wrappedSonic.transfer(user1.address, ethers.utils.parseEther("10000"));
    await wrappedSonic.transfer(user2.address, ethers.utils.parseEther("5000"));

    // Deploy mock Ve69LP
    const Ve69LPFactory = await ethers.getContractFactory("Ve69LP");
    ve69LP = await Ve69LPFactory.deploy(wrappedSonic.address);
    await ve69LP.deployed();

    // Deploy fee distributor
    const Ve69LPFeeDistributor = await ethers.getContractFactory("ve69LPFeeDistributor");
    ve69LPFeeDistributor = await Ve69LPFeeDistributor.deploy(
      ve69LP.address,
      wrappedSonic.address
    );
    await ve69LPFeeDistributor.deployed();
    
    // Get the epoch duration
    EPOCH_DURATION = await ve69LPFeeDistributor.EPOCH_DURATION();
  });

  describe("Initialization", function () {
    it("should initialize with correct state", async function () {
      expect(await ve69LPFeeDistributor.wrappedSonic()).to.equal(wrappedSonic.address);
      expect(await ve69LPFeeDistributor.veToken()).to.equal(ve69LP.address);
      expect(await ve69LPFeeDistributor.currentEpoch()).to.equal(0);
    });
  });

  describe("Fee Distribution", function () {
    beforeEach(async function () {
      // Create locks for both users
      await wrappedSonic.connect(user1).approve(ve69LP.address, ethers.utils.parseEther("1000"));
      await wrappedSonic.connect(user2).approve(ve69LP.address, ethers.utils.parseEther("500"));

      // Create a 1 year lock
      const currentTime = await time.latest();
      const unlockTime = currentTime + 365 * 24 * 60 * 60;

      // Users lock tokens
      await ve69LP.connect(user1).createLock(ethers.utils.parseEther("1000"), unlockTime);
      await ve69LP.connect(user2).createLock(ethers.utils.parseEther("500"), unlockTime);

      // Add rewards
      await wrappedSonic.approve(ve69LPFeeDistributor.address, ethers.utils.parseEther("1000"));
      await ve69LPFeeDistributor.addRewards(ethers.utils.parseEther("1000"));
    });

    it("should not allow claims for the current epoch", async function () {
      await expect(
        ve69LPFeeDistributor.connect(user1).claimRewards(0)
      ).to.be.revertedWith("Cannot claim for current or future epoch");
    });

    it.skip("should allow claiming rewards after epoch advances", async function () {
      // Advance time to the next epoch
      await time.increase(EPOCH_DURATION.toNumber());
      
      // Force epoch advancement
      await ve69LPFeeDistributor.checkAdvanceEpoch();

      // Now we should be able to claim for epoch 0
      const initialBalance = await wrappedSonic.balanceOf(user1.address);
      await ve69LPFeeDistributor.connect(user1).claimRewards(0);
      const finalBalance = await wrappedSonic.balanceOf(user1.address);
      
      expect(finalBalance).to.be.gt(initialBalance);

      // Cannot claim rewards twice for the same epoch
      await expect(
        ve69LPFeeDistributor.connect(user1).claimRewards(0)
      ).to.be.revertedWith("Already claimed for this epoch");
    });

    it.skip("should only allow user to claim once per epoch", async function () {
      // Advance time to the next epoch
      await time.increase(EPOCH_DURATION.toNumber());
      
      // Force epoch advancement
      await ve69LPFeeDistributor.checkAdvanceEpoch();

      // Claim rewards for first user
      await ve69LPFeeDistributor.connect(user1).claimRewards(0);

      // Cannot claim rewards twice for the same epoch
      await expect(
        ve69LPFeeDistributor.connect(user1).claimRewards(0)
      ).to.be.revertedWith("Already claimed for this epoch");
    });
  });

  describe("Rewards Distribution", function () {
    it.skip("should distribute rewards proportionally", async function () {
      // Create a 1 year lock for two users (2:1 ratio)
      await wrappedSonic.connect(user1).approve(ve69LP.address, ethers.utils.parseEther("1000"));
      await wrappedSonic.connect(user2).approve(ve69LP.address, ethers.utils.parseEther("500"));

      const currentTime = await time.latest();
      const unlockTime = currentTime + 365 * 24 * 60 * 60;

      await ve69LP.connect(user1).createLock(ethers.utils.parseEther("1000"), unlockTime);
      await ve69LP.connect(user2).createLock(ethers.utils.parseEther("500"), unlockTime);

      // Add rewards
      await wrappedSonic.approve(ve69LPFeeDistributor.address, ethers.utils.parseEther("1500"));
      await ve69LPFeeDistributor.addRewards(ethers.utils.parseEther("1500"));

      // Advance time to the next epoch
      await time.increase(EPOCH_DURATION.toNumber());
      
      // Force epoch advancement
      await ve69LPFeeDistributor.checkAdvanceEpoch();

      // Get initial balances
      const user1BalanceBefore = await wrappedSonic.balanceOf(user1.address);
      const user2BalanceBefore = await wrappedSonic.balanceOf(user2.address);

      // Claim rewards
      await ve69LPFeeDistributor.connect(user1).claimRewards(0);
      await ve69LPFeeDistributor.connect(user2).claimRewards(0);

      // Get final balances
      const user1BalanceAfter = await wrappedSonic.balanceOf(user1.address);
      const user2BalanceAfter = await wrappedSonic.balanceOf(user2.address);

      // Calculate rewards received
      const user1Reward = user1BalanceAfter.sub(user1BalanceBefore);
      const user2Reward = user2BalanceAfter.sub(user2BalanceBefore);

      // User1 should receive approximately 2x more rewards than user2 (2:1 ratio)
      // Allow for some small rounding errors
      const ratio = user1Reward.mul(100).div(user2Reward);
      expect(ratio).to.be.closeTo(ethers.BigNumber.from(200), 5); // 2.00 with tolerance of 0.05
    });
  });

  describe("Owner Controls", function () {
    it("should allow owner to withdraw in case of emergency", async function () {
      const amount = ethers.utils.parseEther("100");
      
      // Transfer some tokens to the contract
      await wrappedSonic.transfer(ve69LPFeeDistributor.address, amount);
      
      // Owner can withdraw
      await ve69LPFeeDistributor.emergencyWithdraw(owner.address, wrappedSonic.address, amount);
      
      // Check the balance was transferred
      const ownerBalance = await wrappedSonic.balanceOf(owner.address);
      expect(ownerBalance).to.be.gte(amount);
    });

    it("should not allow non-owner to withdraw", async function () {
      const amount = ethers.utils.parseEther("100");
      
      // Transfer some tokens to the contract
      await wrappedSonic.transfer(ve69LPFeeDistributor.address, amount);
      
      // Non-owner cannot withdraw
      await expect(
        ve69LPFeeDistributor.connect(user1).emergencyWithdraw(user1.address, wrappedSonic.address, amount)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
}); 