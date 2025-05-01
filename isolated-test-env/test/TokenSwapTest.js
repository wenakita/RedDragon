const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Native Token Swap Tests", function () {
  // Test variables
  let owner, user1, user2;
  let mockDragon;
  let mockWrappedToken;
  let mockSwapTrigger;
  let mockVRFConsumer;
  
  // Test amounts
  const SWAP_AMOUNT = ethers.utils.parseEther("100");
  const MIN_SWAP_AMOUNT = ethers.utils.parseEther("10");
  
  // Deploy basic setup
  before(async function() {
    [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy mock contracts
    const MockWETH = await ethers.getContractFactory("MockWETH");
    mockWrappedToken = await MockWETH.deploy("Wrapped Token", "wTOKEN");
    
    const MockDragonToken = await ethers.getContractFactory("MockDragonToken");
    mockDragon = await MockDragonToken.deploy();
    
    const MockVRFConsumer = await ethers.getContractFactory("MockVRFConsumer");
    mockVRFConsumer = await MockVRFConsumer.deploy();
    
    // Mock swap trigger with basic functionality
    const MockSwapTrigger = await ethers.getContractFactory("MockDragonSwapTrigger");
    mockSwapTrigger = await MockSwapTrigger.deploy(
      mockWrappedToken.address,
      mockDragon.address,
      mockVRFConsumer.address,
      MIN_SWAP_AMOUNT
    );
    
    // Mint some wrapped tokens to users for testing
    await mockWrappedToken.deposit({ value: ethers.utils.parseEther("1000") });
    await mockWrappedToken.transfer(user1.address, ethers.utils.parseEther("500"));
    await mockWrappedToken.transfer(user2.address, ethers.utils.parseEther("200"));
    
    // Approve tokens for swap
    await mockWrappedToken.connect(user1).approve(mockSwapTrigger.address, ethers.utils.parseEther("1000"));
    await mockWrappedToken.connect(user2).approve(mockSwapTrigger.address, ethers.utils.parseEther("1000"));
    
    // Add to jackpot
    await mockWrappedToken.connect(owner).approve(mockSwapTrigger.address, ethers.utils.parseEther("1000"));
    await mockSwapTrigger.addToJackpot(ethers.utils.parseEther("1000"));
  });
  
  describe("Native Token Swap Tests", function() {
    it("Should detect swaps and trigger lottery entry", async function() {
      // Get initial balances
      const initialJackpotBalance = await mockSwapTrigger.getJackpotBalance();
      
      // Perform a swap using wrapped token
      const tx = await mockSwapTrigger.connect(user1).onSwapNativeTokenToDragon(user1.address, SWAP_AMOUNT);
      const receipt = await tx.wait();
      
      // Check events
      const swapEvent = receipt.events.find(e => e.event === "SwapDetected");
      const randomnessRequestedEvent = receipt.events.find(e => e.event === "RandomnessRequested");
      
      expect(swapEvent).to.not.be.undefined;
      expect(swapEvent.args.user).to.equal(user1.address);
      
      expect(randomnessRequestedEvent).to.not.be.undefined;
      
      // Get request ID and user
      const requestId = randomnessRequestedEvent.args.requestId;
      
      // Get the stored request data
      const requestUser = await mockSwapTrigger.requestToUser(requestId);
      expect(requestUser).to.equal(user1.address);
      
      // Check jackpot remains the same before randomness is processed
      expect(await mockSwapTrigger.getJackpotBalance()).to.equal(initialJackpotBalance);
    });
    
    it("Should properly process winning randomness", async function() {
      // Get initial balances
      const initialJackpotBalance = await mockSwapTrigger.getJackpotBalance();
      const initialUserBalance = await mockWrappedToken.balanceOf(user2.address);
      
      // Perform a swap using wrapped token
      const tx = await mockSwapTrigger.connect(user2).onSwapNativeTokenToDragon(user2.address, SWAP_AMOUNT);
      const receipt = await tx.wait();
      
      // Get the request data
      const randomnessRequestedEvent = receipt.events.find(e => e.event === "RandomnessRequested");
      const requestId = randomnessRequestedEvent.args.requestId;
      
      // Trigger a winning result (using 0 since % anything == 0)
      await mockVRFConsumer.mockResponseWinning(
        mockSwapTrigger.address,
        requestId,
        user2.address
      );
      
      // Check that user2 won the jackpot
      const finalUserBalance = await mockWrappedToken.balanceOf(user2.address);
      expect(finalUserBalance.sub(initialUserBalance)).to.equal(initialJackpotBalance.sub(SWAP_AMOUNT));
      
      // Check that the jackpot is now empty
      expect(await mockSwapTrigger.getJackpotBalance()).to.equal(0);
      
      // Check lottery stats
      const stats = await mockSwapTrigger.getStats();
      expect(stats.winners.toNumber()).to.equal(1);
      expect(stats.paidOut).to.equal(initialJackpotBalance);
      expect(stats.current).to.equal(0);
    });
    
    it("Should not pay out for non-winning randomness", async function() {
      // Refill jackpot
      await mockWrappedToken.connect(owner).approve(mockSwapTrigger.address, ethers.utils.parseEther("1000"));
      await mockSwapTrigger.addToJackpot(ethers.utils.parseEther("1000"));
      
      // Get initial balances
      const initialJackpotBalance = await mockSwapTrigger.getJackpotBalance();
      const initialUserBalance = await mockWrappedToken.balanceOf(user1.address);
      
      // Perform a swap using wrapped token
      const tx = await mockSwapTrigger.connect(user1).onSwapNativeTokenToDragon(user1.address, SWAP_AMOUNT);
      const receipt = await tx.wait();
      
      // Get request data
      const randomnessRequestedEvent = receipt.events.find(e => e.event === "RandomnessRequested");
      const requestId = randomnessRequestedEvent.args.requestId;
      
      // Trigger a non-winning result
      await mockVRFConsumer.mockResponseNotWinning(
        mockSwapTrigger.address,
        requestId,
        user1.address,
        123 // Non-zero value that won't trigger a win
      );
      
      // Check that user did not win the jackpot
      const finalUserBalance = await mockWrappedToken.balanceOf(user1.address);
      expect(finalUserBalance).to.be.below(initialUserBalance);
      
      // Check that the jackpot remains unchanged
      expect(await mockSwapTrigger.getJackpotBalance()).to.equal(initialJackpotBalance.add(SWAP_AMOUNT));
    });
    
    it("Should reject swaps below minimum amount", async function() {
      // Try a swap with an amount less than the minimum
      const smallAmount = MIN_SWAP_AMOUNT.div(2);
      
      // Get initial request count to verify no new request is created
      const initialNonce = await mockSwapTrigger.nonce();
      
      // Perform swap with small amount
      await mockSwapTrigger.connect(user1).onSwapNativeTokenToDragon(user1.address, smallAmount);
      
      // Nonce should not increase
      const finalNonce = await mockSwapTrigger.nonce();
      expect(finalNonce).to.equal(initialNonce);
    });
  });
}); 