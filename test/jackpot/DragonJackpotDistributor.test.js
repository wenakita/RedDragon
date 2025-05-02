const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DragonJackpotDistributor", function () {
  let jackpotDistributor;
  let wrappedSonic;
  let owner;
  let user1;
  let user2;
  let user3;

  const INITIAL_JACKPOT = ethers.utils.parseEther("100000");
  const DEFAULT_DISTRIBUTION_PERCENTAGE = 69; // 69%

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy mock Wrapped Sonic token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    wrappedSonic = await MockERC20.deploy("Wrapped Sonic", "wS", ethers.utils.parseEther("1000000"));
    await wrappedSonic.deployed();

    // Deploy DragonJackpotDistributor
    const DragonJackpotDistributor = await ethers.getContractFactory("DragonJackpotDistributor");
    jackpotDistributor = await DragonJackpotDistributor.deploy(wrappedSonic.address);
    await jackpotDistributor.deployed();

    // Fund jackpot distributor
    await wrappedSonic.transfer(jackpotDistributor.address, INITIAL_JACKPOT);
    await jackpotDistributor.addToJackpot(INITIAL_JACKPOT);

    // Register participants
    await jackpotDistributor.registerParticipant(user1.address);
    await jackpotDistributor.registerParticipant(user2.address);
    await jackpotDistributor.registerParticipant(user3.address);
  });

  describe("Jackpot Distribution Percentage", function () {
    it("should initialize with the correct default jackpot distribution percentage", async function () {
      const percentage = await jackpotDistributor.getJackpotDistributionPercentage();
      expect(percentage).to.equal(ethers.utils.parseUnits(DEFAULT_DISTRIBUTION_PERCENTAGE.toString(), 16));
    });

    it("should allow owner to update jackpot distribution percentage", async function () {
      const newPercentage = 75; // 75%
      await jackpotDistributor.updateJackpotDistributionPercentage(ethers.utils.parseUnits(newPercentage.toString(), 16));
      
      const percentage = await jackpotDistributor.getJackpotDistributionPercentage();
      expect(percentage).to.equal(ethers.utils.parseUnits(newPercentage.toString(), 16));
    });

    it("should not allow setting jackpot distribution percentage below 59%", async function () {
      const lowPercentage = 58; // 58%
      await expect(
        jackpotDistributor.updateJackpotDistributionPercentage(ethers.utils.parseUnits(lowPercentage.toString(), 16))
      ).to.be.revertedWith("Percentage too low");
    });

    it("should not allow setting jackpot distribution percentage above 79%", async function () {
      const highPercentage = 80; // 80%
      await expect(
        jackpotDistributor.updateJackpotDistributionPercentage(ethers.utils.parseUnits(highPercentage.toString(), 16))
      ).to.be.revertedWith("Percentage too high");
    });
  });

  describe("Partial Jackpot Distribution", function () {
    it("should only distribute the specified percentage of the jackpot", async function () {
      // Get initial jackpot amount
      const initialJackpot = await jackpotDistributor.undistributedJackpot();
      
      // Calculate expected distribution amount (69% of jackpot)
      const distributionPercentage = await jackpotDistributor.getJackpotDistributionPercentage();
      const expectedDistributionAmount = initialJackpot.mul(distributionPercentage).div(ethers.constants.WeiPerEther);
      const expectedRemainingAmount = initialJackpot.sub(expectedDistributionAmount);
      
      // Distribute jackpot
      await jackpotDistributor.distributeJackpot(user1.address, [], []);
      
      // Check remaining jackpot
      const remainingJackpot = await jackpotDistributor.undistributedJackpot();
      expect(remainingJackpot).to.equal(expectedRemainingAmount);
    });

    it("should correctly distribute the partial jackpot to winners", async function () {
      // Get projected distribution
      const projection = await jackpotDistributor.getProjectedDistribution();
      const distributionAmount = projection.distributionAmount;
      const mainPrizePercentage = projection.mainPrize;
      
      // Calculate expected main prize amount
      const expectedMainPrizeAmount = distributionAmount.mul(mainPrizePercentage).div(ethers.constants.WeiPerEther);
      
      // Record balances before distribution
      const user1BalanceBefore = await wrappedSonic.balanceOf(user1.address);
      
      // Distribute jackpot
      await jackpotDistributor.distributeJackpot(user1.address, [], []);
      
      // Check user received the correct amount
      const user1BalanceAfter = await wrappedSonic.balanceOf(user1.address);
      const user1Received = user1BalanceAfter.sub(user1BalanceBefore);
      
      expect(user1Received).to.equal(expectedMainPrizeAmount);
    });

    it("should correctly handle secondary winners with partial distribution", async function () {
      // Get projected distribution
      const projection = await jackpotDistributor.getProjectedDistribution();
      const distributionAmount = projection.distributionAmount;
      const secondaryPrizePercentage = projection.secondaryPrize;
      
      // Calculate expected secondary prize pool
      const secondaryPrizePool = distributionAmount.mul(secondaryPrizePercentage).div(ethers.constants.WeiPerEther);
      
      // Set up secondary winner shares (50/50 split between user2 and user3)
      const secondaryWinners = [user2.address, user3.address];
      const secondaryShares = [
        ethers.utils.parseEther("0.5"),
        ethers.utils.parseEther("0.5")
      ];
      
      // Record balances before distribution
      const user1BalanceBefore = await wrappedSonic.balanceOf(user1.address);
      const user2BalanceBefore = await wrappedSonic.balanceOf(user2.address);
      const user3BalanceBefore = await wrappedSonic.balanceOf(user3.address);
      
      // Distribute jackpot
      await jackpotDistributor.distributeJackpot(user1.address, secondaryWinners, secondaryShares);
      
      // Check user2 and user3 received their shares of secondary prize
      const user2BalanceAfter = await wrappedSonic.balanceOf(user2.address);
      const user3BalanceAfter = await wrappedSonic.balanceOf(user3.address);
      
      const user2Received = user2BalanceAfter.sub(user2BalanceBefore);
      const user3Received = user3BalanceAfter.sub(user3BalanceBefore);
      
      // Each should receive approximately half of the secondary prize pool
      expect(user2Received).to.be.closeTo(secondaryPrizePool.div(2), ethers.utils.parseEther("0.0001"));
      expect(user3Received).to.be.closeTo(secondaryPrizePool.div(2), ethers.utils.parseEther("0.0001"));
    });

    it("should correctly update state for the next round", async function () {
      // Get initial round and jackpot amount
      const initialRound = await jackpotDistributor.currentRound();
      const initialJackpot = await jackpotDistributor.undistributedJackpot();
      
      // Distribute jackpot
      await jackpotDistributor.distributeJackpot(user1.address, [], []);
      
      // Check round has incremented
      const newRound = await jackpotDistributor.currentRound();
      expect(newRound).to.equal(initialRound.add(1));
      
      // Check participant tracking is reset
      const isParticipant = await jackpotDistributor.isParticipant(user1.address);
      expect(isParticipant).to.be.false;
      
      // Check jackpot is partially preserved
      const remainingJackpot = await jackpotDistributor.undistributedJackpot();
      expect(remainingJackpot).to.be.gt(0);
      expect(remainingJackpot).to.be.lt(initialJackpot);
      
      // Check distribution percentage is preserved
      const distributionPercentage = await jackpotDistributor.getJackpotDistributionPercentage();
      expect(distributionPercentage).to.equal(ethers.utils.parseUnits(DEFAULT_DISTRIBUTION_PERCENTAGE.toString(), 16));
    });
  });

  describe("Multiple Rounds", function () {
    it("should maintain jackpot continuity across multiple rounds", async function () {
      // Track jackpot amount through rounds
      const initialJackpot = await jackpotDistributor.undistributedJackpot();
      
      // Round 1 distribution
      await jackpotDistributor.distributeJackpot(user1.address, [], []);
      const jackpotAfterRound1 = await jackpotDistributor.undistributedJackpot();
      
      // Re-register participants for round 2
      await jackpotDistributor.registerParticipant(user1.address);
      await jackpotDistributor.registerParticipant(user2.address);
      
      // Add more to jackpot
      await wrappedSonic.transfer(jackpotDistributor.address, ethers.utils.parseEther("50000"));
      await jackpotDistributor.addToJackpot(ethers.utils.parseEther("50000"));
      
      const jackpotBeforeRound2 = await jackpotDistributor.undistributedJackpot();
      
      // Round 2 distribution
      await jackpotDistributor.distributeJackpot(user2.address, [], []);
      const jackpotAfterRound2 = await jackpotDistributor.undistributedJackpot();
      
      // Verify jackpot behavior
      expect(jackpotAfterRound1).to.be.lt(initialJackpot);
      expect(jackpotBeforeRound2).to.be.gt(jackpotAfterRound1); // Added more funds
      expect(jackpotAfterRound2).to.be.lt(jackpotBeforeRound2); // Distributed some
      expect(jackpotAfterRound2).to.be.gt(0); // Still has funds
    });
  });
}); 