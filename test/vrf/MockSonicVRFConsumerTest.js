const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MockSonicVRFConsumer and MockLotteryHandler", function () {
  let owner, user1, user2;
  let mockSonicVRFConsumer, mockLotteryHandler, mockArbitrumVRFRequester;

  const ARBITRUM_CHAIN_ID = 110;
  const SONIC_CHAIN_ID = 111;

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

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

    // Deploy MockSonicVRFConsumer
    const MockSonicVRFConsumer = await ethers.getContractFactory("MockSonicVRFConsumer");
    mockSonicVRFConsumer = await MockSonicVRFConsumer.deploy(
      sonicLzEndpoint.address,
      ARBITRUM_CHAIN_ID,
      mockArbitrumVRFRequester.address
    );

    // Deploy MockLotteryHandler
    const MockLotteryHandler = await ethers.getContractFactory("MockLotteryHandler");
    mockLotteryHandler = await MockLotteryHandler.deploy(mockSonicVRFConsumer.address);

    // Set up the lottery handler in the VRF consumer
    await mockSonicVRFConsumer.setLotteryHandler(mockLotteryHandler.address);

    // Set up trusted remotes for cross-chain communication
    const sonicAddress = ethers.utils.solidityPack(
      ["address", "address"],
      [mockSonicVRFConsumer.address, mockArbitrumVRFRequester.address]
    );
    const arbitrumAddress = ethers.utils.solidityPack(
      ["address", "address"],
      [mockArbitrumVRFRequester.address, mockSonicVRFConsumer.address]
    );

    await mockSonicVRFConsumer.setTrustedRemote(
      ARBITRUM_CHAIN_ID,
      arbitrumAddress
    );
    await mockArbitrumVRFRequester.setTrustedRemote(
      SONIC_CHAIN_ID,
      sonicAddress
    );

    // Wire up the mock endpoints (this would be the LayerZero network in production)
    await sonicLzEndpoint.setDestLzEndpoint(
      mockArbitrumVRFRequester.address,
      arbitrumLzEndpoint.address
    );
    await arbitrumLzEndpoint.setDestLzEndpoint(
      mockSonicVRFConsumer.address,
      sonicLzEndpoint.address
    );

    // Add some funds to the jackpot
    await mockLotteryHandler.depositToJackpot(ethers.utils.parseEther("10"));
  });

  describe("Basic functionality", function () {
    it("Should have correct initial setup", async function () {
      expect(await mockSonicVRFConsumer.lzEndpoint()).to.equal(
        await mockSonicVRFConsumer.lzEndpoint()
      );
      expect(await mockSonicVRFConsumer.arbitrumChainId()).to.equal(ARBITRUM_CHAIN_ID);
      expect(await mockSonicVRFConsumer.arbitrumVRFRequester()).to.equal(
        mockArbitrumVRFRequester.address
      );
      expect(await mockSonicVRFConsumer.lotteryHandler()).to.equal(
        mockLotteryHandler.address
      );
      expect(await mockLotteryHandler.jackpotAmount()).to.equal(
        ethers.utils.parseEther("10")
      );
    });

    it("Should be able to set trusted remote addresses", async function () {
      const newArbitrumRequester = user1.address;
      await mockSonicVRFConsumer.setArbitrumVRFRequester(newArbitrumRequester);
      expect(await mockSonicVRFConsumer.arbitrumVRFRequester()).to.equal(
        newArbitrumRequester
      );
    });
  });

  describe("Lottery flow", function () {
    it("Should trigger lottery and complete the flow", async function () {
      // Send some ETH to the contracts to cover fees
      await owner.sendTransaction({
        to: mockSonicVRFConsumer.address,
        value: ethers.utils.parseEther("1"),
      });
      await owner.sendTransaction({
        to: mockArbitrumVRFRequester.address,
        value: ethers.utils.parseEther("1"),
      });

      // Trigger the lottery for user1
      const tx = await mockLotteryHandler.triggerLottery(user1.address, {
        value: ethers.utils.parseEther("0.1"),
      });
      const receipt = await tx.wait();

      // Get the lottery ID and request ID
      const lotteryEvent = receipt.events.find(
        (e) => e.event === "LotteryTriggered"
      );
      const [lotteryId, user, requestId] = lotteryEvent.args;

      // Check lottery was triggered correctly
      expect(user).to.equal(user1.address);
      expect(await mockSonicVRFConsumer.requestExists(requestId)).to.be.true;

      // Mock the randomness reception from Arbitrum
      // This simulates the cross-chain flow where Arbitrum would send back randomness
      // In a real environment, this would happen automatically through LayerZero messaging
      const mockRandomValue = ethers.BigNumber.from(
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
      );

      // To simulate the flow, we'll directly call the _nonblockingLzReceive function
      // with the encoded payload that would come from the Arbitrum chain
      const encodedPayload = ethers.utils.defaultAbiCoder.encode(
        ["uint64", "uint256"],
        [requestId, mockRandomValue]
      );

      // Mocking as if the message came from Arbitrum VRF Requester
      await sonicLzEndpoint.mockReceiveMessage(
        mockSonicVRFConsumer.address,
        ARBITRUM_CHAIN_ID,
        encodedPayload,
        mockArbitrumVRFRequester.address
      );

      // Check if the request was processed
      expect(await mockSonicVRFConsumer.requestExists(requestId)).to.be.false;
      expect(await mockSonicVRFConsumer.getRandomnessResult(requestId)).to.equal(
        mockRandomValue
      );

      // Get the lottery result
      const [completed, winner, winningNumber] = await mockLotteryHandler.getLotteryResult(lotteryId);
      
      // Check lottery was completed
      expect(completed).to.be.true;
      
      // The winning number is derived from the random value
      const expectedWinningNumber = (mockRandomValue.mod(1000)).add(1);
      expect(winningNumber).to.equal(expectedWinningNumber);
      
      // Check if there was a winner (numbers 1-10 are winners in our mock)
      if (expectedWinningNumber.lte(10)) {
        expect(winner).to.equal(user1.address);
        expect(await mockLotteryHandler.jackpotAmount()).to.equal(0); // Jackpot should be emptied
      } else {
        expect(winner).to.equal(ethers.constants.AddressZero);
        expect(await mockLotteryHandler.jackpotAmount()).to.equal(ethers.utils.parseEther("10")); // Jackpot should remain
      }
    });
  });
}); 