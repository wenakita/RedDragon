const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ve8020", function () {
  let ve8020;
  let tokenLP;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy the mock ERC20 token to represent the LP token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    tokenLP = await MockERC20.deploy("LP Token", "LP", ethers.utils.parseEther("1000000"));
    await tokenLP.deployed();

    // Deploy the ve8020 token
    const Ve8020 = await ethers.getContractFactory("ve8020");
    ve8020 = await Ve8020.deploy(tokenLP.address);
    await ve8020.deployed();

    // Transfer some tokens to the users for locking
    await tokenLP.transfer(user1.address, ethers.utils.parseEther("10000"));
    await tokenLP.transfer(user2.address, ethers.utils.parseEther("5000"));

    // Users approve ve8020 to spend their tokens
    await tokenLP.connect(user1).approve(ve8020.address, ethers.utils.parseEther("10000"));
    await tokenLP.connect(user2).approve(ve8020.address, ethers.utils.parseEther("5000"));
  });

  describe("Initial State", function() {
    it("should have correct initial state", async function () {
      expect(await ve8020.lpToken()).to.equal(tokenLP.address);
      expect(await ve8020.totalSupply()).to.equal(0);
      expect(await ve8020.epoch()).to.equal(0);
    });
  });

  describe("Lock Creation", function() {
    it("should create a lock successfully", async function () {
      // Lock tokens for 1 year
      const lockAmount = ethers.utils.parseEther("1000");
      const lockTime = Math.floor(Date.now() / 1000) + 365 * 86400; // 1 year from now
      
      await ve8020.connect(user1).createLock(lockAmount, lockTime);
      
      // Check lock was created
      const [lockedAmount, unlockTime] = await ve8020.getLock(user1.address);
      expect(lockedAmount).to.equal(lockAmount);
      
      // Check voting power was assigned
      const votingPower = await ve8020.balanceOf(user1.address);
      expect(votingPower).to.be.gt(0);
      
      // Check total supply was updated
      expect(await ve8020.totalSupply()).to.equal(votingPower);
    });

    it("should not allow locking with too short lock time", async function () {
      const lockAmount = ethers.utils.parseEther("1000");
      const lockTime = Math.floor(Date.now() / 1000) + 3 * 86400; // 3 days from now
      
      await expect(
        ve8020.connect(user1).createLock(lockAmount, lockTime)
      ).to.be.revertedWith("Lock time too short");
    });

    it("should not allow locking with too long lock time", async function () {
      const lockAmount = ethers.utils.parseEther("1000");
      const lockTime = Math.floor(Date.now() / 1000) + 5 * 365 * 86400; // 5 years from now
      
      await expect(
        ve8020.connect(user1).createLock(lockAmount, lockTime)
      ).to.be.revertedWith("Lock time too long");
    });

    it("should not allow locking zero amount", async function () {
      const lockTime = Math.floor(Date.now() / 1000) + 365 * 86400; // 1 year from now
      
      await expect(
        ve8020.connect(user1).createLock(0, lockTime)
      ).to.be.revertedWith("Must lock non-zero amount");
    });
  });

  describe("Lock Extensions", function() {
    it("should increase lock amount successfully", async function () {
      // Create initial lock
      const initialAmount = ethers.utils.parseEther("1000");
      const lockTime = Math.floor(Date.now() / 1000) + 365 * 86400; // 1 year from now
      await ve8020.connect(user1).createLock(initialAmount, lockTime);
      
      // Get initial voting power
      const initialVotingPower = await ve8020.balanceOf(user1.address);
      
      // Increase lock amount
      const additionalAmount = ethers.utils.parseEther("500");
      await ve8020.connect(user1).increaseLockAmount(additionalAmount);
      
      // Check new lock amount
      const [newLockedAmount, unlockTime] = await ve8020.getLock(user1.address);
      expect(newLockedAmount).to.equal(initialAmount.add(additionalAmount));
      
      // Check voting power increased
      const newVotingPower = await ve8020.balanceOf(user1.address);
      expect(newVotingPower).to.be.gt(initialVotingPower);
    });

    it("should extend lock time successfully", async function () {
      // Create initial lock
      const initialAmount = ethers.utils.parseEther("1000");
      const initialLockTime = Math.floor(Date.now() / 1000) + 365 * 86400; // 1 year from now
      await ve8020.connect(user1).createLock(initialAmount, initialLockTime);
      
      // Get initial voting power
      const initialVotingPower = await ve8020.balanceOf(user1.address);
      
      // Extend lock time
      const newLockTime = Math.floor(Date.now() / 1000) + 2 * 365 * 86400; // 2 years from now
      await ve8020.connect(user1).extendLockTime(newLockTime);
      
      // Check new unlock time (noting it rounds down to weeks)
      const [lockedAmount, unlockTime] = await ve8020.getLock(user1.address);
      expect(unlockTime).to.be.gt(initialLockTime);
      
      // Check voting power increased
      const newVotingPower = await ve8020.balanceOf(user1.address);
      expect(newVotingPower).to.be.gt(initialVotingPower);
    });

    it("should not allow increasing lock amount for non-existent lock", async function () {
      await expect(
        ve8020.connect(user1).increaseLockAmount(ethers.utils.parseEther("500"))
      ).to.be.revertedWith("No existing lock found");
    });

    it("should not allow extending lock time for non-existent lock", async function () {
      const newLockTime = Math.floor(Date.now() / 1000) + 2 * 365 * 86400; // 2 years from now
      
      await expect(
        ve8020.connect(user1).extendLockTime(newLockTime)
      ).to.be.revertedWith("No existing lock found");
    });

    it("should not allow decreasing lock time", async function () {
      // Create initial lock
      const initialAmount = ethers.utils.parseEther("1000");
      const initialLockTime = Math.floor(Date.now() / 1000) + 2 * 365 * 86400; // 2 years from now
      await ve8020.connect(user1).createLock(initialAmount, initialLockTime);
      
      // Try to decrease lock time
      const shorterLockTime = Math.floor(Date.now() / 1000) + 365 * 86400; // 1 year from now
      
      await expect(
        ve8020.connect(user1).extendLockTime(shorterLockTime)
      ).to.be.revertedWith("Cannot decrease lock time");
    });
  });

  describe("Withdrawals", function() {
    it("should allow withdrawal after lock expires", async function () {
      // Create a lock
      const lockAmount = ethers.utils.parseEther("1000");
      const lockTime = Math.floor(Date.now() / 1000) + 7 * 86400; // 1 week from now (minimum)
      await ve8020.connect(user1).createLock(lockAmount, lockTime);
      
      // Fast forward time past unlock time
      await ethers.provider.send("evm_increaseTime", [8 * 86400]); // 8 days
      await ethers.provider.send("evm_mine");
      
      // Check LP token balance before withdrawal
      const balanceBefore = await tokenLP.balanceOf(user1.address);
      
      // Withdraw
      await ve8020.connect(user1).withdraw();
      
      // Check LP tokens were returned
      const balanceAfter = await tokenLP.balanceOf(user1.address);
      expect(balanceAfter.sub(balanceBefore)).to.equal(lockAmount);
      
      // Check lock was cleared
      const [lockedAmount, unlockTime] = await ve8020.getLock(user1.address);
      expect(lockedAmount).to.equal(0);
      expect(unlockTime).to.equal(0);
      
      // Check voting power is zero
      expect(await ve8020.balanceOf(user1.address)).to.equal(0);
    });

    it("should not allow withdrawal before lock expires", async function () {
      // Create a lock
      const lockAmount = ethers.utils.parseEther("1000");
      const lockTime = Math.floor(Date.now() / 1000) + 365 * 86400; // 1 year from now
      await ve8020.connect(user1).createLock(lockAmount, lockTime);
      
      // Try to withdraw immediately
      await expect(
        ve8020.connect(user1).withdraw()
      ).to.be.revertedWith("Lock not expired");
    });

    it("should not allow withdrawal without an existing lock", async function () {
      await expect(
        ve8020.connect(user1).withdraw()
      ).to.be.revertedWith("No lock found");
    });
  });

  describe("Voting Power", function() {
    it("should calculate voting power based on amount and time", async function () {
      // Create locks with same amount but different durations
      const lockAmount = ethers.utils.parseEther("1000");
      
      // Lock for 1 year
      const lockTime1 = Math.floor(Date.now() / 1000) + 365 * 86400; // 1 year
      await ve8020.connect(user1).createLock(lockAmount, lockTime1);
      
      // Lock for 2 years
      const lockTime2 = Math.floor(Date.now() / 1000) + 2 * 365 * 86400; // 2 years
      await ve8020.connect(user2).createLock(lockAmount, lockTime2);
      
      // Check voting powers
      const votingPower1 = await ve8020.balanceOf(user1.address);
      const votingPower2 = await ve8020.balanceOf(user2.address);
      
      // Longer lock should have more voting power for same amount
      expect(votingPower2).to.be.gt(votingPower1);
    });

    it("should calculate voting power based on lock time and amount", async function () {
      // Create locks with different amounts but same duration
      const lockTime = Math.floor(Date.now() / 1000) + 365 * 86400; // 1 year
      
      // Lock 1000 LP tokens
      await ve8020.connect(user1).createLock(ethers.utils.parseEther("1000"), lockTime);
      
      // Lock 2000 LP tokens
      await ve8020.connect(user2).createLock(ethers.utils.parseEther("2000"), lockTime);
      
      // Check voting powers
      const votingPower1 = await ve8020.balanceOf(user1.address);
      const votingPower2 = await ve8020.balanceOf(user2.address);
      
      // Larger amount should have more voting power for same lock time
      expect(votingPower2).to.be.gt(votingPower1);
      
      // Voting power should be proportional to amount
      expect(votingPower2.div(votingPower1).toString()).to.equal("2");
    });

    it("should decrease voting power as time passes", async function () {
      // Create a lock
      const lockAmount = ethers.utils.parseEther("1000");
      const lockTime = Math.floor(Date.now() / 1000) + 365 * 86400; // 1 year
      await ve8020.connect(user1).createLock(lockAmount, lockTime);
      
      // Check initial voting power
      const initialVotingPower = await ve8020.balanceOf(user1.address);
      
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [180 * 86400]); // 180 days
      await ethers.provider.send("evm_mine");
      
      // Check new voting power
      const newVotingPower = await ve8020.balanceOf(user1.address);
      
      // Voting power should decrease as time passes
      expect(newVotingPower).to.be.lt(initialVotingPower);
    });

    it("should return zero voting power after lock expires", async function () {
      // Create a lock
      const lockAmount = ethers.utils.parseEther("1000");
      const lockTime = Math.floor(Date.now() / 1000) + 7 * 86400; // 1 week (minimum)
      await ve8020.connect(user1).createLock(lockAmount, lockTime);
      
      // Check initial voting power
      const initialVotingPower = await ve8020.balanceOf(user1.address);
      expect(initialVotingPower).to.be.gt(0);
      
      // Fast forward past lock expiration
      await ethers.provider.send("evm_increaseTime", [8 * 86400]); // 8 days
      await ethers.provider.send("evm_mine");
      
      // Check voting power after expiration
      const expiredVotingPower = await ve8020.balanceOf(user1.address);
      expect(expiredVotingPower).to.equal(0);
    });
  });

  describe("Total Voting Power", function() {
    it("should track total voting power correctly", async function () {
      // Initially total voting power should be zero
      expect(await ve8020.totalVotingPower()).to.equal(0);
      
      // Create locks
      const lockTime = Math.floor(Date.now() / 1000) + 365 * 86400; // 1 year
      await ve8020.connect(user1).createLock(ethers.utils.parseEther("1000"), lockTime);
      await ve8020.connect(user2).createLock(ethers.utils.parseEther("2000"), lockTime);
      
      // Get individual voting powers
      const votingPower1 = await ve8020.balanceOf(user1.address);
      const votingPower2 = await ve8020.balanceOf(user2.address);
      
      // Check total voting power
      const totalVotingPower = await ve8020.totalVotingPower();
      expect(totalVotingPower).to.equal(votingPower1.add(votingPower2));
    });

    it("should update total voting power when locks change", async function () {
      // Create initial lock
      const lockTime = Math.floor(Date.now() / 1000) + 365 * 86400; // 1 year
      await ve8020.connect(user1).createLock(ethers.utils.parseEther("1000"), lockTime);
      
      // Get initial total voting power
      const initialTotalPower = await ve8020.totalVotingPower();
      
      // Increase lock amount
      await ve8020.connect(user1).increaseLockAmount(ethers.utils.parseEther("500"));
      
      // Get new total voting power
      const newTotalPower = await ve8020.totalVotingPower();
      
      // Total power should increase
      expect(newTotalPower).to.be.gt(initialTotalPower);
    });

    it("should decrease total voting power when locks expire", async function () {
      // Create a lock
      const lockAmount = ethers.utils.parseEther("1000");
      const lockTime = Math.floor(Date.now() / 1000) + 7 * 86400; // 1 week (minimum)
      await ve8020.connect(user1).createLock(lockAmount, lockTime);
      
      // Get initial total voting power
      const initialTotalPower = await ve8020.totalVotingPower();
      expect(initialTotalPower).to.be.gt(0);
      
      // Fast forward past lock expiration
      await ethers.provider.send("evm_increaseTime", [8 * 86400]); // 8 days
      await ethers.provider.send("evm_mine");
      
      // Withdraw to trigger totalSupply update
      await ve8020.connect(user1).withdraw();
      
      // Check total voting power
      expect(await ve8020.totalVotingPower()).to.equal(0);
    });
  });
}); 