const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MockSonicVRFConsumerRead", function () {
  let owner, user1;
  let mockSonicVRFConsumerRead, mockLzEndpoint, mockArbitrumVRFRequester;

  const ARBITRUM_CHAIN_ID = 110;
  const SONIC_CHAIN_ID = 111;
  const READ_CHANNEL_ID = 5;

  // Mock VRF state values
  const MOCK_SUBSCRIPTION_ID = 12345;
  const MOCK_KEY_HASH = "0x8472ba59cf7134dfe321f4d61a430c4857e8b19cdd5230b09952a92671c24409";
  const MOCK_CONFIRMATIONS = 3;
  const MOCK_CALLBACK_GAS_LIMIT = 500000;

  beforeEach(async function () {
    // Get signers
    [owner, user1] = await ethers.getSigners();

    // Deploy MockLzEndpoint
    const MockLzEndpoint = await ethers.getContractFactory("MockLzEndpoint");
    const sonicLzEndpoint = await MockLzEndpoint.deploy(SONIC_CHAIN_ID);
    const arbitrumLzEndpoint = await MockLzEndpoint.deploy(ARBITRUM_CHAIN_ID);

    // Deploy MockArbitrumVRFRequester
    const MockArbitrumVRFRequester = await ethers.getContractFactory("MockArbitrumVRFRequester");
    mockArbitrumVRFRequester = await MockArbitrumVRFRequester.deploy(
      arbitrumLzEndpoint.address,
      SONIC_CHAIN_ID
    );

    // Set mock VRF state values
    await mockArbitrumVRFRequester.setSubscriptionId(MOCK_SUBSCRIPTION_ID);
    await mockArbitrumVRFRequester.setKeyHash(MOCK_KEY_HASH);
    await mockArbitrumVRFRequester.setRequestConfirmations(MOCK_CONFIRMATIONS);
    await mockArbitrumVRFRequester.setCallbackGasLimit(MOCK_CALLBACK_GAS_LIMIT);

    // Deploy MockSonicVRFConsumerRead
    const MockSonicVRFConsumerRead = await ethers.getContractFactory("MockSonicVRFConsumerRead");
    mockSonicVRFConsumerRead = await MockSonicVRFConsumerRead.deploy(
      sonicLzEndpoint.address,
      ARBITRUM_CHAIN_ID,
      mockArbitrumVRFRequester.address
    );

    // Set up trusted remotes for cross-chain communication
    await mockSonicVRFConsumerRead.setReadChannel(READ_CHANNEL_ID, true);

    // Wire up the mock endpoints
    await sonicLzEndpoint.setDestLzEndpoint(
      mockArbitrumVRFRequester.address,
      arbitrumLzEndpoint.address
    );
    await arbitrumLzEndpoint.setDestLzEndpoint(
      mockSonicVRFConsumerRead.address,
      sonicLzEndpoint.address
    );

    // Fund the contract for fees
    await owner.sendTransaction({
      to: mockSonicVRFConsumerRead.address,
      value: ethers.utils.parseEther("1"),
    });
  });

  describe("Contract setup", function () {
    it("Should have correct initial configuration", async function () {
      expect(await mockSonicVRFConsumerRead.READ_CHANNEL()).to.equal(READ_CHANNEL_ID);
      expect(await mockSonicVRFConsumerRead.arbitrumChainId()).to.equal(ARBITRUM_CHAIN_ID);
      expect(await mockSonicVRFConsumerRead.arbitrumVRFRequester()).to.equal(mockArbitrumVRFRequester.address);
    });

    it("Should allow owner to update config", async function () {
      const newArbitrumVRFRequester = user1.address;
      await mockSonicVRFConsumerRead.setArbitrumVRFRequester(newArbitrumVRFRequester);
      expect(await mockSonicVRFConsumerRead.arbitrumVRFRequester()).to.equal(newArbitrumVRFRequester);

      const newArbitrumChainId = 112;
      await mockSonicVRFConsumerRead.setArbitrumChainId(newArbitrumChainId);
      expect(await mockSonicVRFConsumerRead.arbitrumChainId()).to.equal(newArbitrumChainId);
    });

    it("Should allow configuring DVNs", async function () {
      const dvns = [user1.address, owner.address];
      const thresholdStart = 1;
      const thresholdEnd = 2;

      const tx = await mockSonicVRFConsumerRead.configureDVNs(
        READ_CHANNEL_ID,
        dvns,
        thresholdStart,
        thresholdEnd
      );

      // Check event was emitted
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "DVNsConfigured");
      expect(event).to.not.be.undefined;
      expect(event.args.channelId).to.equal(READ_CHANNEL_ID);
      expect(event.args.thresholdStart).to.equal(thresholdStart);
      expect(event.args.thresholdEnd).to.equal(thresholdEnd);
    });

    it("Should revert when configuring DVNs with invalid thresholds", async function () {
      const dvns = [user1.address, owner.address];
      
      // Threshold start > threshold end
      await expect(
        mockSonicVRFConsumerRead.configureDVNs(READ_CHANNEL_ID, dvns, 2, 1)
      ).to.be.revertedWith("Invalid thresholds");
      
      // Threshold end > DVN count
      await expect(
        mockSonicVRFConsumerRead.configureDVNs(READ_CHANNEL_ID, dvns, 1, 3)
      ).to.be.revertedWith("Threshold exceeds DVN count");
    });
  });

  describe("Read functionality", function () {
    it("Should query and process VRF state", async function () {
      // Request a read
      const tx = await mockSonicVRFConsumerRead.queryArbitrumVRFState("0x", {
        value: ethers.utils.parseEther("0.01")
      });
      await tx.wait();

      // Use the mock function to simulate receiving read response
      await mockSonicVRFConsumerRead.mockReceiveReadResponse(
        MOCK_SUBSCRIPTION_ID,
        MOCK_KEY_HASH,
        MOCK_CONFIRMATIONS,
        MOCK_CALLBACK_GAS_LIMIT
      );

      // Verify the state was updated correctly
      expect(await mockSonicVRFConsumerRead.lastQueriedSubscriptionId()).to.equal(MOCK_SUBSCRIPTION_ID);
      expect(await mockSonicVRFConsumerRead.lastQueriedKeyHash()).to.equal(MOCK_KEY_HASH);
      expect(await mockSonicVRFConsumerRead.lastQueriedConfirmations()).to.equal(MOCK_CONFIRMATIONS);
      expect(await mockSonicVRFConsumerRead.lastQueriedCallbackGasLimit()).to.equal(MOCK_CALLBACK_GAS_LIMIT);
    });

    it("Should emit event when VRF state is queried", async function () {
      // Use the mock function and check event
      await expect(mockSonicVRFConsumerRead.mockReceiveReadResponse(
        MOCK_SUBSCRIPTION_ID,
        MOCK_KEY_HASH,
        MOCK_CONFIRMATIONS,
        MOCK_CALLBACK_GAS_LIMIT
      ))
        .to.emit(mockSonicVRFConsumerRead, "VRFStateQueried")
        .withArgs(MOCK_SUBSCRIPTION_ID, MOCK_KEY_HASH, MOCK_CONFIRMATIONS, MOCK_CALLBACK_GAS_LIMIT);
    });
  });
}); 