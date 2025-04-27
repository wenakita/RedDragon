const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Cross-Chain VRF Solution", function () {
  let MockArbitrumVRFRequester;
  let MockSonicVRFReceiver;
  let MockDragonSwapTrigger;
  let MockLayerZeroEndpoint;
  let MockVRFCoordinator;
  let MockERC20;
  
  let arbitrumVRFRequester;
  let sonicVRFReceiver;
  let dragonSwapTrigger;
  let arbitrumLzEndpoint;
  let sonicLzEndpoint;
  let vrfCoordinator;
  let dragonToken;
  let wrappedSonic;
  
  let owner;
  let user1;
  let user2;
  
  // Constants for tests
  const ARBITRUM_CHAIN_ID = 110;
  const SONIC_CHAIN_ID = 198;
  const SUBSCRIPTION_ID = "1234";
  const KEY_HASH = "0x8472ba59cf7134dfe321f4d61a430c4857e8b19cdd5230b09952a92671c24409";
  
  // Helper function to generate LayerZero encoded address
  function encodedPath(srcAddr, destAddr) {
    return ethers.solidityPacked(["address", "address"], [srcAddr, destAddr]);
  }
  
  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();
    
    // Get contract factories
    MockLayerZeroEndpoint = await ethers.getContractFactory("MockLayerZeroEndpoint");
    MockVRFCoordinator = await ethers.getContractFactory("MockVRFCoordinator");
    MockERC20 = await ethers.getContractFactory("MockERC20");
    MockArbitrumVRFRequester = await ethers.getContractFactory("MockArbitrumVRFRequester");
    MockSonicVRFReceiver = await ethers.getContractFactory("MockSonicVRFReceiver");
    MockDragonSwapTrigger = await ethers.getContractFactory("MockDragonSwapTrigger");
    
    // Deploy mock tokens
    wrappedSonic = await MockERC20.deploy("Wrapped Sonic", "wS", 18);
    dragonToken = await MockERC20.deploy("Dragon", "DRAGON", 18);
    
    // Deploy LayerZero endpoints for both chains
    arbitrumLzEndpoint = await MockLayerZeroEndpoint.deploy(ARBITRUM_CHAIN_ID);
    sonicLzEndpoint = await MockLayerZeroEndpoint.deploy(SONIC_CHAIN_ID);
    
    // Deploy VRF coordinator
    vrfCoordinator = await MockVRFCoordinator.deploy();
    
    // Fund the VRF subscription
    await vrfCoordinator.fundSubscription(SUBSCRIPTION_ID, ethers.parseEther("10"));
    
    // Deploy DragonSwapTrigger first (will update VRF receiver later)
    dragonSwapTrigger = await MockDragonSwapTrigger.deploy(
      wrappedSonic.target,
      dragonToken.target,
      ethers.ZeroAddress // Will update later
    );
    
    // Deploy SonicVRFReceiver with dummy parameters (will update later)
    sonicVRFReceiver = await MockSonicVRFReceiver.deploy(
      dragonSwapTrigger.target,
      ARBITRUM_CHAIN_ID,
      sonicLzEndpoint.target,
      encodedPath(ethers.ZeroAddress, ethers.ZeroAddress) // Placeholder
    );
    
    // Update DragonSwapTrigger with VRF receiver
    await dragonSwapTrigger.setSonicVRFReceiver(sonicVRFReceiver.target);
    
    // Deploy ArbitrumVRFRequester
    arbitrumVRFRequester = await MockArbitrumVRFRequester.deploy(
      vrfCoordinator.target,
      SUBSCRIPTION_ID,
      KEY_HASH,
      arbitrumLzEndpoint.target,
      SONIC_CHAIN_ID,
      sonicVRFReceiver.target
    );
    
    // Setup proper trusted remotes and paths
    await sonicVRFReceiver.setTrustedRemote(
      ARBITRUM_CHAIN_ID,
      encodedPath(arbitrumVRFRequester.target, sonicVRFReceiver.target)
    );
    
    // Configure LayerZero endpoints to know about each other
    await sonicLzEndpoint.setDestLzEndpoint(arbitrumVRFRequester.target, arbitrumLzEndpoint.target);
    await arbitrumLzEndpoint.setDestLzEndpoint(sonicVRFReceiver.target, sonicLzEndpoint.target);
    
    // Mint tokens to user1 for testing
    await wrappedSonic.mint(user1.address, ethers.parseEther("10000"));
    await wrappedSonic.mint(dragonSwapTrigger.target, ethers.parseEther("1000")); // Initial jackpot
    
    // Set up jackpot in DragonSwapTrigger
    await dragonSwapTrigger.setWinThreshold(10); // 10% chance to win for testing
  });
  
  describe("Cross-Chain VRF End-to-End Flow", function () {
    it("Should handle the complete cross-chain VRF flow", async function () {
      // Step 1: User swaps wS for DRAGON which triggers the lottery
      await dragonSwapTrigger.onSwapWSToDragon(user1.address, ethers.parseEther("1000"));
      
      // Step 2: SonicVRFReceiver should have emitted an event
      const requestEvents = await dragonSwapTrigger.queryFilter("VRFRequested");
      expect(requestEvents.length).to.equal(1);
      const requestId = requestEvents[0].args.requestId;
      
      // Step 3: Manually simulate the LayerZero message from Sonic to Arbitrum
      const sonicToArbitrumPayload = ethers.AbiCoder.defaultAbiCoder().encode(["uint64"], [requestId]);
      
      // Send from Sonic to Arbitrum
      await sonicLzEndpoint.receivePayload(
        SONIC_CHAIN_ID,
        encodedPath(sonicVRFReceiver.target, arbitrumVRFRequester.target),
        arbitrumVRFRequester.target,
        0, // nonce
        sonicToArbitrumPayload,
        "0x" // adapter params
      );
      
      // Step 4: ArbitrumVRFRequester should have requested randomness
      const randomnessEvents = await arbitrumVRFRequester.queryFilter("RandomnessRequested");
      expect(randomnessEvents.length).to.equal(1);
      const vrfRequestId = randomnessEvents[0].args.vrfRequestId;
      
      // Step 5: Simulate Chainlink VRF fulfilling the request
      const randomValue = ethers.parseEther("12345"); // Mock random value
      const randomWords = [randomValue];
      
      // Store user balance before to check jackpot distribution later
      const userBalanceBefore = await wrappedSonic.balanceOf(user1.address);
      
      // Fulfill the randomness
      await vrfCoordinator.fulfillRandomWords(vrfRequestId, arbitrumVRFRequester.target, randomWords);
      
      // Step 6: Verify the randomness was received by Sonic
      // The randomness should have been automatically forwarded to Sonic through the mock LZ endpoint
      
      // Step 7: Verify the lottery result
      const userBalanceAfter = await wrappedSonic.balanceOf(user1.address);
      
      // Winner detection depends on randomValue % winThreshold === 0
      if (randomValue % 10n === 0n) {
        // User won
        expect(userBalanceAfter).to.equal(
          userBalanceBefore + ethers.parseEther("1000")
        );
        // Jackpot should be empty
        expect(await dragonSwapTrigger.jackpotBalance()).to.equal(0);
      } else {
        // User didn't win
        expect(userBalanceAfter).to.equal(userBalanceBefore);
        // Jackpot should remain the same
        expect(await dragonSwapTrigger.jackpotBalance()).to.equal(ethers.parseEther("1000"));
      }
    });
  });
  
  describe("Cross-Chain Security Validation", function () {
    it("Should verify source chain and trusted remote validation", async function () {
      // Create a dummy payload
      const payload = ethers.AbiCoder.defaultAbiCoder().encode(["uint64"], [0]);
      
      // Try to send from wrong chain ID
      const wrongChainId = 999;
      await expect(
        sonicLzEndpoint.receivePayload(
          wrongChainId,
          encodedPath(arbitrumVRFRequester.target, sonicVRFReceiver.target),
          sonicVRFReceiver.target,
          0,
          payload,
          "0x"
        )
      ).to.be.revertedWith("SonicVRFReceiver: Invalid source chain");
      
      // Try to send from untrusted remote
      const untrustedPath = encodedPath(owner.address, sonicVRFReceiver.target);
      await expect(
        sonicLzEndpoint.receivePayload(
          ARBITRUM_CHAIN_ID,
          untrustedPath,
          sonicVRFReceiver.target,
          0,
          payload,
          "0x"
        )
      ).to.be.revertedWith("SonicVRFReceiver: Invalid source address");
    });
  });
  
  describe("Configuration Management", function () {
    it("Should allow updating VRF configuration", async function () {
      // Update Arbitrum VRF config
      const newKeyHash = "0x9999999999999999999999999999999999999999999999999999999999999999";
      await arbitrumVRFRequester.setVRFConfig(
        vrfCoordinator.target,
        SUBSCRIPTION_ID,
        newKeyHash
      );
      
      // Verify the update
      expect(await arbitrumVRFRequester.keyHash()).to.equal(newKeyHash);
      
      // Update request config
      await arbitrumVRFRequester.setRequestConfig(5, 2);
      expect(await arbitrumVRFRequester.requestConfirmations()).to.equal(5);
      expect(await arbitrumVRFRequester.numWords()).to.equal(2);
    });
    
    it("Should allow updating trusted remotes", async function () {
      // Update trusted remote on Sonic VRF Receiver
      const newPath = encodedPath(user2.address, sonicVRFReceiver.target);
      await sonicVRFReceiver.setTrustedRemote(ARBITRUM_CHAIN_ID, newPath);
      
      // Random data just to test functionality
      const payload = ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "uint256"], [0, 0]);
      
      // Try to receive from old path - should fail
      await expect(
        sonicLzEndpoint.receivePayload(
          ARBITRUM_CHAIN_ID,
          encodedPath(arbitrumVRFRequester.target, sonicVRFReceiver.target),
          sonicVRFReceiver.target,
          0,
          payload,
          "0x"
        )
      ).to.be.revertedWith("SonicVRFReceiver: Invalid source address");
      
      // Receive from new path - should work
      await sonicLzEndpoint.receivePayload(
        ARBITRUM_CHAIN_ID,
        newPath,
        sonicVRFReceiver.target,
        0,
        payload,
        "0x"
      );
      
      // Successful receipt should emit RandomnessReceived event
      const randomnessEvents = await sonicVRFReceiver.queryFilter("RandomnessReceived");
      expect(randomnessEvents.length).to.be.gt(0);
    });
  });
}); 