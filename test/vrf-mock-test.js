const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VRF Mocks Test", function () {
  let VRFTestHelper;
  let vrfTestHelper;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy test helper first for development
    VRFTestHelper = await ethers.getContractFactory("VRFTestHelper");
    vrfTestHelper = await VRFTestHelper.deploy();
    await vrfTestHelper.deployed();
  });

  describe("VRFTestHelper basic functionality", function () {
    it("Should initialize with correct parameters", async function () {
      expect(await vrfTestHelper.subscriptionId()).to.equal(12345);
      expect(await vrfTestHelper.requestConfirmations()).to.equal(3);
      expect(await vrfTestHelper.callbackGasLimit()).to.equal(500000);
      expect(await vrfTestHelper.numWords()).to.equal(1);
      expect(await vrfTestHelper.sonicChainId()).to.equal(1);
      expect(await vrfTestHelper.arbitrumChainId()).to.equal(110);
    });

    it("Should request randomness and track it properly", async function () {
      const tx = await vrfTestHelper.requestRandomness(user1.address);
      const receipt = await tx.wait();

      // Find the event in the receipt
      const event = receipt.events.find(e => e.event === 'RandomnessRequested');
      expect(event).to.exist;

      const requestId = event.args[0];
      expect(await vrfTestHelper.requestToUser(requestId)).to.equal(user1.address);
      expect(await vrfTestHelper.nonce()).to.equal(1);
    });

    it("Should receive randomness correctly", async function () {
      // First request randomness
      const tx = await vrfTestHelper.requestRandomness(user1.address);
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'RandomnessRequested');
      const requestId = event.args[0];

      // Now receive randomness
      const randomValue = 123456789;
      await vrfTestHelper.receiveRandomness(requestId, user1.address, randomValue);

      // Check that the randomness was stored
      expect(await vrfTestHelper.getResponse(requestId)).to.equal(randomValue);
      
      // The request should have been cleaned up
      expect(await vrfTestHelper.requestToUser(requestId)).to.equal(ethers.constants.AddressZero);
    });

    it("Should fail if trying to receive for unknown request", async function () {
      await expect(
        vrfTestHelper.receiveRandomness(999, user1.address, 123456)
      ).to.be.revertedWith("Unknown request ID");
    });

    it("Should fail if user mismatch", async function () {
      // First request randomness
      const tx = await vrfTestHelper.requestRandomness(user1.address);
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'RandomnessRequested');
      const requestId = event.args[0];

      // Try to receive with wrong user
      await expect(
        vrfTestHelper.receiveRandomness(requestId, user2.address, 123456)
      ).to.be.revertedWith("User mismatch");
    });
    
    it("Should handle multiple randomness requests correctly", async function () {
      // Request randomness for multiple users
      const tx1 = await vrfTestHelper.requestRandomness(user1.address);
      const receipt1 = await tx1.wait();
      const event1 = receipt1.events.find(e => e.event === 'RandomnessRequested');
      const requestId1 = event1.args[0];
      
      const tx2 = await vrfTestHelper.requestRandomness(user2.address);
      const receipt2 = await tx2.wait();
      const event2 = receipt2.events.find(e => e.event === 'RandomnessRequested');
      const requestId2 = event2.args[0];
      
      // Verify both requests are tracked properly
      expect(await vrfTestHelper.requestToUser(requestId1)).to.equal(user1.address);
      expect(await vrfTestHelper.requestToUser(requestId2)).to.equal(user2.address);
      expect(await vrfTestHelper.nonce()).to.equal(2);
      
      // Fulfill the requests in reverse order
      await vrfTestHelper.receiveRandomness(requestId2, user2.address, 222222);
      await vrfTestHelper.receiveRandomness(requestId1, user1.address, 111111);
      
      // Verify responses were stored correctly
      expect(await vrfTestHelper.getResponse(requestId1)).to.equal(111111);
      expect(await vrfTestHelper.getResponse(requestId2)).to.equal(222222);
      
      // Verify requests were cleaned up
      expect(await vrfTestHelper.requestToUser(requestId1)).to.equal(ethers.constants.AddressZero);
      expect(await vrfTestHelper.requestToUser(requestId2)).to.equal(ethers.constants.AddressZero);
    });
  });

  describe("VRF state query", function () {
    it("Should query VRF state", async function () {
      await vrfTestHelper.queryVRFState();
      
      // Verify state was updated
      expect(await vrfTestHelper.lastQueriedSubscriptionId()).to.equal(12345);
      expect(await vrfTestHelper.lastQueriedKeyHash()).to.equal(await vrfTestHelper.keyHash());
      expect(await vrfTestHelper.lastQueriedConfirmations()).to.equal(3);
      expect(await vrfTestHelper.lastQueriedCallbackGasLimit()).to.equal(500000);
      expect(await vrfTestHelper.lastQueriedNumWords()).to.equal(1);
      expect(await vrfTestHelper.lastQueriedTimestamp()).to.be.gt(0);
    });
    
    it("Should emit event when querying VRF state", async function () {
      await expect(vrfTestHelper.queryVRFState())
        .to.emit(vrfTestHelper, "VRFStateQueried")
        .withArgs(12345, await vrfTestHelper.keyHash(), 3, 500000, 1);
    });
  });

  describe("Admin functions", function () {
    it("Should allow owner to update parameters", async function () {
      const newKeyHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("newKeyHash"));
      
      await vrfTestHelper.updateVRFParams(
        54321, // subscriptionId
        newKeyHash,
        5, // confirmations
        600000, // gas limit
        2 // num words
      );
      
      expect(await vrfTestHelper.subscriptionId()).to.equal(54321);
      expect(await vrfTestHelper.keyHash()).to.equal(newKeyHash);
      expect(await vrfTestHelper.requestConfirmations()).to.equal(5);
      expect(await vrfTestHelper.callbackGasLimit()).to.equal(600000);
      expect(await vrfTestHelper.numWords()).to.equal(2);
    });
    
    it("Should prevent non-owners from updating parameters", async function () {
      await expect(
        vrfTestHelper.connect(user1).updateVRFParams(
          54321,
          ethers.constants.HashZero,
          5,
          600000,
          2
        )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    
    it("Should verify chain IDs are accessible", async function () {
      expect(await vrfTestHelper.getChainId()).to.equal(1); // sonic chain ID
      expect(await vrfTestHelper.arbitrumChainId()).to.equal(110);
    });
  });

  describe("Retry mechanism", function () {
    it("Should allow retrying randomness delivery", async function () {
      // First request randomness
      const tx = await vrfTestHelper.requestRandomness(user1.address);
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'RandomnessRequested');
      const requestId = event.args[0];

      // Now retry with a random value
      const randomValue = 987654321;
      await vrfTestHelper.retryRandomness(requestId, randomValue);

      // Check that the randomness was stored
      expect(await vrfTestHelper.getResponse(requestId)).to.equal(randomValue);
      
      // The request should have been cleaned up
      expect(await vrfTestHelper.requestToUser(requestId)).to.equal(ethers.constants.AddressZero);
    });
    
    it("Should fail retrying for unknown request", async function () {
      await expect(
        vrfTestHelper.retryRandomness(999, 123456)
      ).to.be.revertedWith("Unknown request ID");
    });
    
    it("Should emit event when retrying randomness", async function () {
      // First request randomness
      const tx = await vrfTestHelper.requestRandomness(user1.address);
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'RandomnessRequested');
      const requestId = event.args[0];
      
      // Verify event is emitted on retry
      await expect(vrfTestHelper.retryRandomness(requestId, 555555))
        .to.emit(vrfTestHelper, "RandomnessReceived")
        .withArgs(requestId, user1.address, 555555);
    });
  });
  
  describe("Simulated VRF flow", function () {
    it("Should simulate complete Arbitrum VRF request flow", async function () {
      // Step 1: Request randomness from Sonic
      const tx = await vrfTestHelper.requestRandomness(user1.address);
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'RandomnessRequested');
      const sonicRequestId = event.args[0];
      
      // Step 2: Simulate Arbitrum VRF request
      const vrfRequestId = await vrfTestHelper.simulateArbitrumVRFRequest(sonicRequestId, user1.address);
      expect(vrfRequestId).to.equal(sonicRequestId); // In our mock they're the same
      
      // Step 3: Simulate VRF fulfillment
      const randomValue = 123456789;
      await vrfTestHelper.fulfillRandomness(vrfRequestId, randomValue);
      
      // Step 4: Verify randomness was stored
      expect(await vrfTestHelper.getResponse(sonicRequestId)).to.equal(randomValue);
    });
    
    it("Should revert if trying to request for invalid user", async function () {
      // First make a legitimate request for user1
      const tx = await vrfTestHelper.requestRandomness(user1.address);
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'RandomnessRequested');
      const sonicRequestId = event.args[0];
      
      // Try to use that request ID for a different user
      await expect(
        vrfTestHelper.simulateArbitrumVRFRequest(sonicRequestId, user2.address)
      ).to.be.revertedWith("Invalid request");
    });
  });
}); 