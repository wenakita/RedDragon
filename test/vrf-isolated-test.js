const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VRF Mock Test (Isolated)", function () {
  let VRFTestHelper;
  let vrfTestHelper;
  let SonicVRFConsumerMock;
  let sonicVRFConsumer;
  let MockLzEndpoint;
  let lzEndpoint;
  let owner;
  let user1;
  let user2;
  let lotteryContract;

  beforeEach(async function () {
    [owner, user1, user2, lotteryContract] = await ethers.getSigners();

    // Deploy mock LZ endpoint first
    MockLzEndpoint = await ethers.getContractFactory("MockLzEndpoint");
    lzEndpoint = await MockLzEndpoint.deploy();
    await lzEndpoint.deployed();
    
    // Deploy VRF test helper
    VRFTestHelper = await ethers.getContractFactory("VRFTestHelper");
    vrfTestHelper = await VRFTestHelper.deploy();
    await vrfTestHelper.deployed();
    
    // Deploy mock Sonic VRF consumer
    SonicVRFConsumerMock = await ethers.getContractFactory("SonicVRFConsumerMock");
    sonicVRFConsumer = await SonicVRFConsumerMock.deploy(
      lzEndpoint.address,
      110, // Arbitrum chain ID
      vrfTestHelper.address, // Mock arbitrum VRF requester
      lotteryContract.address
    );
    await sonicVRFConsumer.deployed();
    
    // Fund the contracts
    await owner.sendTransaction({
      to: sonicVRFConsumer.address,
      value: ethers.utils.parseEther("1.0")
    });
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
  });
  
  describe("SonicVRFConsumerMock basic functionality", function () {
    it("Should initialize with correct parameters", async function () {
      expect(await sonicVRFConsumer.arbitrumChainId()).to.equal(110);
      expect(await sonicVRFConsumer.arbitrumVRFRequester()).to.equal(vrfTestHelper.address);
      expect(await sonicVRFConsumer.lotteryContract()).to.equal(lotteryContract.address);
    });
    
    it("Should allow owner to update parameters", async function () {
      await sonicVRFConsumer.updateArbitrumChainId(120);
      expect(await sonicVRFConsumer.arbitrumChainId()).to.equal(120);
      
      await sonicVRFConsumer.updateArbitrumVRFRequester(user1.address);
      expect(await sonicVRFConsumer.arbitrumVRFRequester()).to.equal(user1.address);
      
      await sonicVRFConsumer.updateLotteryContract(user2.address);
      expect(await sonicVRFConsumer.lotteryContract()).to.equal(user2.address);
    });
    
    it("Should revert when non-lottery contract tries to request randomness", async function () {
      await expect(
        sonicVRFConsumer.requestRandomness(user1.address)
      ).to.be.revertedWith("Only lottery contract");
    });
  });
}); 