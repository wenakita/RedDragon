const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RedDragonSwapLottery", function () {
  let redDragonSwapLottery;
  let wrappedSonic;
  let verifier;
  let lpToken;
  let priceOracle;
  let owner;
  let user1;
  let user2;
  let exchangePair;
  let thankYouToken;
  let lpBooster;

  beforeEach(async function () {
    [owner, user1, user2, exchangePair] = await ethers.getSigners();

    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    wrappedSonic = await MockERC20.deploy("Wrapped Sonic", "wS", ethers.utils.parseEther("1000000"));
    await wrappedSonic.deployed();

    lpToken = await MockERC20.deploy("LP Token", "LP", ethers.utils.parseEther("1000000"));
    await lpToken.deployed();

    // Deploy mock verifier
    const MockPaintSwapVRF = await ethers.getContractFactory("MockPaintSwapVRF");
    verifier = await MockPaintSwapVRF.deploy();
    await verifier.deployed();

    // Deploy mock price oracle
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    priceOracle = await PriceOracle.deploy();
    await priceOracle.deployed();

    // Deploy mock thank you token
    const SimpleThankYouToken = await ethers.getContractFactory("SimpleThankYouToken");
    thankYouToken = await SimpleThankYouToken.deploy();
    await thankYouToken.deployed();

    // Deploy mock LP booster
    const MockLPBooster = await ethers.getContractFactory("MockRedDragonLPBooster");
    lpBooster = await MockLPBooster.deploy(lpToken.address);
    await lpBooster.deployed();

    // Deploy the lottery contract
    const RedDragonSwapLottery = await ethers.getContractFactory("RedDragonSwapLottery");
    redDragonSwapLottery = await RedDragonSwapLottery.deploy(wrappedSonic.address, verifier.address);
    await redDragonSwapLottery.deployed();

    // Setup lottery contract
    await redDragonSwapLottery.setExchangePair(exchangePair.address);
    await redDragonSwapLottery.setPriceOracle(priceOracle.address);
    await redDragonSwapLottery.setLPToken(lpToken.address);
    await redDragonSwapLottery.setThankYouToken(thankYouToken.address);
    await redDragonSwapLottery.setLPBooster(lpBooster.address);
    
    // Fund the lottery contract with wS for jackpots
    await wrappedSonic.transfer(redDragonSwapLottery.address, ethers.utils.parseEther("100000"));
    
    // Give users some wS tokens
    await wrappedSonic.transfer(user1.address, ethers.utils.parseEther("10000"));
    await wrappedSonic.transfer(user2.address, ethers.utils.parseEther("5000"));
    
    // Give users some LP tokens
    await lpToken.transfer(user1.address, ethers.utils.parseEther("1000"));
    await lpToken.transfer(user2.address, ethers.utils.parseEther("500"));

    // Record LP acquisition timestamps to satisfy holding requirement
    const lpAmount1 = ethers.utils.parseEther("1000");
    const lpAmount2 = ethers.utils.parseEther("500");
    await redDragonSwapLottery.recordLpAcquisition(user1.address, lpAmount1);
    await redDragonSwapLottery.recordLpAcquisition(user2.address, lpAmount2);
    
    // Fast-forward time to meet the LP holding requirement
    await ethers.provider.send("evm_increaseTime", [2 * 86400]); // 2 days
    await ethers.provider.send("evm_mine");
    
    // Add to jackpot
    await redDragonSwapLottery.addJackpot(ethers.utils.parseEther("1000"));
  });

  describe("Initialization", function() {
    it("should initialize with correct values", async function() {
      expect(await redDragonSwapLottery.wrappedSonic()).to.equal(wrappedSonic.address);
      expect(await redDragonSwapLottery.verifier()).to.equal(verifier.address);
      expect(await redDragonSwapLottery.exchangePair()).to.equal(exchangePair.address);
      expect(await redDragonSwapLottery.lpToken()).to.equal(lpToken.address);
      expect(await redDragonSwapLottery.isPaused()).to.equal(false);
      expect(await redDragonSwapLottery.thankYouToken()).to.equal(thankYouToken.address);
      expect(await redDragonSwapLottery.lpBooster()).to.equal(lpBooster.address);
      expect(await redDragonSwapLottery.jackpot()).to.equal(ethers.utils.parseEther("1000"));
    });
  });

  describe("Lottery Entry and Processing", function() {
    it("should process a buy and potentially update the pity boost", async function() {
      const wsAmount = ethers.utils.parseEther("100"); // 100 wS, the minimum entry
      
      // Get the initial accumulated boost
      const initialBoost = await redDragonSwapLottery.accumulatedWSBoost();
      
      // Process a buy from the exchange pair
      await redDragonSwapLottery.connect(exchangePair).processBuy(user1.address, wsAmount);
      
      // Check if pity boost was updated (it should increase when not winning)
      const newBoost = await redDragonSwapLottery.accumulatedWSBoost();
      expect(newBoost).to.be.gt(initialBoost);
    });
    
    it("should not allow non-exchange pair to process buys", async function() {
      const wsAmount = ethers.utils.parseEther("100"); // 100 wS, the minimum entry
      
      // Try to process a buy from a non-exchange pair address
      await expect(
        redDragonSwapLottery.connect(user1).processBuy(user1.address, wsAmount)
      ).to.be.revertedWith("Only exchange pair or owner can process");
    });
    
    it("should not allow entry below minimum amount", async function() {
      const wsAmount = ethers.utils.parseEther("50"); // 50 wS, below the minimum 100 wS
      
      // Process a buy with too small amount
      await expect(
        redDragonSwapLottery.connect(exchangePair).processBuy(user1.address, wsAmount)
      ).to.be.revertedWith("Amount too small for lottery");
    });
  });

  describe("Jackpot Management", function() {
    it("should add to the jackpot correctly", async function() {
      const initialJackpot = await redDragonSwapLottery.jackpot();
      const addAmount = ethers.utils.parseEther("500");
      
      await redDragonSwapLottery.addJackpot(addAmount);
      
      const newJackpot = await redDragonSwapLottery.jackpot();
      expect(newJackpot).to.equal(initialJackpot.add(addAmount));
    });
    
    it("should allow the owner to transfer jackpot in emergency", async function() {
      // Propose emergency withdraw first (due to timelock)
      const transferAmount = ethers.utils.parseEther("100");
      await redDragonSwapLottery.proposeEmergencyWithdraw(transferAmount);
      
      // Fast-forward time to pass the timelock period
      await ethers.provider.send("evm_increaseTime", [3 * 86400]); // 3 days
      await ethers.provider.send("evm_mine");
      
      // Get initial balances
      const initialJackpot = await redDragonSwapLottery.jackpot();
      const initialOwnerBalance = await wrappedSonic.balanceOf(owner.address);
      
      // Execute emergency withdraw
      await redDragonSwapLottery.executeEmergencyWithdraw(transferAmount);
      
      // Check balances after transfer
      const newJackpot = await redDragonSwapLottery.jackpot();
      const newOwnerBalance = await wrappedSonic.balanceOf(owner.address);
      
      expect(newJackpot).to.equal(initialJackpot.sub(transferAmount));
      expect(newOwnerBalance).to.equal(initialOwnerBalance.add(transferAmount));
    });
  });

  describe("Configuration Management", function() {
    it("should allow the owner to update the verifier", async function() {
      const newVerifier = user2.address;
      
      await redDragonSwapLottery.updateVerifier(newVerifier);
      
      expect(await redDragonSwapLottery.verifier()).to.equal(newVerifier);
    });
    
    it("should allow the owner to toggle USD entry mode", async function() {
      // Check initial state
      expect(await redDragonSwapLottery.useUsdEntryAmounts()).to.equal(false);
      
      // Toggle to USD mode
      await redDragonSwapLottery.toggleUsdEntryMode(true);
      
      // Check new state
      expect(await redDragonSwapLottery.useUsdEntryAmounts()).to.equal(true);
    });
    
    it("should allow the owner to set the price oracle", async function() {
      const newOracle = user2.address;
      
      await redDragonSwapLottery.setPriceOracle(newOracle);
      
      expect(await redDragonSwapLottery.priceOracle()).to.equal(newOracle);
    });
  });

  describe("Circuit Breaker", function() {
    it("should allow the owner to pause and unpause the contract", async function() {
      // Pause the contract
      await redDragonSwapLottery.setPaused(true);
      expect(await redDragonSwapLottery.isPaused()).to.equal(true);
      
      // Try to process a buy while paused
      const wsAmount = ethers.utils.parseEther("100");
      await expect(
        redDragonSwapLottery.connect(exchangePair).processBuy(user1.address, wsAmount)
      ).to.be.revertedWith("Contract is paused");
      
      // Unpause the contract
      await redDragonSwapLottery.setPaused(false);
      expect(await redDragonSwapLottery.isPaused()).to.equal(false);
      
      // Should be able to process buys again
      await redDragonSwapLottery.connect(exchangePair).processBuy(user1.address, wsAmount);
    });
  });

  describe("VRF Integration", function() {
    it("should request randomness and handle callbacks", async function() {
      // Request randomness via lottery entry
      const wsAmount = ethers.utils.parseEther("1000"); // 1000 wS
      await redDragonSwapLottery.connect(exchangePair).processBuy(user1.address, wsAmount);
      
      // Simulate VRF callback (in a real scenario, this would come from the VRF coordinator)
      // This would require mocking the VRF callback which depends on contract implementation
      // Assuming we'd have a function to test this scenario, it would verify the correct state changes
    });
  });
}); 