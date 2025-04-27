const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Cross-Chain VRF Solution", function () {
  let ArbitrumVRFRequester;
  let SonicVRFConsumer;
  let EnhancedSonicVRFConsumer;
  let LayerZeroEndpointMock;
  let VRFCoordinatorMock;
  
  let arbitrumVRFRequester;
  let sonicVRFConsumer;
  let enhancedVRFConsumer;
  let lzEndpointMock;
  let vrfCoordinatorMock;
  let mockDragonToken;
  let mockWrappedSonic;
  
  let owner;
  let user1;
  let user2;
  
  // Constants for tests
  const ARBITRUM_CHAIN_ID = 110;
  const SONIC_CHAIN_ID = 198;
  const READ_CHANNEL_ID = 5;
  const SUBSCRIPTION_ID = 12345;
  const KEY_HASH = "0x8472ba59cf7134dfe321f4d61a430c4857e8b19cdd5230b09952a92671c24409";
  
  // Helper function to generate LayerZero encoded address
  function lzEncodedAddr(addr) {
    return ethers.utils.solidityPack(
      ["address", "address"],
      [addr, ethers.constants.AddressZero]
    );
  }
  
  beforeEach(async function () {
    // Get contract factories
    [owner, user1, user2] = await ethers.getSigners();
    
    // Mock contracts
    const MockDragonToken = await ethers.getContractFactory("MockDragonToken");
    const MockWrappedSonic = await ethers.getContractFactory("MockWrappedSonic");
    
    // Mock LayerZero Endpoint
    const MockLzEndpoint = await ethers.getContractFactory("MockLzEndpoint");
    
    // Mock VRF Coordinator
    const MockVRFCoordinator = await ethers.getContractFactory("MockVRFCoordinatorV2");
    
    // Actual contracts
    ArbitrumVRFRequester = await ethers.getContractFactory("ArbitrumVRFRequester");
    SonicVRFConsumer = await ethers.getContractFactory("SonicVRFConsumer");
    EnhancedSonicVRFConsumer = await ethers.getContractFactory("EnhancedSonicVRFConsumer");
    
    // Deploy mocks
    mockDragonToken = await MockDragonToken.deploy();
    mockWrappedSonic = await MockWrappedSonic.deploy();
    
    // Deploy mock endpoints (one for each chain)
    const lzEndpointArbitrum = await MockLzEndpoint.deploy(ARBITRUM_CHAIN_ID);
    const lzEndpointSonic = await MockLzEndpoint.deploy(SONIC_CHAIN_ID);
    
    // Deploy mock VRF coordinator
    vrfCoordinatorMock = await MockVRFCoordinator.deploy();
    
    // Deploy Arbitrum VRF Requester
    arbitrumVRFRequester = await ArbitrumVRFRequester.deploy(
      vrfCoordinatorMock.address,
      SUBSCRIPTION_ID,
      KEY_HASH,
      lzEndpointArbitrum.address,
      SONIC_CHAIN_ID,
      ethers.constants.AddressZero // Will be updated later
    );
    
    // Deploy Sonic VRF Consumer
    sonicVRFConsumer = await SonicVRFConsumer.deploy(
      lzEndpointSonic.address,
      ARBITRUM_CHAIN_ID,
      arbitrumVRFRequester.address,
      mockWrappedSonic.address,
      mockDragonToken.address
    );
    
    // Deploy Enhanced Sonic VRF Consumer
    enhancedVRFConsumer = await EnhancedSonicVRFConsumer.deploy(
      lzEndpointSonic.address,
      ARBITRUM_CHAIN_ID,
      arbitrumVRFRequester.address,
      mockWrappedSonic.address,
      mockDragonToken.address,
      owner.address // Delegate
    );
    
    // Update Arbitrum VRF Requester with Sonic consumer address
    await arbitrumVRFRequester.setSonicVRFConsumer(sonicVRFConsumer.address);
    
    // Set up mocked connections (connect the endpoints)
    await lzEndpointArbitrum.setDestLzEndpoint(sonicVRFConsumer.address, lzEndpointSonic.address);
    await lzEndpointSonic.setDestLzEndpoint(arbitrumVRFRequester.address, lzEndpointArbitrum.address);
    
    // Set the endpoints for reference in tests
    lzEndpointMock = lzEndpointSonic;
    
    // Fund contracts (this would happen in production too)
    await owner.sendTransaction({
      to: arbitrumVRFRequester.address,
      value: ethers.utils.parseEther("1.0")
    });
    
    await owner.sendTransaction({
      to: sonicVRFConsumer.address,
      value: ethers.utils.parseEther("1.0")
    });
    
    await owner.sendTransaction({
      to: enhancedVRFConsumer.address,
      value: ethers.utils.parseEther("1.0")
    });
    
    // Set up mock DRAGON token
    await mockDragonToken.setExchangePair(owner.address);
    
    // Fund the jackpot
    await mockWrappedSonic.mint(owner.address, ethers.utils.parseEther("1000"));
    await mockWrappedSonic.approve(sonicVRFConsumer.address, ethers.utils.parseEther("100"));
    await sonicVRFConsumer.addToJackpot(ethers.utils.parseEther("100"));
  });
  
  describe("Basic Configuration", function () {
    it("Should properly initialize all contracts", async function () {
      // Check Arbitrum VRF Requester configuration
      expect(await arbitrumVRFRequester.vrfCoordinator()).to.equal(vrfCoordinatorMock.address);
      expect(await arbitrumVRFRequester.subscriptionId()).to.equal(SUBSCRIPTION_ID);
      expect(await arbitrumVRFRequester.keyHash()).to.equal(KEY_HASH);
      expect(await arbitrumVRFRequester.sonicVRFConsumer()).to.equal(sonicVRFConsumer.address);
      
      // Check Sonic VRF Consumer configuration
      expect(await sonicVRFConsumer.arbitrumVRFRequester()).to.equal(arbitrumVRFRequester.address);
      expect(await sonicVRFConsumer.arbitrumChainId()).to.equal(ARBITRUM_CHAIN_ID);
      expect(await sonicVRFConsumer.wrappedSonic()).to.equal(mockWrappedSonic.address);
      expect(await sonicVRFConsumer.dragonToken()).to.equal(mockDragonToken.address);
      
      // Check Enhanced Sonic VRF Consumer additional configuration
      expect(await enhancedVRFConsumer.READ_CHANNEL()).to.equal(READ_CHANNEL_ID);
    });
    
    it("Should have correct jackpot balance", async function () {
      const jackpotBalance = await sonicVRFConsumer.jackpotBalance();
      expect(jackpotBalance).to.equal(ethers.utils.parseEther("100"));
    });
  });
  
  describe("Cross-Chain VRF Flow", function () {
    it("Should trigger VRF request when swap occurs", async function () {
      // Simulate a swap from wS to DRAGON
      await expect(sonicVRFConsumer.onSwapWSToDragon(user1.address, ethers.utils.parseEther("10")))
        .to.emit(sonicVRFConsumer, "VRFRequested")
        .withArgs(0, user1.address);
    });
    
    it("Should process request on Arbitrum side", async function () {
      // First trigger a request from Sonic
      await sonicVRFConsumer.onSwapWSToDragon(user1.address, ethers.utils.parseEther("10"));
      
      // Mock the LayerZero message received on Arbitrum side
      const requestId = 0;
      const payload = ethers.utils.defaultAbiCoder.encode(["uint64"], [requestId]);
      
      // Simulate the message received by Arbitrum
      await lzEndpointMock.sendMessage(
        arbitrumVRFRequester.address,
        SONIC_CHAIN_ID,
        lzEncodedAddr(sonicVRFConsumer.address),
        payload,
        owner.address
      );
      
      // Check if the VRF request was stored properly
      // Note: In the real flow, the VRF coordinator would call back with fulfillRandomWords
      // Here we just verify that the request was properly registered
      const storedRequestId = await arbitrumVRFRequester.vrfRequestIdToRequestId(1); // Mock starts with request ID 1
      expect(storedRequestId).to.equal(requestId);
    });
    
    it("Should fulfill randomness and forward back to Sonic", async function () {
      // First trigger a request from Sonic
      await sonicVRFConsumer.onSwapWSToDragon(user1.address, ethers.utils.parseEther("10"));
      
      // Mock the LayerZero message received on Arbitrum side
      const requestId = 0;
      const payload = ethers.utils.defaultAbiCoder.encode(["uint64"], [requestId]);
      
      // Simulate the message received by Arbitrum
      await lzEndpointMock.sendMessage(
        arbitrumVRFRequester.address,
        SONIC_CHAIN_ID,
        lzEncodedAddr(sonicVRFConsumer.address),
        payload,
        owner.address
      );
      
      // Simulate VRF callback with random numbers
      const vrfRequestId = 1; // VRF coordinator starts with request ID 1
      const randomWords = [ethers.BigNumber.from("123456789")];
      
      // This would normally be called by the VRF Coordinator
      await vrfCoordinatorMock.fulfillRandomWords(vrfRequestId, arbitrumVRFRequester.address, randomWords);
      
      // Mock the LayerZero message from Arbitrum back to Sonic
      const responsePayload = ethers.utils.defaultAbiCoder.encode(
        ["uint64", "uint256"],
        [requestId, randomWords[0]]
      );
      
      // Simulate the response message received by Sonic
      await expect(
        lzEndpointMock.sendMessage(
          sonicVRFConsumer.address,
          ARBITRUM_CHAIN_ID,
          lzEncodedAddr(arbitrumVRFRequester.address),
          responsePayload,
          owner.address
        )
      ).to.emit(sonicVRFConsumer, "RandomnessReceived")
        .withArgs(requestId, randomWords[0]);
    });
  });
  
  describe("LayerZero Read Functionality", function () {
    it("Should query Arbitrum VRF state using lzRead", async function () {
      // Mock the tools for lzRead
      // In a real test this would involve mocking the read response path
      // For this test we'll just verify that the function doesn't revert
      
      // Generate simple options for the test
      const options = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint256", "uint256"],
        [200000, 96, 0]
      );
      
      // Should not revert
      await expect(
        enhancedVRFConsumer.queryArbitrumVRFState(options, {
          value: ethers.utils.parseEther("0.05")
        })
      ).to.not.be.reverted;
      
      // In a real environment, this would trigger lzRead which would result in
      // _handleReadResponse being called with the response data
      // We can simulate this directly
      
      // Simulate a response arrival through _handleReadResponse
      const mockResponse = ethers.utils.defaultAbiCoder.encode(
        ["uint64", "bytes32", "uint16"],
        [SUBSCRIPTION_ID, KEY_HASH, 3]
      );
      
      // We'd need to modify the contract to expose this function for testing
      // or create a special test version that allows us to call it directly
      
      // Verify the state was updated correctly if we could call _handleReadResponse
      // expect(await enhancedVRFConsumer.lastQueriedSubscriptionId()).to.equal(SUBSCRIPTION_ID);
      // expect(await enhancedVRFConsumer.lastQueriedKeyHash()).to.equal(KEY_HASH);
      // expect(await enhancedVRFConsumer.lastQueriedConfirmations()).to.equal(3);
    });
  });
  
  describe("Lottery Logic", function () {
    it("Should award jackpot to winning user", async function () {
      // Set a high win threshold to ensure winning
      await sonicVRFConsumer.setWinThreshold(9999);
      
      // User initial balance
      const initialBalance = await mockWrappedSonic.balanceOf(user1.address);
      
      // Trigger a lottery entry
      await sonicVRFConsumer.onSwapWSToDragon(user1.address, ethers.utils.parseEther("10"));
      
      // Mock the LayerZero message received on Arbitrum side
      const requestId = 0;
      const payload = ethers.utils.defaultAbiCoder.encode(["uint64"], [requestId]);
      
      // Simulate the message received by Arbitrum
      await lzEndpointMock.sendMessage(
        arbitrumVRFRequester.address,
        SONIC_CHAIN_ID,
        lzEncodedAddr(sonicVRFConsumer.address),
        payload,
        owner.address
      );
      
      // Simulate VRF callback with random number that will cause a win
      const vrfRequestId = 1;
      const randomWords = [ethers.BigNumber.from("12345")]; // Small number to ensure win
      
      await vrfCoordinatorMock.fulfillRandomWords(vrfRequestId, arbitrumVRFRequester.address, randomWords);
      
      // Mock the LayerZero message from Arbitrum back to Sonic
      const responsePayload = ethers.utils.defaultAbiCoder.encode(
        ["uint64", "uint256"],
        [requestId, randomWords[0]]
      );
      
      // Simulate the response message, should trigger jackpot win
      await expect(
        lzEndpointMock.sendMessage(
          sonicVRFConsumer.address,
          ARBITRUM_CHAIN_ID,
          lzEncodedAddr(arbitrumVRFRequester.address),
          responsePayload,
          owner.address
        )
      ).to.emit(sonicVRFConsumer, "JackpotWon")
        .withArgs(user1.address, ethers.utils.parseEther("100"));
      
      // Check user balance increased
      const finalBalance = await mockWrappedSonic.balanceOf(user1.address);
      expect(finalBalance.sub(initialBalance)).to.equal(ethers.utils.parseEther("100"));
      
      // Check jackpot is now empty
      expect(await sonicVRFConsumer.jackpotBalance()).to.equal(0);
    });
    
    it("Should not award jackpot to losing user", async function () {
      // Set a very low win threshold to ensure losing
      await sonicVRFConsumer.setWinThreshold(1);
      
      // User initial balance
      const initialBalance = await mockWrappedSonic.balanceOf(user1.address);
      
      // Trigger a lottery entry
      await sonicVRFConsumer.onSwapWSToDragon(user1.address, ethers.utils.parseEther("10"));
      
      // Mock the LayerZero message received on Arbitrum side
      const requestId = 0;
      const payload = ethers.utils.defaultAbiCoder.encode(["uint64"], [requestId]);
      
      // Simulate the message received by Arbitrum
      await lzEndpointMock.sendMessage(
        arbitrumVRFRequester.address,
        SONIC_CHAIN_ID,
        lzEncodedAddr(sonicVRFConsumer.address),
        payload,
        owner.address
      );
      
      // Simulate VRF callback with random number that will cause a loss
      const vrfRequestId = 1;
      const randomWords = [ethers.BigNumber.from("9999")]; // Large number to ensure loss
      
      await vrfCoordinatorMock.fulfillRandomWords(vrfRequestId, arbitrumVRFRequester.address, randomWords);
      
      // Mock the LayerZero message from Arbitrum back to Sonic
      const responsePayload = ethers.utils.defaultAbiCoder.encode(
        ["uint64", "uint256"],
        [requestId, randomWords[0]]
      );
      
      // Simulate the response message, should not trigger jackpot win
      await lzEndpointMock.sendMessage(
        sonicVRFConsumer.address,
        ARBITRUM_CHAIN_ID,
        lzEncodedAddr(arbitrumVRFRequester.address),
        responsePayload,
        owner.address
      );
      
      // Check user balance did not increase
      const finalBalance = await mockWrappedSonic.balanceOf(user1.address);
      expect(finalBalance).to.equal(initialBalance);
      
      // Check jackpot is still full
      expect(await sonicVRFConsumer.jackpotBalance()).to.equal(ethers.utils.parseEther("100"));
    });
  });
  
  describe("Security Tests", function () {
    it("Should reject unauthorized calls to onSwapWSToDragon", async function () {
      // Try to call from an unauthorized address (not Dragon token)
      await expect(
        sonicVRFConsumer.connect(user1).onSwapWSToDragon(user1.address, ethers.utils.parseEther("10"))
      ).to.be.revertedWith("Only DRAGON token can call");
    });
    
    it("Should reject unauthorized source chains in lzReceive", async function () {
      // Construct a message with wrong source chain
      const requestId = 0;
      const randomValue = ethers.BigNumber.from("12345");
      const payload = ethers.utils.defaultAbiCoder.encode(
        ["uint64", "uint256"],
        [requestId, randomValue]
      );
      
      // Try to send from wrong chain ID
      await expect(
        lzEndpointMock.sendMessage(
          sonicVRFConsumer.address,
          999, // Wrong chain ID
          lzEncodedAddr(arbitrumVRFRequester.address),
          payload,
          owner.address
        )
      ).to.be.revertedWith("Only Arbitrum chain can send randomness");
    });
    
    it("Should reject unauthorized source addresses in lzReceive", async function () {
      // Construct a message with wrong source address
      const requestId = 0;
      const randomValue = ethers.BigNumber.from("12345");
      const payload = ethers.utils.defaultAbiCoder.encode(
        ["uint64", "uint256"],
        [requestId, randomValue]
      );
      
      // Try to send from wrong address
      await expect(
        lzEndpointMock.sendMessage(
          sonicVRFConsumer.address,
          ARBITRUM_CHAIN_ID,
          lzEncodedAddr(user1.address), // Wrong source address
          payload,
          owner.address
        )
      ).to.be.revertedWith("Only VRF requester can send randomness");
    });
    
    it("Should require owner permission for admin functions", async function () {
      // Try to update win threshold as non-owner
      await expect(
        sonicVRFConsumer.connect(user1).setWinThreshold(500)
      ).to.be.revertedWith("Ownable: caller is not the owner");
      
      // Try to update jackpot percentage as non-owner
      await expect(
        sonicVRFConsumer.connect(user1).setJackpotPercentage(500)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
}); 