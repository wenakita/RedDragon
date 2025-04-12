const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RedDragonSwapLottery with Global Pity Timer", function () {
  let owner, user1, user2, user3, exchangePair;
  let wrappedSonic, verifier, lottery;

  // Constants for testing
  const ZERO_ADDRESS = ethers.ZeroAddress;
  
  beforeEach(async function () {
    // Get signers
    [owner, user1, user2, user3, exchangePair] = await ethers.getSigners();
    
    // Deploy mock wS token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    wrappedSonic = await MockERC20.deploy("Wrapped Sonic", "wS", ethers.parseEther("1000000"));
    
    // Deploy mock verifier
    const MockVerifier = await ethers.getContractFactory("MockRedDragonPaintSwapVerifier");
    verifier = await MockVerifier.deploy();
    
    // Deploy mock lottery contract (without tx.origin check)
    const MockRedDragonSwapLottery = await ethers.getContractFactory("MockRedDragonSwapLottery");
    lottery = await MockRedDragonSwapLottery.deploy(
      await wrappedSonic.getAddress(),
      await verifier.getAddress()
    );
    
    // Set exchange pair
    await lottery.setExchangePair(exchangePair.address);
    
    // Fund lottery with initial jackpot
    await wrappedSonic.transfer(await lottery.getAddress(), ethers.parseEther("1000"));
    await wrappedSonic.connect(owner).approve(await lottery.getAddress(), ethers.parseEther("10000"));
    await lottery.addToJackpot(ethers.parseEther("1000"));
    
    // Fund users with wS
    await wrappedSonic.transfer(user1.address, ethers.parseEther("10000"));
    await wrappedSonic.transfer(user2.address, ethers.parseEther("10000"));
    await wrappedSonic.transfer(user3.address, ethers.parseEther("10000"));
  });
  
  describe("Global Pity Timer Mechanism", function () {
    it("Should initialize with zero consecutive losses", async function () {
      const losses = await lottery.getGlobalConsecutiveLosses();
      expect(losses).to.equal(0);
    });
    
    it("Should have the correct last win timestamp at initialization", async function () {
      const lastWinTimestamp = await lottery.getTimeSinceLastWin();
      expect(lastWinTimestamp).to.be.lte(10); // Within 10 seconds of deployment
    });
    
    it("Should increase global pity timer for all users", async function () {
      // Directly set the global pity timer to 1
      await lottery.setGlobalPityTimer(1);
      
      // Verify global pity timer increased
      const losses = await lottery.getGlobalConsecutiveLosses();
      expect(losses).to.equal(1);
      
      // Directly set the global pity timer to 2
      await lottery.setGlobalPityTimer(2);
      
      // Verify global pity timer increased for everyone
      const losses2 = await lottery.getGlobalConsecutiveLosses();
      expect(losses2).to.equal(2);
    });
    
    it("Should increase the effective probability with global pity timer", async function () {
      // Get base probability for 100 wS
      const baseProbability = await lottery.calculateBaseProbability(ethers.parseEther("100"));
      expect(baseProbability).to.equal(1); // 0.1%
      
      // Initial effective probability should equal base probability
      const initialEffectiveProbability = await lottery.calculateEffectiveProbability(ethers.parseEther("100"));
      expect(initialEffectiveProbability).to.equal(baseProbability);
      
      // Set pity timer to 10 (simulating 10 losses)
      await lottery.setGlobalPityTimer(10);
      
      // Get the multiplier after 10 losses
      const multiplier = await lottery.getGlobalPityMultiplier();
      expect(multiplier).to.equal(200); // 100 + (10 * 10) = 200%
      
      // Verify effective probability increased for all users
      const effectiveProbability = await lottery.calculateEffectiveProbability(ethers.parseEther("100"));
      expect(effectiveProbability).to.equal(2); // 0.1% * 2 = 0.2%
    });
    
    it("Should reset pity timer for all users", async function () {
      // Set pity timer to 10 (simulating 10 losses)
      await lottery.setGlobalPityTimer(10);
      
      // Verify timer increased
      const lossesBeforeReset = await lottery.getGlobalConsecutiveLosses();
      expect(lossesBeforeReset).to.equal(10);
      
      // Reset the pity timer (simulating a win)
      await lottery.resetGlobalPityTimer();
      
      // Verify pity timer reset for everyone
      const lossesAfterReset = await lottery.getGlobalConsecutiveLosses();
      expect(lossesAfterReset).to.equal(0);
    });
    
    it("Should cap global multiplier at the maximum (5x)", async function () {
      // Set pity timer to 60 (simulating 60 losses)
      await lottery.setGlobalPityTimer(60);
      
      // Verify multiplier is capped at MAX_PITY_MULTIPLIER
      const multiplier = await lottery.getGlobalPityMultiplier();
      expect(multiplier).to.equal(600); // 100 + (5 * 100) = 600%
      
      // Verify effective probability is capped
      const effectiveProbability = await lottery.calculateEffectiveProbability(ethers.parseEther("100"));
      expect(effectiveProbability).to.equal(6); // 0.1% * 6 = 0.6%
      
      // Larger base probability should scale with multiplier but still cap at MAX_PROBABILITY
      const largeEffectiveProbability = await lottery.calculateEffectiveProbability(ethers.parseEther("10000"));
      expect(largeEffectiveProbability).to.equal(100); // Capped at 10%
    });
    
    it("Should allow owner to reset global pity timer", async function () {
      // Set pity timer to 5 (simulating 5 losses)
      await lottery.setGlobalPityTimer(5);
      
      // Verify timer increased
      const lossesBeforeReset = await lottery.getGlobalConsecutiveLosses();
      expect(lossesBeforeReset).to.equal(5);
      
      // Reset as owner
      await lottery.resetGlobalPityTimer();
      
      // Verify timer reset
      const lossesAfterReset = await lottery.getGlobalConsecutiveLosses();
      expect(lossesAfterReset).to.equal(0);
    });
    
    it("Should allow owner to set global pity timer", async function () {
      // Set timer to a specific value
      await lottery.setGlobalPityTimer(15);
      
      // Verify timer was set correctly
      const losses = await lottery.getGlobalConsecutiveLosses();
      expect(losses).to.equal(15);
      
      // Verify multiplier is correct
      const multiplier = await lottery.getGlobalPityMultiplier();
      expect(multiplier).to.equal(250); // 100 + (15 * 10) = 250%
    });
    
    it("Should prevent non-owners from resetting or setting pity timer", async function () {
      await expect(lottery.connect(user1).resetGlobalPityTimer())
        .to.be.revertedWith("Ownable: caller is not the owner");
        
      await expect(lottery.connect(user1).setGlobalPityTimer(10))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
}); 