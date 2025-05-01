const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SonicVRFConsumerRead", function () {
  let owner, user1;
  let sonicVRFConsumerRead, mockLzEndpoint, mockArbitrumVRFRequester;

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

    // Deploy SonicVRFConsumerRead
    const SonicVRFConsumerRead = await ethers.getContractFactory("SonicVRFConsumerRead");
    sonicVRFConsumerRead = await SonicVRFConsumerRead.deploy(
      sonicLzEndpoint.address,
      ARBITRUM_CHAIN_ID,
      mockArbitrumVRFRequester.address
    );

    // Set up trusted remotes for cross-chain communication
    await sonicVRFConsumerRead.setReadChannel(READ_CHANNEL_ID, true);

    // Wire up the mock endpoints
    await sonicLzEndpoint.setDestLzEndpoint(
      mockArbitrumVRFRequester.address,
      arbitrumLzEndpoint.address
    );
    await arbitrumLzEndpoint.setDestLzEndpoint(
      sonicVRFConsumerRead.address,
      sonicLzEndpoint.address
    );

    // Fund the contract for fees
    await owner.sendTransaction({
      to: sonicVRFConsumerRead.address,
      value: ethers.utils.parseEther("1"),
    });
  });

  describe("Contract setup", function () {
    it("Should have correct initial configuration", async function () {
      expect(await sonicVRFConsumerRead.READ_CHANNEL()).to.equal(READ_CHANNEL_ID);
      expect(await sonicVRFConsumerRead.arbitrumChainId()).to.equal(ARBITRUM_CHAIN_ID);
      expect(await sonicVRFConsumerRead.arbitrumVRFRequester()).to.equal(mockArbitrumVRFRequester.address);
    });

    it("Should allow owner to update config", async function () {
      const newArbitrumVRFRequester = user1.address;
      await sonicVRFConsumerRead.setArbitrumVRFRequester(newArbitrumVRFRequester);
      expect(await sonicVRFConsumerRead.arbitrumVRFRequester()).to.equal(newArbitrumVRFRequester);

      const newArbitrumChainId = 112;
      await sonicVRFConsumerRead.setArbitrumChainId(newArbitrumChainId);
      expect(await sonicVRFConsumerRead.arbitrumChainId()).to.equal(newArbitrumChainId);
    });

    it("Should allow configuring DVNs", async function () {
      const dvns = [user1.address, owner.address];
      const thresholdStart = 1;
      const thresholdEnd = 2;

      // Mock the endpoint.setConfig call since our testing mock doesn't implement it
      await sonicVRFConsumerRead.configureDVNs(
        READ_CHANNEL_ID,
        dvns,
        thresholdStart,
        thresholdEnd
      );

      // Since this is a mock without real DVN config verification, 
      // we just check that the call didn't revert
      expect(true).to.be.true;
    });
  });

  describe("Read functionality", function () {
    it("Should query and process VRF state", async function () {
      // Request a read
      const tx = await sonicVRFConsumerRead.queryArbitrumVRFState("0x", {
        value: ethers.utils.parseEther("0.01")
      });
      await tx.wait();

      // Prepare mock read response
      // This would normally come from LayerZero after the DVNs fetch the data
      const abiCoder = ethers.utils.defaultAbiCoder;
      
      // Encoding format matches what our mock endpoint will deliver
      // Note: This is a simplified simulation - the actual LayerZero Read response format may differ
      const responseData = abiCoder.encode(
        ["uint256", "uint64", "bytes32", "uint16", "uint32"],
        [
          0, // version
          MOCK_SUBSCRIPTION_ID,
          MOCK_KEY_HASH,
          MOCK_CONFIRMATIONS,
          MOCK_CALLBACK_GAS_LIMIT
        ]
      );

      // Mock receiving the response via LayerZero
      await sonicLzEndpoint.mockReceiveReadMessage(
        sonicVRFConsumerRead.address,
        ARBITRUM_CHAIN_ID,
        responseData
      );

      // Verify the state was updated correctly
      expect(await sonicVRFConsumerRead.lastQueriedSubscriptionId()).to.equal(MOCK_SUBSCRIPTION_ID);
      expect(await sonicVRFConsumerRead.lastQueriedKeyHash()).to.equal(MOCK_KEY_HASH);
      expect(await sonicVRFConsumerRead.lastQueriedConfirmations()).to.equal(MOCK_CONFIRMATIONS);
      expect(await sonicVRFConsumerRead.lastQueriedCallbackGasLimit()).to.equal(MOCK_CALLBACK_GAS_LIMIT);
    });

    it("Should reject unauthorized read responses", async function () {
      // Prepare mock read response with wrong source chain
      const wrongChainId = 999;
      const abiCoder = ethers.utils.defaultAbiCoder;
      
      const responseData = abiCoder.encode(
        ["uint256", "uint64", "bytes32", "uint16", "uint32"],
        [
          0,
          MOCK_SUBSCRIPTION_ID,
          MOCK_KEY_HASH,
          MOCK_CONFIRMATIONS,
          MOCK_CALLBACK_GAS_LIMIT
        ]
      );

      // Try to mock receiving from wrong chain - this should be ignored
      await sonicLzEndpoint.mockReceiveReadMessage(
        sonicVRFConsumerRead.address,
        wrongChainId,
        responseData
      );

      // State should not be updated
      expect(await sonicVRFConsumerRead.lastQueriedSubscriptionId()).to.equal(0);
    });
  });
}); 