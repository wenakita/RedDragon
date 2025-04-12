const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RedDragonLPBooster", function () {
  let owner;
  let user1;
  let user2;
  let mockWrappedSonic;
  let mockLottery;
  let mockLpToken;
  let lpBooster;
  
  // LP amounts for testing
  const MIN_LP_AMOUNT = ethers.parseEther("1"); // 1 LP token
  const TIER1_LP_AMOUNT = ethers.parseEther("10"); // 10 LP tokens
  const TIER2_LP_AMOUNT = ethers.parseEther("100"); // 100 LP tokens
  const TIER3_LP_AMOUNT = ethers.parseEther("1000"); // 1000 LP tokens

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy mock wrapped Sonic token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockWrappedSonic = await MockERC20.deploy("Mock Wrapped Sonic", "MWS", 18);
    
    // Deploy mock LP token
    mockLpToken = await MockERC20.deploy("Mock LP Token", "MLPT", 18);
    
    // Deploy a mock lottery contract with boost integration
    const MockLottery = await ethers.getContractFactory("MockRedDragonSwapLotteryWithBoost");
    mockLottery = await MockLottery.deploy(mockWrappedSonic.address);
    
    // Deploy the LP booster
    const LPBooster = await ethers.getContractFactory("RedDragonLPBooster");
    lpBooster = await LPBooster.deploy(
      mockLpToken.address,
      mockLottery.address,
      MIN_LP_AMOUNT
    );
    
    // Configure lottery to use the LP booster
    await mockLottery.setBooster(lpBooster.address);
    
    // Mint some LP tokens to users for testing
    await mockLpToken.mint(user1.address, TIER2_LP_AMOUNT); // 100 LP tokens
    await mockLpToken.mint(user2.address, TIER3_LP_AMOUNT); // 1000 LP tokens
    
    // Mint some wrapped Sonic tokens for testing lottery entries
    await mockWrappedSonic.mint(user1.address, ethers.parseEther("1000")); // 1000 tokens
    await mockWrappedSonic.mint(user2.address, ethers.parseEther("1000")); // 1000 tokens
  });

  describe("Basic Configuration", function() {
    it("Should initialize with correct parameters", async function () {
      expect(await lpBooster.lpToken()).to.equal(mockLpToken.address);
      expect(await lpBooster.lottery()).to.equal(mockLottery.address);
      expect(await lpBooster.minLpAmount()).to.equal(MIN_LP_AMOUNT);
      expect(await lpBooster.boostPercentage()).to.equal(69); // 0.69% by default
      expect(await lpBooster.boostPrecision()).to.equal(10000);
      expect(await lpBooster.useTiers()).to.equal(false);
    });

    it("Should allow owner to update boost parameters", async function () {
      const newBoostPercentage = 100; // 1%
      const newMinLpAmount = ethers.parseEther("5"); // 5 LP tokens
      
      await lpBooster.setBoostParameters(newBoostPercentage, newMinLpAmount);
      
      expect(await lpBooster.boostPercentage()).to.equal(newBoostPercentage);
      expect(await lpBooster.minLpAmount()).to.equal(newMinLpAmount);
    });
    
    it("Should not allow non-owner to update boost parameters", async function () {
      await expect(
        lpBooster.connect(user1).setBoostParameters(100, ethers.parseEther("5"))
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Simple Boost Calculation", function() {
    it("Should provide boost to users with minimum LP tokens", async function () {
      const boost = await lpBooster.calculateBoost(user1.address);
      expect(boost).to.equal(69); // 0.69% boost
    });
    
    it("Should not provide boost to users without minimum LP tokens", async function () {
      const boost = await lpBooster.calculateBoost(owner.address); // owner has no LP tokens
      expect(boost).to.equal(0);
    });
    
    it("Should apply boost correctly in the lottery contract", async function () {
      // Set up base probability in lottery (5%)
      const baseProbability = 50;
      
      // Calculate probability with boost
      const boostedProbability = await mockLottery.calculateProbabilityWithBoosts(
        user1.address,
        baseProbability
      );
      
      // Expected: baseProbability * (1 + 69/10000) = baseProbability * 1.0069
      const expectedBoostedProbability = Math.floor(baseProbability * 1.0069);
      expect(boostedProbability).to.equal(expectedBoostedProbability);
    });
    
    it("Should apply boost when processing a lottery entry", async function () {
      // Amount of wS tokens for lottery entry (500 wS)
      const wsAmount = ethers.parseEther("500"); // 500 tokens
      
      // Base probability for 500 wS
      const baseProbability = 5; // 0.5%
      
      // Process lottery entry
      const finalProbability = await mockLottery.processLotteryEntry(user1.address, wsAmount);
      
      // Expected: baseProbability * (1 + 69/10000)
      const expectedProbability = Math.floor(baseProbability * 1.0069);
      expect(finalProbability).to.equal(expectedProbability);
    });
  });

  describe("Tiered Boost System", function() {
    beforeEach(async function () {
      // Set up tiers
      await lpBooster.addBoostTier(MIN_LP_AMOUNT, 69); // Tier 1: 1 LP token, 0.69% boost
      await lpBooster.addBoostTier(TIER1_LP_AMOUNT, 150); // Tier 2: 10 LP tokens, 1.5% boost
      await lpBooster.addBoostTier(TIER2_LP_AMOUNT, 300); // Tier 3: 100 LP tokens, 3% boost
      await lpBooster.addBoostTier(TIER3_LP_AMOUNT, 500); // Tier 4: 1000 LP tokens, 5% boost
      
      // Enable tiered boosting
      await lpBooster.setUseTiers(true);
    });
    
    it("Should apply correct tier boost based on LP holdings", async function () {
      // User 1 has 100 LP tokens (Tier 3)
      const user1Boost = await lpBooster.calculateBoost(user1.address);
      expect(user1Boost).to.equal(300); // 3% boost
      
      // User 2 has 1000 LP tokens (Tier 4)
      const user2Boost = await lpBooster.calculateBoost(user2.address);
      expect(user2Boost).to.equal(500); // 5% boost
      
      // Owner has 0 LP tokens (No boost)
      const ownerBoost = await lpBooster.calculateBoost(owner.address);
      expect(ownerBoost).to.equal(0);
    });
    
    it("Should apply tiered boost correctly in the lottery contract", async function () {
      // Base probability (5%)
      const baseProbability = 50;
      
      // User 1 (100 LP, Tier 3 with 3% boost)
      const user1Probability = await mockLottery.calculateProbabilityWithBoosts(
        user1.address,
        baseProbability
      );
      
      // Expected: baseProbability * (1 + 300/10000) = baseProbability * 1.03
      const expectedUser1Probability = Math.floor(baseProbability * 1.03);
      expect(user1Probability).to.equal(expectedUser1Probability);
      
      // User 2 (1000 LP, Tier 4 with 5% boost)
      const user2Probability = await mockLottery.calculateProbabilityWithBoosts(
        user2.address,
        baseProbability
      );
      
      // Expected: baseProbability * (1 + 500/10000) = baseProbability * 1.05
      const expectedUser2Probability = Math.floor(baseProbability * 1.05);
      expect(user2Probability).to.equal(expectedUser2Probability);
    });
    
    it("Should update tier boost when LP balances change", async function () {
      // Initially user 1 has 100 LP tokens (Tier 3, 3% boost)
      expect(await lpBooster.calculateBoost(user1.address)).to.equal(300);
      
      // User 1 receives more LP tokens, moving to Tier 4
      await mockLpToken.mint(user1.address, TIER3_LP_AMOUNT);
      
      // Now user 1 has 1100 LP tokens (Tier 4)
      expect(await lpBooster.calculateBoost(user1.address)).to.equal(500);
      
      // User 2 transfers all tokens away, getting no boost
      await mockLpToken.connect(user2).transfer(owner.address, TIER3_LP_AMOUNT);
      expect(await lpBooster.calculateBoost(user2.address)).to.equal(0);
    });
  });

  describe("Lottery Integration Tests", function() {
    it("Should apply different boosts based on LP holdings for same wS amount", async function () {
      // Set up tiered boosting
      await lpBooster.addBoostTier(MIN_LP_AMOUNT, 69); // Tier 1: 1 LP token, 0.69% boost
      await lpBooster.addBoostTier(TIER2_LP_AMOUNT, 300); // Tier 3: 100 LP tokens, 3% boost
      await lpBooster.setUseTiers(true);
      
      // Amount of wS for lottery entry (500 wS)
      const wsAmount = ethers.parseEther("500"); // 500 tokens
      
      // User 1 has 100 LP tokens (Tier 3, 3% boost)
      const user1Probability = await mockLottery.processLotteryEntry(user1.address, wsAmount);
      
      // User without LP tokens (No boost)
      const ownerProbability = await mockLottery.processLotteryEntry(owner.address, wsAmount);
      
      // Verify boost was applied correctly
      expect(user1Probability).to.be.gt(ownerProbability);
      
      // Expected boost for user1: baseProbability * 1.03
      const baseProbability = await mockLottery.calculateBaseProbability(wsAmount);
      const expectedUser1Probability = Math.floor(baseProbability * 1.03);
      expect(user1Probability).to.equal(expectedUser1Probability);
    });
    
    it("Should disable boosts when useBooster is false", async function () {
      // Disable booster
      await mockLottery.setUseBooster(false);
      
      // Base probability (5%)
      const baseProbability = 50;
      
      // Calculate for user with LP tokens
      const boostedProbability = await mockLottery.calculateProbabilityWithBoosts(
        user1.address,
        baseProbability
      );
      
      // Boost should not be applied
      expect(boostedProbability).to.equal(baseProbability);
    });
    
    it("Should cap boosted probability at MAX_PROBABILITY", async function () {
      // Set a very high boost percentage
      await lpBooster.setBoostParameters(1000, MIN_LP_AMOUNT); // 10% boost
      
      // Base probability near maximum (95%)
      const highBaseProbability = 95;
      
      // Calculate with boost
      const boostedProbability = await mockLottery.calculateProbabilityWithBoosts(
        user1.address,
        highBaseProbability
      );
      
      // Expected is over 100%, but should be capped at 100%
      expect(boostedProbability).to.equal(100); // MAX_PROBABILITY constant in lottery
    });
  });

  describe("Edge Cases and Limits", function() {
    it("Should handle zero LP balance correctly", async function () {
      const boost = await lpBooster.calculateBoost(owner.address);
      expect(boost).to.equal(0);
      
      // Lottery entry for user with zero LP
      const wsAmount = ethers.parseEther("500"); // 500 tokens
      const probability = await mockLottery.processLotteryEntry(owner.address, wsAmount);
      
      // Should get base probability with no boost
      const baseProbability = await mockLottery.calculateBaseProbability(wsAmount);
      expect(probability).to.equal(baseProbability);
    });
    
    it("Should handle very small wS amounts with boost", async function () {
      // Very small wS amount
      const smallWsAmount = ethers.parseEther("0.1"); // 0.1 wS
      
      // Process entry
      const probability = await mockLottery.processLotteryEntry(user1.address, smallWsAmount);
      
      // Base probability will likely be very low, but some boost should be applied
      const baseProbability = await mockLottery.calculateBaseProbability(smallWsAmount);
      const expectedProbability = Math.floor(baseProbability * 1.0069);
      expect(probability).to.equal(expectedProbability);
    });
    
    it("Should return 0 boost for invalid LP token address", async function () {
      // Set an invalid LP token address
      await lpBooster.setLpTokenAddress(ethers.ZeroAddress);
      
      // Calculate boost (should be 0)
      const boost = await lpBooster.calculateBoost(user1.address);
      expect(boost).to.equal(0);
    });
  });
}); 