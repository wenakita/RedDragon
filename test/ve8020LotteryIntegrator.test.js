const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("ve8020LotteryIntegrator", function () {
  let veToken, lpToken, lottery, lotteryIntegrator;
  let owner, user1, user2, user3;
  const WEEK = 7 * 24 * 60 * 60; // 1 week in seconds
  const YEAR = 365 * 24 * 60 * 60; // 1 year in seconds
  const MAX_LOCK = 4 * YEAR; // 4 years in seconds

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();
    
    // Deploy mock LP token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    lpToken = await MockERC20.deploy("80/20 LP Token", "LP8020", ethers.parseEther("1000000"));
    
    // Deploy mock wS token for lottery
    const wrappedSonic = await MockERC20.deploy("Wrapped Sonic", "wS", ethers.parseEther("1000000"));
    
    // Deploy mock verifier for lottery
    const MockVerifier = await ethers.getContractFactory("MockRedDragonPaintSwapVerifier");
    const verifier = await MockVerifier.deploy();
    
    // Deploy mock lottery contract
    const MockRedDragonSwapLottery = await ethers.getContractFactory("MockRedDragonSwapLottery");
    lottery = await MockRedDragonSwapLottery.deploy(
      await wrappedSonic.getAddress(),
      await verifier.getAddress()
    );
    
    // Deploy ve8020 contract
    const Ve8020 = await ethers.getContractFactory("ve8020");
    veToken = await Ve8020.deploy(await lpToken.getAddress());
    
    // Deploy lottery integrator
    const LotteryIntegrator = await ethers.getContractFactory("ve8020LotteryIntegrator");
    lotteryIntegrator = await LotteryIntegrator.deploy(
      await veToken.getAddress(),
      await lottery.getAddress()
    );
    
    // Fund users with LP tokens
    await lpToken.transfer(user1.address, ethers.parseEther("10000"));
    await lpToken.transfer(user2.address, ethers.parseEther("10000"));
    await lpToken.transfer(user3.address, ethers.parseEther("10000"));
    
    // Approve ve8020 contract to spend LP tokens
    await lpToken.connect(user1).approve(await veToken.getAddress(), ethers.parseEther("10000"));
    await lpToken.connect(user2).approve(await veToken.getAddress(), ethers.parseEther("10000"));
    await lpToken.connect(user3).approve(await veToken.getAddress(), ethers.parseEther("10000"));
  });

  describe("Initialization", function () {
    it("Should initialize with correct contract addresses", async function () {
      expect(await lotteryIntegrator.veToken()).to.equal(await veToken.getAddress());
      expect(await lotteryIntegrator.lottery()).to.equal(await lottery.getAddress());
    });
    
    it("Should set integrator as the lottery's voting token", async function () {
      // Check the lottery's voting token address
      expect(await lottery.votingToken()).to.equal(await lotteryIntegrator.getAddress());
    });
  });
  
  describe("Voting Power Synchronization", function () {
    beforeEach(async function () {
      // Set up test conditions - users lock LP tokens
      const unlockTime = (await time.latest()) + MAX_LOCK;
      
      // User1: 1000 LP tokens for max time
      await veToken.connect(user1).createLock(ethers.parseEther("1000"), unlockTime);
    });
    
    it("Should sync a user's voting power to the lottery", async function () {
      // Initial voting power
      const votingPower = await veToken.balanceOf(user1.address);
      
      // Sync voting power
      await lotteryIntegrator.syncUserVotingPower(user1.address);
      
      // Check if lottery received the correct voting power
      const lotteryVotingPower = await lottery.getUserVotingPower(user1.address);
      expect(lotteryVotingPower).to.equal(votingPower);
    });
    
    it("Should allow a user to sync their own voting power", async function () {
      // User syncs their own voting power
      await lotteryIntegrator.connect(user1).syncMyVotingPower();
      
      // Check if lottery received the correct voting power
      const votingPower = await veToken.balanceOf(user1.address);
      const lotteryVotingPower = await lottery.getUserVotingPower(user1.address);
      expect(lotteryVotingPower).to.equal(votingPower);
    });
    
    it("Should support syncing multiple users at once", async function () {
      // Set up another user with LP tokens
      const unlockTime = (await time.latest()) + MAX_LOCK;
      await veToken.connect(user2).createLock(ethers.parseEther("2000"), unlockTime);
      
      // Sync both users
      await lotteryIntegrator.syncMultipleUsers([user1.address, user2.address]);
      
      // Check user1
      const votingPower1 = await veToken.balanceOf(user1.address);
      const lotteryVotingPower1 = await lottery.getUserVotingPower(user1.address);
      expect(lotteryVotingPower1).to.equal(votingPower1);
      
      // Check user2
      const votingPower2 = await veToken.balanceOf(user2.address);
      const lotteryVotingPower2 = await lottery.getUserVotingPower(user2.address);
      expect(lotteryVotingPower2).to.equal(votingPower2);
    });
    
    it("Should update voting power when a user locks more tokens", async function () {
      // Initial sync
      await lotteryIntegrator.syncUserVotingPower(user1.address);
      
      // User increases lock amount
      await veToken.connect(user1).increaseLockAmount(ethers.parseEther("500"));
      
      // Sync again
      await lotteryIntegrator.syncUserVotingPower(user1.address);
      
      // Check updated voting power
      const updatedVotingPower = await veToken.balanceOf(user1.address);
      const updatedLotteryVotingPower = await lottery.getUserVotingPower(user1.address);
      expect(updatedLotteryVotingPower).to.equal(updatedVotingPower);
    });
  });
  
  describe("Voting Token Interface", function () {
    beforeEach(async function () {
      // Set up test conditions - users lock LP tokens
      const unlockTime = (await time.latest()) + MAX_LOCK;
      
      // User1: 1000 LP tokens for max time
      await veToken.connect(user1).createLock(ethers.parseEther("1000"), unlockTime);
      
      // User2: 2000 LP tokens for half time
      await veToken.connect(user2).createLock(ethers.parseEther("2000"), (await time.latest()) + MAX_LOCK/2);
    });
    
    it("Should implement balanceOf function for the lottery", async function () {
      const votingPower = await veToken.balanceOf(user1.address);
      const integratorBalance = await lotteryIntegrator.balanceOf(user1.address);
      
      expect(integratorBalance).to.equal(votingPower);
    });
    
    it("Should implement totalSupply function for the lottery", async function () {
      const totalVotingPower = await veToken.totalVotingPower();
      const integratorTotalSupply = await lotteryIntegrator.totalSupply();
      
      expect(integratorTotalSupply).to.equal(totalVotingPower);
    });
    
    it("Should correctly calculate effective boost", async function () {
      // Mock the lottery's calculateUserBoost function to return a value
      const mockBoost = 250; // 2.5x boost
      await lottery.setMockBoost(mockBoost);
      
      // Check if integrator forwards the lottery's boost calculation
      const boost = await lotteryIntegrator.calculateEffectiveBoost(user1.address);
      expect(boost).to.equal(mockBoost);
    });
  });
  
  describe("Admin Functions", function () {
    it("Should allow owner to update lottery address", async function () {
      // Deploy a new mock lottery
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const wrappedSonic = await MockERC20.deploy("Wrapped Sonic", "wS", ethers.parseEther("1000000"));
      
      const MockVerifier = await ethers.getContractFactory("MockRedDragonPaintSwapVerifier");
      const verifier = await MockVerifier.deploy();
      
      const MockRedDragonSwapLottery = await ethers.getContractFactory("MockRedDragonSwapLottery");
      const newLottery = await MockRedDragonSwapLottery.deploy(
        await wrappedSonic.getAddress(),
        await verifier.getAddress()
      );
      
      // Update lottery address
      await lotteryIntegrator.setLotteryAddress(await newLottery.getAddress());
      
      // Check new lottery address
      expect(await lotteryIntegrator.lottery()).to.equal(await newLottery.getAddress());
      
      // Check if the new lottery has integrator set as voting token
      expect(await newLottery.votingToken()).to.equal(await lotteryIntegrator.getAddress());
    });
    
    it("Should not allow non-owner to update lottery address", async function () {
      await expect(
        lotteryIntegrator.connect(user1).setLotteryAddress(user1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    
    it("Should allow owner to update veToken address", async function () {
      // Deploy a new ve8020 token
      const Ve8020 = await ethers.getContractFactory("ve8020");
      const newVeToken = await Ve8020.deploy(await lpToken.getAddress());
      
      // Update veToken address
      await lotteryIntegrator.setVeTokenAddress(await newVeToken.getAddress());
      
      // Check new veToken address
      expect(await lotteryIntegrator.veToken()).to.equal(await newVeToken.getAddress());
    });
    
    it("Should not allow non-owner to update veToken address", async function () {
      await expect(
        lotteryIntegrator.connect(user1).setVeTokenAddress(user1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    
    it("Should not allow setting zero addresses", async function () {
      const ZERO_ADDRESS = ethers.ZeroAddress;
      
      await expect(
        lotteryIntegrator.setLotteryAddress(ZERO_ADDRESS)
      ).to.be.revertedWith("Lottery address cannot be zero");
      
      await expect(
        lotteryIntegrator.setVeTokenAddress(ZERO_ADDRESS)
      ).to.be.revertedWith("ve8020 address cannot be zero");
    });
  });
}); 