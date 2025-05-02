const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OmniDragon Test Contracts", function () {
  // Contracts
  let testVRFConsumer;
  let testCrossChainBridge;
  let testLotteryMechanics;
  let testOmniDragon;
  
  // Helper contracts
  let testWrappedSonic;
  let mockDragon;
  let mockJackpotVault;
  let mockVe69LPFeeDistributor;
  let mockChainRegistry;
  let mockSwapTrigger;
  
  // Addresses
  let owner;
  let user1;
  let user2;
  let deployer;
  
  // Constants
  const SONIC_CHAIN_ID = 146;
  const ARBITRUM_CHAIN_ID = 110;
  const INITIAL_SUPPLY = ethers.utils.parseEther("1000000");
  const USER_BALANCE = ethers.utils.parseEther("10000");
  const MIN_SWAP_AMOUNT = ethers.utils.parseEther("10");
  const WIN_THRESHOLD = 1000; // 1/1000 chance of winning
  
  beforeEach(async function () {
    [owner, user1, user2, deployer] = await ethers.getSigners();
    
    // Deploy test dragon token
    const Dragon = await ethers.getContractFactory("SimplifiedDragon");
    mockDragon = await Dragon.deploy(
      INITIAL_SUPPLY,
      ethers.constants.AddressZero // Will update this after wS is deployed
    );
    
    // The setup for individual tests
    await setupVRFTest();
    await setupCrossChainTest();
    await setupLotteryTest();
    await setupIntegrationTest();
  });
  
  async function setupVRFTest() {
    // Deploy TestVRFConsumer
    const VRFConsumer = await ethers.getContractFactory("TestVRFConsumer");
    testVRFConsumer = await VRFConsumer.deploy(mockDragon.address);
    console.log("TestVRFConsumer deployed at:", testVRFConsumer.address);
  }
  
  async function setupCrossChainTest() {
    // Deploy TestCrossChainBridge
    const CrossChainBridge = await ethers.getContractFactory("TestCrossChainBridge");
    testCrossChainBridge = await CrossChainBridge.deploy(SONIC_CHAIN_ID, "Sonic");
    console.log("TestCrossChainBridge deployed at:", testCrossChainBridge.address);
    
    // Register Arbitrum chain
    await testCrossChainBridge.registerChain(ARBITRUM_CHAIN_ID, "Arbitrum");
    
    // Register OmniDragon contracts on chains
    await testCrossChainBridge.registerContract(SONIC_CHAIN_ID, mockDragon.address);
    await testCrossChainBridge.registerContract(ARBITRUM_CHAIN_ID, ethers.constants.AddressZero); // Mock address for Arbitrum
    
    // Set initial supplies
    await testCrossChainBridge.updateChainSupply(SONIC_CHAIN_ID, INITIAL_SUPPLY);
  }
  
  async function setupLotteryTest() {
    // Deploy TestWrappedSonic
    const WrappedSonic = await ethers.getContractFactory("TestWrappedSonic");
    testWrappedSonic = await WrappedSonic.deploy();
    console.log("TestWrappedSonic deployed at:", testWrappedSonic.address);
    
    // Update wS address in Dragon token
    await mockDragon.setWrappedSonicAddress(testWrappedSonic.address);
    
    // Deploy mock swap trigger for testing
    const MockSwapTrigger = await ethers.getContractFactory("MockDragonSwapTrigger");
    mockSwapTrigger = await MockSwapTrigger.deploy(
      testWrappedSonic.address,
      mockDragon.address,
      owner.address, // Using owner as VRF for simplicity
      MIN_SWAP_AMOUNT
    );
    
    // Deploy TestLotteryMechanics
    const LotteryMechanics = await ethers.getContractFactory("TestLotteryMechanics");
    testLotteryMechanics = await LotteryMechanics.deploy(
      testWrappedSonic.address,
      mockDragon.address,
      mockSwapTrigger.address
    );
    console.log("TestLotteryMechanics deployed at:", testLotteryMechanics.address);
    
    // Mint test tokens
    await testWrappedSonic.mint(owner.address, INITIAL_SUPPLY);
    await testWrappedSonic.mint(user1.address, USER_BALANCE);
    await testWrappedSonic.mint(user2.address, USER_BALANCE);
    
    // Add some initial jackpot
    await testWrappedSonic.transfer(mockSwapTrigger.address, ethers.utils.parseEther("100"));
  }
  
  async function setupIntegrationTest() {
    // Deploy TestOmniDragon
    const OmniDragon = await ethers.getContractFactory("TestOmniDragon");
    testOmniDragon = await OmniDragon.deploy(
      deployer.address,
      user1.address,
      user2.address,
      mockDragon.address
    );
    console.log("TestOmniDragon deployed at:", testOmniDragon.address);
  }
  
  describe("TestVRFConsumer", function () {
    it("Should request and deliver randomness", async function () {
      // Use the owner's address as the callback target
      await testVRFConsumer.setCallbackTarget(mockDragon.address);
      
      // Mock a randomness request from the Dragon contract
      await mockDragon.testRequestRandomness(user1.address);
      
      // Check that the request was tracked
      const requestId = 1; // First request ID should be 1
      expect(await testVRFConsumer.requestToUser(requestId)).to.equal(user1.address);
      
      // Deliver randomness
      const randomValue = 12345;
      await testVRFConsumer.deliverRandomness(requestId, randomValue);
      
      // Verify the request was cleared (by checking it's now address zero)
      expect(await testVRFConsumer.requestToUser(requestId)).to.equal(ethers.constants.AddressZero);
    });
  });
  
  describe("TestCrossChainBridge", function () {
    it("Should register chains and track supplies", async function () {
      // Get supported chains
      const result = await testCrossChainBridge.getSupportedChains();
      expect(result.ids.length).to.equal(2); // Sonic and Arbitrum
      expect(result.ids[0]).to.equal(SONIC_CHAIN_ID);
      expect(result.ids[1]).to.equal(ARBITRUM_CHAIN_ID);
      
      // Check chain names
      expect(result.names[0]).to.equal("Sonic");
      expect(result.names[1]).to.equal("Arbitrum");
      
      // Check initial supply on Sonic
      expect(await testCrossChainBridge.chainSupplies(SONIC_CHAIN_ID)).to.equal(INITIAL_SUPPLY);
      
      // Simulate cross-chain transfer
      await testCrossChainBridge.updateChainSupply(SONIC_CHAIN_ID, INITIAL_SUPPLY.sub(ethers.utils.parseEther("1000")));
      await testCrossChainBridge.updateChainSupply(ARBITRUM_CHAIN_ID, ethers.utils.parseEther("1000"));
      
      // Check updated supplies
      expect(await testCrossChainBridge.chainSupplies(SONIC_CHAIN_ID)).to.equal(INITIAL_SUPPLY.sub(ethers.utils.parseEther("1000")));
      expect(await testCrossChainBridge.chainSupplies(ARBITRUM_CHAIN_ID)).to.equal(ethers.utils.parseEther("1000"));
      
      // Check total supply across all chains
      expect(await testCrossChainBridge.getTotalSupply()).to.equal(INITIAL_SUPPLY);
    });
    
    it("Should send and deliver cross-chain messages", async function () {
      // Create message payload
      const payload = ethers.utils.defaultAbiCoder.encode(["address", "uint256"], [user1.address, ethers.utils.parseEther("100")]);
      
      // Send message
      const tx = await testCrossChainBridge.sendMessage(
        SONIC_CHAIN_ID,
        ARBITRUM_CHAIN_ID,
        mockDragon.address,
        mockDragon.address, // Using same address for simplicity
        payload
      );
      
      const receipt = await tx.wait();
      // Find the MessageSent event
      const event = receipt.events.find(e => e.event === "MessageSent");
      expect(event).to.not.be.undefined;
      
      const messageId = event.args.messageId;
      
      // Deliver message
      await testCrossChainBridge.deliverMessage(messageId, owner.address);
      
      // Check message was marked as delivered
      const message = await testCrossChainBridge.messages(messageId);
      expect(message.delivered).to.equal(true);
    });
  });
  
  describe("TestLotteryMechanics", function () {
    it("Should allow swaps and track lottery entries", async function () {
      // Approve tokens for swap
      await testWrappedSonic.connect(user1).approve(testLotteryMechanics.address, ethers.utils.parseEther("50"));
      
      // Simulate a swap
      await testLotteryMechanics.connect(user1).simulateSwap(ethers.utils.parseEther("50"));
      
      // Check participant count
      expect(await testLotteryMechanics.getParticipantCount()).to.equal(1);
      
      // Check user entry amount
      expect(await testLotteryMechanics.userEntries(user1.address)).to.equal(ethers.utils.parseEther("50"));
    });
    
    it("Should add to jackpot and track balance", async function () {
      // Approve tokens for jackpot
      await testWrappedSonic.approve(testLotteryMechanics.address, ethers.utils.parseEther("200"));
      
      // Add to jackpot
      await testLotteryMechanics.addToJackpot(ethers.utils.parseEther("200"));
      
      // Check stats
      const stats = await testLotteryMechanics.stats();
      expect(stats.jackpotBalance).to.equal(ethers.utils.parseEther("200"));
    });
    
    it("Should simulate lottery wins", async function () {
      // Simulate a win for user2
      await testLotteryMechanics.simulateWin(user2.address, ethers.utils.parseEther("50"));
      
      // Check stats
      const stats = await testLotteryMechanics.stats();
      expect(stats.winners).to.equal(1);
      expect(stats.totalPaidOut).to.equal(ethers.utils.parseEther("50"));
    });
  });
  
  describe("TestOmniDragon Integration", function () {
    it("Should get initial test stats", async function () {
      const stats = await testOmniDragon.getTestStats();
      
      // Check that stats are returned correctly
      expect(stats.wsSupply).to.be.gt(0);
      expect(stats.dragonSupply).to.be.gt(0);
    });
    
    it("Should simulate full lottery flow", async function () {
      // Load test data
      const wrappedSonic = await testOmniDragon.wrappedSonic();
      
      // Get wrapped sonic contract
      const wS = await ethers.getContractAt("TestWrappedSonic", wrappedSonic);
      
      // Approve wrapped sonic for test omni dragon
      await wS.connect(user1).approve(testOmniDragon.address, ethers.utils.parseEther("100"));
      
      // Simulate swap from user1
      await testOmniDragon.connect(user1).simulateSwap(user1.address, ethers.utils.parseEther("100"));
      
      // Get request ID from the randomness request event
      // Note: In a real test, we'd listen for events, but for simplicity we'll
      // assume requestId 1 was generated
      const requestId = 1;
      
      // Simulate randomness delivery
      await testOmniDragon.connect(owner).simulateRandomnessDelivery(requestId, 12345);
      
      // Simulate lottery win
      await testOmniDragon.connect(owner).simulateLotteryWin(user1.address, ethers.utils.parseEther("50"));
    });
    
    it("Should simulate cross-chain transfer", async function () {
      // Simulate cross-chain transfer
      await testOmniDragon.simulateCrossChainTransfer(
        user2.address,
        ARBITRUM_CHAIN_ID,
        ethers.utils.parseEther("1000")
      );
      
      // We could add assertions here to verify that the cross-chain state was updated correctly
    });
  });
}); 