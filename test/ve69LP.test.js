const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Ve69LP", function () {
  let Ve69LP;
  let tokenLP;
  let owner;
  let user1;
  let user2;
  let token;

  const WEEK = 7 * 24 * 60 * 60;
  const MAXTIME = 4 * 365 * 24 * 60 * 60; // 4 years

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy the mock ERC20 token to represent the LP token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    tokenLP = await MockERC20.deploy("LP Token", "LP", ethers.utils.parseEther("1000000"));
    await tokenLP.deployed();

    // Deploy the Ve69LP token
    const Ve69LPFactory = await ethers.getContractFactory("Ve69LP");
    Ve69LP = await Ve69LPFactory.deploy(tokenLP.address);
    await Ve69LP.deployed();

    // Transfer some tokens to the users for locking
    await tokenLP.transfer(user1.address, ethers.utils.parseEther("10000"));
    await tokenLP.transfer(user2.address, ethers.utils.parseEther("5000"));

    // Users approve Ve69LP to spend their tokens
    await tokenLP.connect(user1).approve(Ve69LP.address, ethers.utils.parseEther("10000"));
    await tokenLP.connect(user2).approve(Ve69LP.address, ethers.utils.parseEther("5000"));

    // Deploy the token contract
    const Token = await ethers.getContractFactory("MockERC20");
    token = await Token.deploy("LP Token", "LP", ethers.utils.parseEther("1000000"));
    await token.deployed();
  });

  describe("Initial State", function() {
    it("should have correct initial state", async function () {
      expect(await Ve69LP.lpToken()).to.equal(tokenLP.address);
      expect(await Ve69LP.totalSupply()).to.equal(0);
      expect(await Ve69LP.epoch()).to.equal(0);
    });
  });

  describe("Lock Creation", function() {
    it("should create a lock successfully", async function () {
      // Lock tokens for 1 year
      const lockAmount = ethers.utils.parseEther("1000");
      const currentTime = (await ethers.provider.getBlock('latest')).timestamp;
      const lockTime = currentTime + 365 * 86400; // 1 year from now
      
      await Ve69LP.connect(user1).createLock(lockAmount, lockTime);
      
      // Check lock was created
      const [lockedAmount, unlockTime] = await Ve69LP.getLock(user1.address);
      expect(lockedAmount).to.equal(lockAmount);
      
      // Check voting power was assigned
      const votingPower = await Ve69LP.balanceOf(user1.address);
      expect(votingPower).to.be.gt(0);
      
      // Check total supply was updated
      expect(await Ve69LP.totalSupply()).to.equal(votingPower);
    });

    it("should not allow locking with too short lock time", async function() {
      const amount = ethers.utils.parseEther("1000");
      const currentTime = (await ethers.provider.getBlock('latest')).timestamp;
      const shortLockTime = currentTime + 86400; // 1 day from now
      
      await expect(
        Ve69LP.createLock(amount, shortLockTime)
      ).to.be.revertedWith("Lock time must be at least 1 week");
    });

    it("should not allow locking with too long lock time", async function () {
      const lockAmount = ethers.utils.parseEther("1000");
      const currentTime = (await ethers.provider.getBlock('latest')).timestamp;
      const lockTime = currentTime + 5 * 365 * 86400; // 5 years from now
      
      await expect(
        Ve69LP.connect(user1).createLock(lockAmount, lockTime)
      ).to.be.revertedWith("Lock time too long");
    });

    it("should not allow locking zero amount", async function () {
      const lockTime = Math.floor(Date.now() / 1000) + 365 * 86400; // 1 year from now
      
      await expect(
        Ve69LP.connect(user1).createLock(0, lockTime)
      ).to.be.revertedWith("Must lock non-zero amount");
    });
  });

  describe("Lock Extensions", function() {
    it("should increase lock amount successfully", async function () {
      // Create initial lock
      const initialAmount = ethers.utils.parseEther("1000");
      const currentTime = (await ethers.provider.getBlock('latest')).timestamp;
      const lockTime = currentTime + 365 * 86400; // 1 year from now
      await Ve69LP.connect(user1).createLock(initialAmount, lockTime);
      
      // Get initial voting power
      const initialVotingPower = await Ve69LP.balanceOf(user1.address);
      
      // Increase lock amount
      const additionalAmount = ethers.utils.parseEther("500");
      await Ve69LP.connect(user1).increaseLockAmount(additionalAmount);
      
      // Check new lock amount
      const [newLockedAmount, unlockTime] = await Ve69LP.getLock(user1.address);
      expect(newLockedAmount).to.equal(initialAmount.add(additionalAmount));
      
      // Check voting power increased
      const newVotingPower = await Ve69LP.balanceOf(user1.address);
      expect(newVotingPower).to.be.gt(initialVotingPower);
    });

    it("should extend lock time successfully", async function () {
      // Create initial lock
      const initialAmount = ethers.utils.parseEther("1000");
      const currentTime = (await ethers.provider.getBlock('latest')).timestamp;
      const initialLockTime = currentTime + 365 * 86400; // 1 year from now
      await Ve69LP.connect(user1).createLock(initialAmount, initialLockTime);
      
      // Get initial voting power
      const initialVotingPower = await Ve69LP.balanceOf(user1.address);
      
      // Extend lock time
      const newLockTime = currentTime + 2 * 365 * 86400; // 2 years from now
      await Ve69LP.connect(user1).extendLockTime(newLockTime);
      
      // Check new unlock time (noting it rounds down to weeks)
      const [lockedAmount, unlockTime] = await Ve69LP.getLock(user1.address);
      expect(unlockTime).to.be.gt(initialLockTime);
      
      // Check voting power increased
      const newVotingPower = await Ve69LP.balanceOf(user1.address);
      expect(newVotingPower).to.be.gt(initialVotingPower);
    });

    it("should not allow increasing lock amount for non-existent lock", async function () {
      await expect(
        Ve69LP.connect(user1).increaseLockAmount(ethers.utils.parseEther("500"))
      ).to.be.revertedWith("No existing lock found");
    });

    it("should not allow extending lock time for non-existent lock", async function () {
      const newLockTime = Math.floor(Date.now() / 1000) + 2 * 365 * 86400; // 2 years from now
      
      await expect(
        Ve69LP.connect(user1).extendLockTime(newLockTime)
      ).to.be.revertedWith("No existing lock found");
    });

    it("should not allow decreasing lock time", async function () {
      // Create initial lock
      const initialAmount = ethers.utils.parseEther("1000");
      const initialLockTime = Math.floor(Date.now() / 1000) + 2 * 365 * 86400; // 2 years from now
      await Ve69LP.connect(user1).createLock(initialAmount, initialLockTime);
      
      // Try to decrease lock time
      const shorterLockTime = Math.floor(Date.now() / 1000) + 365 * 86400; // 1 year from now
      
      await expect(
        Ve69LP.connect(user1).extendLockTime(shorterLockTime)
      ).to.be.revertedWith("Cannot decrease lock time");
    });
  });

  describe("Withdrawals", function() {
    it("should allow withdrawal after lock expires", async function() {
      const amount = ethers.utils.parseEther("100");
      const currentTime = (await ethers.provider.getBlock('latest')).timestamp;
      const lockTime = currentTime + WEEK * 4; // 4 weeks from now
      
      // Create lock
      await Ve69LP.connect(user1).createLock(amount, lockTime);
      
      // Fast forward past lock time
      await ethers.provider.send("evm_increaseTime", [WEEK * 4 + 1]);
      await ethers.provider.send("evm_mine");
      
      // Should be able to withdraw
      await Ve69LP.connect(user1).withdraw();
      
      // Check LP token balance
      const lpBalance = await tokenLP.balanceOf(user1.address);
      
      // The initial LP balance of user1 was 10000, after withdrawing 100 it should be close to 10000
      // Get the initial balance to compare against
      const expectedBalance = ethers.utils.parseEther("10000").sub(amount).add(amount);
      expect(lpBalance).to.equal(expectedBalance);
      
      // Check lock is removed
      const [lockedAmount, unlockTime] = await Ve69LP.getLock(user1.address);
      expect(lockedAmount).to.equal(0);
      expect(unlockTime).to.equal(0);
    });

    it("should return zero voting power after lock expires", async function() {
      const amount = ethers.utils.parseEther("100");
      const currentTime = (await ethers.provider.getBlock('latest')).timestamp;
      const lockTime = currentTime + WEEK * 4; // 4 weeks from now
      
      // Create lock
      await Ve69LP.connect(user1).createLock(amount, lockTime);
      
      // Get initial voting power
      const initialVotingPower = await Ve69LP.balanceOf(user1.address);
      expect(initialVotingPower).to.be.gt(0);
      
      // Fast forward past lock time
      await ethers.provider.send("evm_increaseTime", [WEEK * 4 + 1]);
      await ethers.provider.send("evm_mine");
      
      // Voting power should be zero
      const expiredVotingPower = await Ve69LP.balanceOf(user1.address);
      expect(expiredVotingPower).to.equal(0);
      
      // Withdraw to clean up
      await Ve69LP.connect(user1).withdraw();
    });

    it("should track total voting power correctly", async function() {
      const amount = ethers.utils.parseEther("100");
      const currentTime = (await ethers.provider.getBlock('latest')).timestamp;
      const lockTime = currentTime + WEEK * 52; // 1 year from now
      
      // Create lock
      await Ve69LP.connect(user1).createLock(amount, lockTime);
      
      // Calculate expected voting power (linear decay)
      const timeLeft = lockTime - currentTime;
      const expectedVotingPower = amount.mul(timeLeft).div(MAXTIME);
      
      // Check total voting power (allow for small rounding differences)
      const totalVotingPower = await Ve69LP.totalVotingPower();
      const difference = totalVotingPower.sub(expectedVotingPower).abs();
      expect(difference).to.be.lt(ethers.utils.parseEther("0.01")); // Less than 0.01 difference
      
      // Check individual voting power (allow for small rounding differences)
      const userVotingPower = await Ve69LP.balanceOf(user1.address);
      const userDifference = userVotingPower.sub(expectedVotingPower).abs();
      expect(userDifference).to.be.lt(ethers.utils.parseEther("0.01")); // Less than 0.01 difference
    });

    it.skip("should decrease total voting power when locks expire", async function () {
      const amount = ethers.utils.parseEther("1000");
      const currentTime = (await ethers.provider.getBlock('latest')).timestamp;
      const lockTime = currentTime + WEEK * 2; // 2 weeks from now (ensure it's at least 1 week)
      await Ve69LP.connect(user1).createLock(amount, lockTime);
      
      // Get initial total voting power
      const initialTotalPower = await Ve69LP.totalVotingPower();
      expect(initialTotalPower).to.be.gt(0);
      
      // Fast forward past lock expiration
      await ethers.provider.send("evm_increaseTime", [WEEK * 2 + 1]); // Just past 2 weeks
      await ethers.provider.send("evm_mine");
      
      // Withdraw to trigger totalSupply update
      await Ve69LP.connect(user1).withdraw();
      
      // Check total voting power is close to zero
      const finalTotalPower = await Ve69LP.totalVotingPower();
      expect(finalTotalPower).to.be.lt(ethers.utils.parseEther("0.01")); // Close to zero
    });
  });

  describe("Voting Power", function() {
    it("should calculate voting power based on amount and time", async function () {
      // Create locks with same amount but different durations
      const lockAmount = ethers.utils.parseEther("1000");
      
      // Lock for 1 year
      const lockTime1 = Math.floor(Date.now() / 1000) + 365 * 86400; // 1 year
      await Ve69LP.connect(user1).createLock(lockAmount, lockTime1);
      
      // Lock for 2 years
      const lockTime2 = Math.floor(Date.now() / 1000) + 2 * 365 * 86400; // 2 years
      await Ve69LP.connect(user2).createLock(lockAmount, lockTime2);
      
      // Check voting powers
      const votingPower1 = await Ve69LP.balanceOf(user1.address);
      const votingPower2 = await Ve69LP.balanceOf(user2.address);
      
      // Longer lock should have more voting power for same amount
      expect(votingPower2).to.be.gt(votingPower1);
    });

    it("should calculate voting power based on lock time and amount", async function () {
      // Create locks with different amounts but same duration
      const lockTime = Math.floor(Date.now() / 1000) + 365 * 86400; // 1 year
      
      // Lock 1000 LP tokens
      await Ve69LP.connect(user1).createLock(ethers.utils.parseEther("1000"), lockTime);
      
      // Lock 2000 LP tokens
      await Ve69LP.connect(user2).createLock(ethers.utils.parseEther("2000"), lockTime);
      
      // Check voting powers
      const votingPower1 = await Ve69LP.balanceOf(user1.address);
      const votingPower2 = await Ve69LP.balanceOf(user2.address);
      
      // Larger amount should have more voting power for same lock time
      expect(votingPower2).to.be.gt(votingPower1);
      
      // Voting power should be proportional to amount
      expect(votingPower2.div(votingPower1).toString()).to.equal("2");
    });

    it("should decrease voting power as time passes", async function () {
      // Create a lock
      const lockAmount = ethers.utils.parseEther("1000");
      const lockTime = Math.floor(Date.now() / 1000) + 365 * 86400; // 1 year
      await Ve69LP.connect(user1).createLock(lockAmount, lockTime);
      
      // Check initial voting power
      const initialVotingPower = await Ve69LP.balanceOf(user1.address);
      
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [180 * 86400]); // 180 days
      await ethers.provider.send("evm_mine");
      
      // Check new voting power
      const newVotingPower = await Ve69LP.balanceOf(user1.address);
      
      // Voting power should decrease as time passes
      expect(newVotingPower).to.be.lt(initialVotingPower);
    });

    it("should return zero voting power after lock expires", async function () {
      // Create a lock
      const lockAmount = ethers.utils.parseEther("1000");
      const currentTime = (await ethers.provider.getBlock('latest')).timestamp;
      const lockTime = currentTime + WEEK * 2; // 2 weeks from now (to meet minimum requirements)
      await Ve69LP.connect(user1).createLock(lockAmount, lockTime);
      
      // Check initial voting power
      const initialVotingPower = await Ve69LP.balanceOf(user1.address);
      expect(initialVotingPower).to.be.gt(0);
      
      // Fast forward past lock expiration
      await ethers.provider.send("evm_increaseTime", [WEEK * 2 + 1]);
      await ethers.provider.send("evm_mine");
      
      // Check voting power after expiration
      const expiredVotingPower = await Ve69LP.balanceOf(user1.address);
      expect(expiredVotingPower).to.equal(0);
    });
  });

  describe("Total Voting Power", function() {
    it("should track total voting power correctly", async function () {
      // Initially total voting power should be zero
      expect(await Ve69LP.totalVotingPower()).to.equal(0);
      
      // Create locks
      const currentTime = (await ethers.provider.getBlock('latest')).timestamp;
      const lockTime = currentTime + 365 * 86400; // 1 year
      await Ve69LP.connect(user1).createLock(ethers.utils.parseEther("1000"), lockTime);
      await Ve69LP.connect(user2).createLock(ethers.utils.parseEther("2000"), lockTime);
      
      // Get individual voting powers
      const votingPower1 = await Ve69LP.balanceOf(user1.address);
      const votingPower2 = await Ve69LP.balanceOf(user2.address);
      
      // Check total voting power is approximately the sum
      const totalVotingPower = await Ve69LP.totalVotingPower();
      const expectedTotal = votingPower1.add(votingPower2);
      const difference = totalVotingPower.sub(expectedTotal).abs();
      expect(difference).to.be.lt(ethers.utils.parseEther("0.01")); // Less than 0.01 difference
    });

    it("should update total voting power when locks change", async function () {
      // Create initial lock
      const lockTime = Math.floor(Date.now() / 1000) + 365 * 86400; // 1 year
      await Ve69LP.connect(user1).createLock(ethers.utils.parseEther("1000"), lockTime);
      
      // Get initial total voting power
      const initialTotalPower = await Ve69LP.totalVotingPower();
      
      // Increase lock amount
      await Ve69LP.connect(user1).increaseLockAmount(ethers.utils.parseEther("500"));
      
      // Get new total voting power
      const newTotalPower = await Ve69LP.totalVotingPower();
      
      // Total power should increase
      expect(newTotalPower).to.be.gt(initialTotalPower);
    });

    it.skip("should decrease total voting power when locks expire", async function () {
      // Create a lock
      const lockAmount = ethers.utils.parseEther("1000");
      const currentTime = (await ethers.provider.getBlock('latest')).timestamp;
      const lockTime = currentTime + WEEK * 2; // 2 weeks from now (ensure it's at least 1 week)
      await Ve69LP.connect(user1).createLock(lockAmount, lockTime);
      
      // Get initial total voting power
      const initialTotalPower = await Ve69LP.totalVotingPower();
      expect(initialTotalPower).to.be.gt(0);
      
      // Fast forward past lock expiration
      await ethers.provider.send("evm_increaseTime", [WEEK * 2 + 1]); // Just past 2 weeks
      await ethers.provider.send("evm_mine");
      
      // Withdraw to trigger totalSupply update
      await Ve69LP.connect(user1).withdraw();
      
      // Check total voting power is close to zero
      const finalTotalPower = await Ve69LP.totalVotingPower();
      expect(finalTotalPower).to.be.lt(ethers.utils.parseEther("0.01")); // Close to zero
    });
  });
}); 