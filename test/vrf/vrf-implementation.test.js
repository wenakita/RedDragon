const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VRF Implementation Test", function () {
  let SonicVRFConsumer;
  let sonicVRFConsumer;
  let ArbitrumVRFRequester;
  let arbitrumVRFRequester;
  let VRFTestHelper;
  let vrfTestHelper;
  let MockLzEndpoint;
  let sonicLzEndpoint;
  let arbitrumLzEndpoint;
  let MockCallback;
  let mockCallback;
  let owner;
  let user1;
  let user2;

  const SONIC_CHAIN_ID = 1;
  const ARBITRUM_CHAIN_ID = 110;
  const SUBSCRIPTION_ID = 12345;
  const KEY_HASH = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("keyHash"));
  const CALLBACK_GAS_LIMIT = 500000;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy test helper first for development
    VRFTestHelper = await ethers.getContractFactory("VRFTestHelper");
    vrfTestHelper = await VRFTestHelper.deploy();
    await vrfTestHelper.deployed();

    // Deploy mock LZ endpoints
    MockLzEndpoint = await ethers.getContractFactory("MockLzEndpoint");
    sonicLzEndpoint = await MockLzEndpoint.deploy();
    await sonicLzEndpoint.deployed();
    
    arbitrumLzEndpoint = await MockLzEndpoint.deploy();
    await arbitrumLzEndpoint.deployed();

    // Deploy mock callback
    MockCallback = await ethers.getContractFactory("MockCallback");
    mockCallback = await MockCallback.deploy();
    await mockCallback.deployed();

    // Deploy real contracts
    SonicVRFConsumer = await ethers.getContractFactory("SonicVRFConsumer");
    sonicVRFConsumer = await SonicVRFConsumer.deploy(
      sonicLzEndpoint.address,
      ARBITRUM_CHAIN_ID,
      owner.address, // Temporarily use owner as the ArbitrumVRFRequester
      mockCallback.address
    );
    await sonicVRFConsumer.deployed();

    ArbitrumVRFRequester = await ethers.getContractFactory("ArbitrumVRFRequester");
    arbitrumVRFRequester = await ArbitrumVRFRequester.deploy(
      owner.address, // Mock VRF Coordinator address
      arbitrumLzEndpoint.address,
      SUBSCRIPTION_ID,
      KEY_HASH,
      SONIC_CHAIN_ID,
      sonicVRFConsumer.address
    );
    await arbitrumVRFRequester.deployed();

    // Update the ArbitrumVRFRequester address in SonicVRFConsumer
    await sonicVRFConsumer.updateArbitrumVRFRequester(arbitrumVRFRequester.address);
  });

  describe("Basic functionality", function () {
    it("Should initialize with correct parameters", async function () {
      expect(await sonicVRFConsumer.arbitrumChainId()).to.equal(ARBITRUM_CHAIN_ID);
      expect(await sonicVRFConsumer.arbitrumVRFRequester()).to.equal(arbitrumVRFRequester.address);
      expect(await sonicVRFConsumer.lotteryContract()).to.equal(mockCallback.address);

      expect(await arbitrumVRFRequester.subscriptionId()).to.equal(SUBSCRIPTION_ID);
      expect(await arbitrumVRFRequester.keyHash()).to.equal(KEY_HASH);
      expect(await arbitrumVRFRequester.sonicChainId()).to.equal(SONIC_CHAIN_ID);
      expect(await arbitrumVRFRequester.sonicVRFConsumer()).to.equal(sonicVRFConsumer.address);
    });

    it("Should only allow lottery contract to request randomness", async function () {
      await expect(sonicVRFConsumer.connect(user1).requestRandomness(user1.address))
        .to.be.revertedWith("Only lottery contract");

      // Set the mock callback as the caller
      await mockCallback.setVRFConsumer(sonicVRFConsumer.address);
      
      // Mock requesting randomness from the lottery contract
      await expect(mockCallback.requestRandomness(user1.address))
        .to.emit(sonicVRFConsumer, "RandomnessRequested")
        .withArgs(0, user1.address);
    });

    it("Should track requests properly", async function () {
      // Set the mock callback as the caller
      await mockCallback.setVRFConsumer(sonicVRFConsumer.address);
      
      // Request randomness
      await mockCallback.requestRandomness(user1.address);
      
      // Check that the request was tracked
      expect(await sonicVRFConsumer.requestToUser(0)).to.equal(user1.address);
      expect(await sonicVRFConsumer.nonce()).to.equal(1);
    });
  });

  describe("Cross-chain VRF flow simulation", function () {
    it("Should simulate the complete VRF flow using mocks", async function () {
      // 1. Request randomness from SonicVRFConsumer
      await mockCallback.setVRFConsumer(sonicVRFConsumer.address);
      await mockCallback.requestRandomness(user1.address);
      
      // 2. Manually simulate the message being sent to Arbitrum
      const requestId = 0; // First request
      const sonicToArbitrumPayload = ethers.utils.defaultAbiCoder.encode(
        ["uint64", "address"],
        [requestId, user1.address]
      );
      
      // 3. Simulate Arbitrum receiving the message and requesting VRF
      const vrfRequestId = 12345; // Arbitrary VRF request ID
      
      // 4. Simulate VRF fulfillment
      const randomValue = 789012345;
      
      // 5. Simulate sending the randomness back to Sonic
      const arbitrumToSonicPayload = ethers.utils.defaultAbiCoder.encode(
        ["uint64", "address", "uint256"],
        [requestId, user1.address, randomValue]
      );
      
      // Mock the LZ message being received by Sonic
      await sonicLzEndpoint.mockLzReceive(
        arbitrumLzEndpoint.address,
        arbitrumVRFRequester.address,
        0, // nonce
        arbitrumToSonicPayload
      );
      
      // 6. Verify that the randomness was delivered to the callback
      expect(await mockCallback.receivedRandomness(requestId)).to.equal(randomValue);
      
      // 7. Verify the request was cleaned up
      expect(await sonicVRFConsumer.requestToUser(requestId)).to.equal(ethers.constants.AddressZero);
    });
  });

  describe("Admin functions", function () {
    it("Should allow owner to update parameters", async function () {
      // Update SonicVRFConsumer parameters
      await sonicVRFConsumer.updateArbitrumChainId(200);
      expect(await sonicVRFConsumer.arbitrumChainId()).to.equal(200);
      
      await sonicVRFConsumer.updateArbitrumVRFRequester(user2.address);
      expect(await sonicVRFConsumer.arbitrumVRFRequester()).to.equal(user2.address);
      
      await sonicVRFConsumer.updateLotteryContract(user2.address);
      expect(await sonicVRFConsumer.lotteryContract()).to.equal(user2.address);
      
      // Update ArbitrumVRFRequester parameters
      const newKeyHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("newKeyHash"));
      await arbitrumVRFRequester.updateKeyHash(newKeyHash);
      expect(await arbitrumVRFRequester.keyHash()).to.equal(newKeyHash);
      
      await arbitrumVRFRequester.updateRequestConfirmations(5);
      expect(await arbitrumVRFRequester.requestConfirmations()).to.equal(5);
      
      await arbitrumVRFRequester.updateCallbackGasLimit(600000);
      expect(await arbitrumVRFRequester.callbackGasLimit()).to.equal(600000);
      
      await arbitrumVRFRequester.updateNumWords(2);
      expect(await arbitrumVRFRequester.numWords()).to.equal(2);
    });
    
    it("Should prevent non-owners from updating parameters", async function () {
      await expect(sonicVRFConsumer.connect(user1).updateArbitrumChainId(200))
        .to.be.revertedWith("Ownable: caller is not the owner");
        
      await expect(arbitrumVRFRequester.connect(user1).updateKeyHash(ethers.constants.HashZero))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Error handling", function () {
    it("Should handle unknown request IDs", async function () {
      // Prepare a payload with an unknown request ID
      const unknownRequestId = 999;
      const user = user1.address;
      const randomValue = 123456;
      
      const payload = ethers.utils.defaultAbiCoder.encode(
        ["uint64", "address", "uint256"],
        [unknownRequestId, user, randomValue]
      );
      
      // Expect revert when trying to process an unknown request
      await expect(sonicLzEndpoint.mockLzReceive(
        arbitrumLzEndpoint.address,
        arbitrumVRFRequester.address,
        0,
        payload
      )).to.be.revertedWith("Unknown request ID");
    });
    
    it("Should handle user mismatch", async function () {
      // First make a legitimate request
      await mockCallback.setVRFConsumer(sonicVRFConsumer.address);
      await mockCallback.requestRandomness(user1.address);
      
      // Prepare a payload with the correct request ID but wrong user
      const requestId = 0;
      const wrongUser = user2.address;
      const randomValue = 123456;
      
      const payload = ethers.utils.defaultAbiCoder.encode(
        ["uint64", "address", "uint256"],
        [requestId, wrongUser, randomValue]
      );
      
      // Expect revert when trying to process with user mismatch
      await expect(sonicLzEndpoint.mockLzReceive(
        arbitrumLzEndpoint.address,
        arbitrumVRFRequester.address,
        0,
        payload
      )).to.be.revertedWith("User mismatch");
    });
    
    it("Should handle unauthorized source address", async function () {
      // First make a legitimate request
      await mockCallback.setVRFConsumer(sonicVRFConsumer.address);
      await mockCallback.requestRandomness(user1.address);
      
      // Prepare a valid payload
      const requestId = 0;
      const user = user1.address;
      const randomValue = 123456;
      
      const payload = ethers.utils.defaultAbiCoder.encode(
        ["uint64", "address", "uint256"],
        [requestId, user, randomValue]
      );
      
      // Expect revert when trying to process from unauthorized source
      await expect(sonicLzEndpoint.mockLzReceive(
        arbitrumLzEndpoint.address,
        user2.address, // Not arbitrumVRFRequester
        0,
        payload
      )).to.be.revertedWith("Not from authorized source");
    });
  });
}); 