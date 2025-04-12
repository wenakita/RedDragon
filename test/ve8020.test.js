const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("ve8020 Token", function () {
  let ve8020, lpToken;
  let owner, user1, user2, user3;
  const WEEK = 7 * 24 * 60 * 60; // 1 week in seconds
  const YEAR = 365 * 24 * 60 * 60; // 1 year in seconds
  const MAX_LOCK = 4 * YEAR; // 4 years in seconds
  const MIN_LOCK = WEEK; // 1 week in seconds

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();
    
    // Deploy mock LP token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    lpToken = await MockERC20.deploy("80/20 LP Token", "LP8020", ethers.parseEther("1000000"));
    
    // Deploy ve8020 contract
    const Ve8020 = await ethers.getContractFactory("ve8020");
    ve8020 = await Ve8020.deploy(await lpToken.getAddress());
    
    // Fund users with LP tokens
    await lpToken.transfer(user1.address, ethers.parseEther("10000"));
    await lpToken.transfer(user2.address, ethers.parseEther("10000"));
    await lpToken.transfer(user3.address, ethers.parseEther("10000"));
    
    // Approve ve8020 contract to spend LP tokens
    await lpToken.connect(user1).approve(await ve8020.getAddress(), ethers.parseEther("10000"));
    await lpToken.connect(user2).approve(await ve8020.getAddress(), ethers.parseEther("10000"));
    await lpToken.connect(user3).approve(await ve8020.getAddress(), ethers.parseEther("10000"));
  });

  describe("Initialization", function () {
    it("Should initialize with correct LP token address", async function () {
      expect(await ve8020.lpToken()).to.equal(await lpToken.getAddress());
    });
    
    it("Should initialize with zero total supply", async function () {
      expect(await ve8020.totalSupply()).to.equal(0);
    });
    
    it("Should initialize with epoch 0", async function () {
      expect(await ve8020.epoch()).to.equal(0);
    });
  });
  
  describe("Locking Mechanism", function () {
    it("Should create a new lock", async function () {
      const lockAmount = ethers.parseEther("1000");
      const unlockTime = (await time.latest()) + MAX_LOCK;
      
      // Round down to whole weeks
      const roundedUnlockTime = Math.floor(unlockTime / WEEK) * WEEK;
      
      await ve8020.connect(user1).createLock(lockAmount, unlockTime);
      
      // Check lock info
      const lockInfo = await ve8020.getLock(user1.address);
      expect(lockInfo[0]).to.equal(lockAmount);
      expect(lockInfo[1]).to.equal(roundedUnlockTime);
      
      // Check LP token transfer
      expect(await lpToken.balanceOf(await ve8020.getAddress())).to.equal(lockAmount);
    });
    
    it("Should not allow locking with unlock time less than MIN_LOCK", async function () {
      const lockAmount = ethers.parseEther("1000");
      const unlockTime = (await time.latest()) + WEEK/2; // Less than MIN_LOCK
      
      await expect(
        ve8020.connect(user1).createLock(lockAmount, unlockTime)
      ).to.be.revertedWith("Lock time too short");
    });
    
    it("Should not allow locking with unlock time more than MAX_LOCK", async function () {
      const lockAmount = ethers.parseEther("1000");
      const unlockTime = (await time.latest()) + MAX_LOCK + WEEK; // More than MAX_LOCK
      
      await expect(
        ve8020.connect(user1).createLock(lockAmount, unlockTime)
      ).to.be.revertedWith("Lock time too long");
    });
    
    it("Should not allow locking zero amount", async function () {
      const unlockTime = (await time.latest()) + YEAR;
      
      await expect(
        ve8020.connect(user1).createLock(0, unlockTime)
      ).to.be.revertedWith("Must lock non-zero amount");
    });
    
    it("Should increase lock amount without changing unlock time", async function () {
      // Initial lock
      const initialAmount = ethers.parseEther("1000");
      const unlockTime = (await time.latest()) + YEAR;
      await ve8020.connect(user1).createLock(initialAmount, unlockTime);
      
      // Increase lock amount
      const additionalAmount = ethers.parseEther("500");
      await ve8020.connect(user1).increaseLockAmount(additionalAmount);
      
      // Check updated lock info
      const lockInfo = await ve8020.getLock(user1.address);
      expect(lockInfo[0]).to.equal(initialAmount + additionalAmount);
      expect(lockInfo[1]).to.equal(Math.floor(unlockTime / WEEK) * WEEK); // Should remain the same
    });
    
    it("Should extend lock time without changing amount", async function () {
      // Initial lock
      const amount = ethers.parseEther("1000");
      const initialUnlockTime = (await time.latest()) + YEAR;
      await ve8020.connect(user1).createLock(amount, initialUnlockTime);
      
      // Extend lock time
      const newUnlockTime = (await time.latest()) + 2 * YEAR;
      await ve8020.connect(user1).extendLockTime(newUnlockTime);
      
      // Check updated lock info
      const lockInfo = await ve8020.getLock(user1.address);
      expect(lockInfo[0]).to.equal(amount); // Should remain the same
      expect(lockInfo[1]).to.equal(Math.floor(newUnlockTime / WEEK) * WEEK);
    });
    
    it("Should not allow decreasing lock time", async function () {
      const amount = ethers.parseEther("1000");
      const initialUnlockTime = (await time.latest()) + 2 * YEAR;
      await ve8020.connect(user1).createLock(amount, initialUnlockTime);
      
      // Try to decrease lock time
      const shorterUnlockTime = (await time.latest()) + YEAR;
      await expect(
        ve8020.connect(user1).extendLockTime(shorterUnlockTime)
      ).to.be.revertedWith("Cannot decrease lock time");
    });
  });
  
  describe("Voting Power Calculation", function () {
    it("Should calculate voting power based on lock amount and time", async function () {
      const amount = ethers.parseEther("1000");
      const unlockTime = (await time.latest()) + MAX_LOCK;
      
      // Calculate expected voting power
      const votingPower = await ve8020.calculateVotingPower(amount, unlockTime);
      expect(votingPower).to.equal(amount); // With max lock, power equals amount
      
      // Create lock
      await ve8020.connect(user1).createLock(amount, unlockTime);
      
      // Check user's voting power
      const userVotingPower = await ve8020.balanceOf(user1.address);
      expect(userVotingPower).to.be.closeTo(votingPower, ethers.parseEther("0.1")); // Allow small rounding difference
    });
    
    it("Should reduce voting power for shorter locks", async function () {
      const amount = ethers.parseEther("1000");
      const halfLockTime = (await time.latest()) + (MAX_LOCK / 2);
      
      // Calculate expected voting power
      const votingPower = await ve8020.calculateVotingPower(amount, halfLockTime);
      expect(votingPower).to.be.closeTo(amount / 2n, ethers.parseEther("0.1")); // Half lock time = half voting power
      
      // Create lock
      await ve8020.connect(user1).createLock(amount, halfLockTime);
      
      // Check user's voting power
      const userVotingPower = await ve8020.balanceOf(user1.address);
      expect(userVotingPower).to.be.closeTo(votingPower, ethers.parseEther("0.1"));
    });
    
    it("Should decay voting power over time", async function () {
      const amount = ethers.parseEther("1000");
      const unlockTime = (await time.latest()) + MAX_LOCK;
      
      // Create lock
      await ve8020.connect(user1).createLock(amount, unlockTime);
      
      // Initial voting power
      const initialVotingPower = await ve8020.balanceOf(user1.address);
      
      // Fast forward time (25% of lock duration)
      await time.increase(MAX_LOCK / 4);
      
      // Get voting power after time passes
      const laterVotingPower = await ve8020.balanceOf(user1.address);
      
      // Voting power should be reduced (approximately 75% of initial power)
      expect(laterVotingPower).to.be.lessThan(initialVotingPower);
      expect(laterVotingPower).to.be.closeTo(initialVotingPower * 3n / 4n, ethers.parseEther("50"));
    });
  });
  
  describe("Total Supply and Epoch", function () {
    it("Should update total supply when users create locks", async function () {
      // Initial total supply should be zero
      expect(await ve8020.totalSupply()).to.equal(0);
      
      // User1 creates a lock
      const amount1 = ethers.parseEther("1000");
      const unlockTime1 = (await time.latest()) + MAX_LOCK;
      await ve8020.connect(user1).createLock(amount1, unlockTime1);
      
      const totalSupply1 = await ve8020.totalSupply();
      expect(totalSupply1).to.be.closeTo(amount1, ethers.parseEther("0.1"));
      
      // User2 creates a lock
      const amount2 = ethers.parseEther("2000");
      const unlockTime2 = (await time.latest()) + MAX_LOCK / 2;
      await ve8020.connect(user2).createLock(amount2, unlockTime2);
      
      const totalSupply2 = await ve8020.totalSupply();
      const expectedSupply = amount1 + (amount2 / 2n);
      expect(totalSupply2).to.be.closeTo(expectedSupply, ethers.parseEther("50"));
    });
    
    it("Should increment epoch on checkpoint", async function () {
      // Initial epoch should be 0
      expect(await ve8020.epoch()).to.equal(0);
      
      // User1 creates a lock (triggers _checkpoint)
      const amount1 = ethers.parseEther("1000");
      const unlockTime1 = (await time.latest()) + MAX_LOCK;
      await ve8020.connect(user1).createLock(amount1, unlockTime1);
      
      // Epoch should be incremented
      expect(await ve8020.epoch()).to.equal(1);
      
      // User1 increases lock amount (triggers _checkpoint)
      await ve8020.connect(user1).increaseLockAmount(ethers.parseEther("500"));
      
      // Epoch should be incremented again
      expect(await ve8020.epoch()).to.equal(2);
    });
  });
  
  describe("Withdrawal", function () {
    it("Should not allow withdrawal before lock expires", async function () {
      // Create lock
      const amount = ethers.parseEther("1000");
      const unlockTime = (await time.latest()) + YEAR;
      await ve8020.connect(user1).createLock(amount, unlockTime);
      
      // Try to withdraw before lock expires
      await expect(
        ve8020.connect(user1).withdraw()
      ).to.be.revertedWith("Lock not expired");
    });
    
    it("Should allow withdrawal after lock expires", async function () {
      // Initial LP balance
      const initialBalance = await lpToken.balanceOf(user1.address);
      
      // Create lock
      const amount = ethers.parseEther("1000");
      const unlockTime = (await time.latest()) + MIN_LOCK + 60; // Just over minimum lock time
      await ve8020.connect(user1).createLock(amount, unlockTime);
      
      // Fast forward time past unlock time
      await time.increase(MIN_LOCK + 120);
      
      // Withdraw
      await ve8020.connect(user1).withdraw();
      
      // Check that LP tokens were returned
      const finalBalance = await lpToken.balanceOf(user1.address);
      expect(finalBalance).to.equal(initialBalance - amount + amount); // Should be back to initial
      
      // Check that lock is cleared
      const lockInfo = await ve8020.getLock(user1.address);
      expect(lockInfo[0]).to.equal(0);
      expect(lockInfo[1]).to.equal(0);
      
      // Check voting power is zero
      expect(await ve8020.balanceOf(user1.address)).to.equal(0);
    });
    
    it("Should reset voting power after withdrawal", async function () {
      // Create lock
      const amount = ethers.parseEther("1000");
      const unlockTime = (await time.latest()) + MIN_LOCK + 60;
      await ve8020.connect(user1).createLock(amount, unlockTime);
      
      // Initial voting power
      const initialVotingPower = await ve8020.balanceOf(user1.address);
      expect(initialVotingPower).to.be.gt(0);
      
      // Fast forward time past unlock time
      await time.increase(MIN_LOCK + 120);
      
      // Withdraw
      await ve8020.connect(user1).withdraw();
      
      // Voting power should be zero
      expect(await ve8020.balanceOf(user1.address)).to.equal(0);
    });
  });
}); 