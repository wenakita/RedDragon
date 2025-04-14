const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RedDragonSwapLotteryWithScratcher", function () {
  let lottery;
  let goldScratcher;
  let owner;
  let user1;
  let user2;
  let mockWrappedSonic;
  let mockVerifier;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy mock wrapped Sonic token
    const MockToken = await ethers.getContractFactory("MockERC20");
    mockWrappedSonic = await MockToken.deploy("Wrapped Sonic", "wS");
    
    // Deploy mock verifier
    const MockVerifier = await ethers.getContractFactory("MockPaintSwapVerifier");
    mockVerifier = await MockVerifier.deploy();
    
    // Deploy lottery with scratcher support
    const LotteryContract = await ethers.getContractFactory("RedDragonSwapLotteryWithScratcher");
    lottery = await LotteryContract.deploy(mockWrappedSonic.address, mockVerifier.address);
    
    // Deploy GoldScratcherV2 contract
    const GoldScratcherV2 = await ethers.getContractFactory("GoldScratcherV2");
    goldScratcher = await GoldScratcherV2.deploy(
      "Gold Scratcher",
      "GOLD",
      "https://api.reddragon.xyz/goldscratcher/",
      "unrevealed/",
      "winner/",
      "loser/"
    );
    
    // Set up contract relationships
    await goldScratcher.setLotteryContract(lottery.address);
    await lottery.setGoldScratcher(goldScratcher.address);
    
    // Mint some tokens to the lottery contract for jackpot
    await mockWrappedSonic.mint(lottery.address, ethers.utils.parseEther("1000"));
    
    // Mint some tokens to the user
    await mockWrappedSonic.mint(user1.address, ethers.utils.parseEther("100"));
  });

  describe("Scratcher Integration", function() {
    it("should allow applying a scratcher to a swap", async function() {
      // Mint a scratcher to the user
      await goldScratcher.mint(user1.address);
      
      // Create a mock function to track the processBuy call
      const originalProcessBuy = lottery.processBuy;
      let processedUserAddress = null;
      let processedAmount = null;
      
      // Mock processBuy to track parameters
      lottery.processBuy = async (user, amount) => {
        processedUserAddress = user;
        processedAmount = amount;
        return { wait: async () => {} }; // Mock wait function
      };
      
      // Mock hasWinningScratcher to bypass check in registerWinningScratcher
      const originalHasWinningScratcher = goldScratcher.hasWinningScratcher;
      goldScratcher.hasWinningScratcher = async () => true;
      
      const swapAmount = ethers.utils.parseEther("10");
      
      // Process swap with scratcher
      await lottery.connect(owner).processSwapWithScratcher(
        user1.address,
        swapAmount,
        1 // tokenId of the scratcher
      );
      
      // Verify processBuy was called with correct parameters
      expect(processedUserAddress).to.equal(user1.address);
      expect(processedAmount).to.not.be.null;
      
      // Check that the scratcher is gone (burned)
      await expect(goldScratcher.ownerOf(1)).to.be.reverted;
      
      // Restore original functions
      lottery.processBuy = originalProcessBuy;
      goldScratcher.hasWinningScratcher = originalHasWinningScratcher;
    });
    
    it("should boost swap amount if scratcher is a winner", async function() {
      // Mint a scratcher to the user
      await goldScratcher.mint(user1.address);
      
      // Create a spy for processBuy to track values
      let processedAmount = ethers.BigNumber.from(0);
      const originalProcessBuy = lottery.processBuy;
      
      // Override processBuy to capture amount
      lottery.processBuy = async (user, amount) => {
        processedAmount = amount;
        return { wait: async () => {} }; // Mock wait function
      };
      
      // Mock hasWinningScratcher to bypass check in registerWinningScratcher
      const originalHasWinningScratcher = goldScratcher.hasWinningScratcher;
      goldScratcher.hasWinningScratcher = async () => true;
      
      // Force scratcher to be a winner
      const isWinner = true;
      const swapAmount = ethers.utils.parseEther("100");
      const boostedAmount = swapAmount.mul(10690).div(10000); // 6.9% boost
      
      // Mock applyToSwap to always return winner
      const originalApplyToSwap = goldScratcher.applyToSwap;
      goldScratcher.applyToSwap = async () => {
        return [isWinner, boostedAmount];
      };
      
      // Process swap with scratcher
      await lottery.connect(owner).processSwapWithScratcher(
        user1.address,
        swapAmount,
        1 // tokenId of the scratcher
      );
      
      // Verify amount was boosted
      expect(processedAmount).to.equal(boostedAmount);
      
      // Restore original functions
      lottery.processBuy = originalProcessBuy;
      goldScratcher.applyToSwap = originalApplyToSwap;
      goldScratcher.hasWinningScratcher = originalHasWinningScratcher;
    });
    
    it("should process the swap without a scratcher", async function() {
      // Create a spy for processBuy
      let processedAmount = ethers.BigNumber.from(0);
      const originalProcessBuy = lottery.processBuy;
      
      // Override processBuy to capture amount
      lottery.processBuy = async (user, amount) => {
        processedAmount = amount;
        return { wait: async () => {} }; // Mock wait function
      };
      
      const swapAmount = ethers.utils.parseEther("10");
      
      // Process swap without scratcher (tokenId = 0)
      await lottery.connect(owner).processSwapWithScratcher(
        user1.address,
        swapAmount,
        0 // no scratcher
      );
      
      // Verify amount was not boosted
      expect(processedAmount).to.equal(swapAmount);
      
      // Restore original function
      lottery.processBuy = originalProcessBuy;
    });
  });
}); 