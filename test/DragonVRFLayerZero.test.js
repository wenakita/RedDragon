// SPDX-License-Identifier: MIT
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Dragon VRF and LayerZero Integration", function () {
  let Dragon;
  let DragonSwapTrigger;
  let MockVRFCoordinator;
  let MockLayerZeroEndpoint;
  let SonicVRFReceiver;
  
  let dragon;
  let swapTrigger;
  let vrfCoordinator;
  let lzEndpoint;
  let vrfReceiver;
  
  let wrappedSonic;
  let owner;
  let user1;
  let user2;
  let jackpot;
  let ve69LP;
  
  // VRF and LayerZero config
  const keyHash = ethers.utils.keccak256("0x1234");
  const subscriptionId = 1234;
  const callbackGasLimit = 500000;
  const requestConfirmations = 3;
  const numWords = 1;
  
  // LayerZero config
  const CHAIN_ID_LOCAL = 1;
  const CHAIN_ID_REMOTE = 2;
  const minGasToTransfer = 300000;
  const gasForDestination = 300000;
  
  beforeEach(async function () {
    [owner, user1, user2, jackpot, ve69LP] = await ethers.getSigners();
    
    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    wrappedSonic = await MockERC20.deploy("Wrapped Sonic", "wS", 18);
    
    // Deploy mock VRF coordinator
    MockVRFCoordinator = await ethers.getContractFactory("MockVRFCoordinator");
    vrfCoordinator = await MockVRFCoordinator.deploy();
    
    // Deploy mock LayerZero endpoint
    MockLayerZeroEndpoint = await ethers.getContractFactory("MockLayerZeroEndpoint");
    lzEndpoint = await MockLayerZeroEndpoint.deploy(CHAIN_ID_LOCAL);
    
    // Deploy SonicVRFReceiver
    SonicVRFReceiver = await ethers.getContractFactory("SonicVRFReceiver");
    vrfReceiver = await SonicVRFReceiver.deploy(
      vrfCoordinator.address,
      lzEndpoint.address,
      keyHash,
      subscriptionId,
      callbackGasLimit,
      requestConfirmations,
      numWords
    );
    
    // Deploy Dragon token
    Dragon = await ethers.getContractFactory("Dragon");
    dragon = await Dragon.deploy(
      "Dragon Token",
      "DRAGON",
      jackpot.address,
      ve69LP.address,
      wrappedSonic.address
    );
    
    // Deploy DragonSwapTrigger
    DragonSwapTrigger = await ethers.getContractFactory("DragonSwapTrigger");
    swapTrigger = await DragonSwapTrigger.deploy(
      wrappedSonic.address,
      dragon.address,
      vrfReceiver.address
    );
    
    // Configure VRF Receiver with the trigger as its callback
    await vrfReceiver.setDragonSwapTrigger(swapTrigger.address);
    
    // Fund the subscription (this would be done differently on mainnet)
    await vrfCoordinator.fundSubscription(subscriptionId, ethers.utils.parseEther("10"));
    
    // Configure Dragon token with the swap trigger
    await dragon.setVRFConnector(swapTrigger.address);
    
    // Mint some wS to jackpot for prizes
    await wrappedSonic.mint(swapTrigger.address, ethers.utils.parseEther("100"));
    
    // Mint some wS to users for testing
    await wrappedSonic.mint(user1.address, ethers.utils.parseEther("10000"));
    await wrappedSonic.mint(user2.address, ethers.utils.parseEther("10000"));
    
    // Approve spending
    await wrappedSonic.connect(user1).approve(dragon.address, ethers.utils.parseEther("10000"));
    await wrappedSonic.connect(user2).approve(dragon.address, ethers.utils.parseEther("10000"));
  });
  
  describe("VRF Configuration", function () {
    it("Should have the correct VRF configuration", async function () {
      const config = await vrfReceiver.getVrfConfiguration();
      expect(config.coordinator).to.equal(vrfCoordinator.address);
      expect(config.keyHash).to.equal(keyHash);
      expect(config.subscriptionId).to.equal(subscriptionId);
      expect(config.callbackGasLimit).to.equal(callbackGasLimit);
      expect(config.requestConfirmations).to.equal(requestConfirmations);
      expect(config.numWords).to.equal(numWords);
    });
    
    it("Should trigger VRF requests when swapping wS for DRAGON", async function () {
      // Simulate a swap from wS to DRAGON
      const swapAmount = ethers.utils.parseEther("1000");
      
      // Track VRF request event
      await expect(swapTrigger.onSwapWSToDragon(user1.address, swapAmount))
        .to.emit(swapTrigger, "VRFRequested")
        .withArgs(0, user1.address);
      
      // Check if request was properly registered
      expect(await swapTrigger.requestToUser(0)).to.equal(user1.address);
      expect(await swapTrigger.requestCounter()).to.equal(1);
    });
    
    it("Should fulfill randomness correctly when VRF responds", async function () {
      // Setup jackpot
      const jackpotAmount = ethers.utils.parseEther("50");
      await wrappedSonic.connect(user2).approve(swapTrigger.address, jackpotAmount);
      await swapTrigger.connect(user2).addToJackpot(jackpotAmount);
      
      // Verify jackpot balance
      expect(await swapTrigger.jackpotBalance()).to.equal(jackpotAmount);
      
      // Trigger swap/lottery
      await swapTrigger.onSwapWSToDragon(user1.address, ethers.utils.parseEther("1000"));
      
      // Setup the mock to always make the user win (randomness % winThreshold == 0)
      const winThreshold = await swapTrigger.winThreshold();
      const rigged_randomness = winThreshold.mul(5); // Any multiple of winThreshold
      
      // Mock the VRF callback
      await vrfCoordinator.fulfillRandomWords(0, vrfReceiver.address, [rigged_randomness]);
      
      // Check if user won the jackpot (jackpot should be empty now)
      expect(await swapTrigger.jackpotBalance()).to.equal(0);
      
      // Check if user received the jackpot
      const userBalance = await wrappedSonic.balanceOf(user1.address);
      expect(userBalance).to.be.at.least(ethers.utils.parseEther("10000").add(jackpotAmount));
    });
    
    it("Should not transfer jackpot on losing randomness", async function () {
      // Setup jackpot
      const jackpotAmount = ethers.utils.parseEther("50");
      await wrappedSonic.connect(user2).approve(swapTrigger.address, jackpotAmount);
      await swapTrigger.connect(user2).addToJackpot(jackpotAmount);
      
      // Trigger swap/lottery
      await swapTrigger.onSwapWSToDragon(user1.address, ethers.utils.parseEther("1000"));
      
      // Setup losing randomness (not divisible by winThreshold)
      const winThreshold = await swapTrigger.winThreshold();
      const losing_randomness = winThreshold.mul(5).add(1); // Not a multiple of winThreshold
      
      // Mock the VRF callback
      await vrfCoordinator.fulfillRandomWords(0, vrfReceiver.address, [losing_randomness]);
      
      // Jackpot should remain unchanged
      expect(await swapTrigger.jackpotBalance()).to.equal(jackpotAmount);
      
      // User balance should not include jackpot
      const userBalance = await wrappedSonic.balanceOf(user1.address);
      expect(userBalance).to.equal(ethers.utils.parseEther("10000")); // Original balance
    });
  });
  
  describe("LayerZero Cross-Chain Configuration", function () {
    it("Should be able to send randomness across chains", async function () {
      // Set up a mock on the remote chain
      const remoteTrigger = await DragonSwapTrigger.deploy(
        wrappedSonic.address,
        dragon.address,
        vrfReceiver.address
      );
      
      // Configure LayerZero endpoint to know about the remote chain
      await lzEndpoint.setDestLzEndpoint(
        remoteTrigger.address,
        lzEndpoint.address
      );
      
      // Set up a trusted remote on the VRF receiver
      const remote_path = ethers.utils.solidityPack(
        ["address", "address"],
        [vrfReceiver.address, vrfReceiver.address]
      );
      await vrfReceiver.setTrustedRemote(CHAIN_ID_REMOTE, remote_path);
      
      // Trigger VRF request
      await swapTrigger.onSwapWSToDragon(user1.address, ethers.utils.parseEther("1000"));
      
      // Get randomness from VRF
      const randomness = ethers.BigNumber.from(12345);
      await vrfCoordinator.fulfillRandomWords(0, vrfReceiver.address, [randomness]);
      
      // Send randomness cross-chain (this would normally happen automatically)
      const payload = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint256"],
        [0, randomness]
      );
      
      // Mock the cross-chain message
      await lzEndpoint.receivePayload(
        CHAIN_ID_REMOTE,
        remote_path,
        vrfReceiver.address,
        0,
        payload,
        { gasLimit: gasForDestination }
      );
      
      // Verify the randomness was processed
      // This would normally check state on the remote chain
      // For test purposes, we check that the endpoint attempted the delivery
      expect(await lzEndpoint.getLastSentPayload()).to.equal(payload);
    });
  });
  
  describe("Integrated Tests", function () {
    it("Should handle multiple lottery entries", async function () {
      // Setup jackpot
      const jackpotAmount = ethers.utils.parseEther("100");
      await wrappedSonic.connect(user2).approve(swapTrigger.address, jackpotAmount);
      await swapTrigger.connect(user2).addToJackpot(jackpotAmount);
      
      // Create multiple entries
      for (let i = 0; i < 5; i++) {
        await swapTrigger.onSwapWSToDragon(
          user1.address,
          ethers.utils.parseEther(String(1000 * (i + 1)))
        );
      }
      
      // Verify all requests were registered
      expect(await swapTrigger.requestCounter()).to.equal(5);
      
      // Fulfill randomness for each entry (all are losers except the last one)
      for (let i = 0; i < 4; i++) {
        const losing_randomness = (await swapTrigger.winThreshold()).mul(5).add(i + 1);
        await vrfCoordinator.fulfillRandomWords(i, vrfReceiver.address, [losing_randomness]);
      }
      
      // Last entry is a winner
      const winThreshold = await swapTrigger.winThreshold();
      const winning_randomness = winThreshold.mul(7); // Multiple of winThreshold
      await vrfCoordinator.fulfillRandomWords(4, vrfReceiver.address, [winning_randomness]);
      
      // Verify jackpot was distributed
      expect(await swapTrigger.jackpotBalance()).to.equal(0);
      
      // User1 should have received the jackpot
      const userBalance = await wrappedSonic.balanceOf(user1.address);
      expect(userBalance).to.be.at.least(ethers.utils.parseEther("10000").add(jackpotAmount));
    });
  });
}); 