const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PaintSwap VRF Integration", function () {
  let DragonLotterySwap, lotterySwap;
  let MockVRF, mockVRF, invalidMockVRF;
  let owner, user1, user2, jackpotAddress, ve69LPAddress, burnAddress;
  let wrappedSonic;

  // Define the official VRF coordinator address
  const OFFICIAL_VRF_COORDINATOR = "0x3Ba925fdeAe6B46d0BB4d424D829982Cb2F7309e";

  beforeEach(async function () {
    [owner, user1, user2, jackpotAddress, ve69LPAddress, burnAddress] = await ethers.getSigners();

    // Deploy the MockWrappedSonic contract
    const MockWrappedSonic = await ethers.getContractFactory("MockWrappedSonic");
    wrappedSonic = await MockWrappedSonic.deploy();
    await wrappedSonic.deployed();

    // Create two mock VRF implementations - one with the correct coordinator and one with an incorrect one
    MockVRF = await ethers.getContractFactory("MockDragonPaintSwapVRF");
    
    // Valid mock with correct coordinator
    mockVRF = await MockVRF.deploy(OFFICIAL_VRF_COORDINATOR, true); // true = valid config
    await mockVRF.deployed();
    
    // Invalid mock with incorrect coordinator
    invalidMockVRF = await MockVRF.deploy(user1.address, false); // false = invalid config
    await invalidMockVRF.deployed();
    
    // Deploy the concrete lottery implementation with valid VRF
    const ConcreteLottery = await ethers.getContractFactory("ConcreteDragonLotterySwap");
    lotterySwap = await ConcreteLottery.deploy(
      wrappedSonic.address,
      mockVRF.address,
      ethers.constants.AddressZero, // No registry for this test
      ethers.constants.AddressZero  // No gold scratcher for this test
    );
    await lotterySwap.deployed();
  });

  describe("VRF Configuration", function () {
    it("should correctly use the PaintSwap VRF for randomness", async function () {
      // Get VRF configuration
      const vrfConfig = await lotterySwap.getVRFConfiguration();
      expect(vrfConfig[0]).to.equal(OFFICIAL_VRF_COORDINATOR);
    });

    it("should correctly handle VRF randomness requests", async function () {
      // Mock some wSonic for testing
      await wrappedSonic.mint(user1.address, ethers.utils.parseEther("10"));
      await wrappedSonic.connect(user1).approve(lotterySwap.address, ethers.utils.parseEther("10"));
      
      // Add some jackpot for potential wins
      await wrappedSonic.mint(lotterySwap.address, ethers.utils.parseEther("100"));
      await lotterySwap.addToJackpot(ethers.utils.parseEther("100"));

      // Set up the test environment
      await lotterySwap.setExchangePair(owner.address); // Mock exchange pair
      
      // Verify the mock VRF hasn't been called yet
      expect(await mockVRF.requestCount()).to.equal(0);
      
      // Make a test entry
      // Assuming testProcessEntry is available for testing
      await lotterySwap.connect(owner).testProcessEntry(
        user1.address, 
        ethers.utils.parseEther("10"), 
        0, // No scratcher
        "", // No promotion type
        0  // No promotion ID
      );
      
      // Verify the VRF was called
      expect(await mockVRF.requestCount()).to.equal(1);
    });
  });

  describe("VRF Validation", function () {
    it("should not allow setting an invalid VRF verifier", async function () {
      // Try to set an invalid VRF (with wrong coordinator)
      await expect(
        lotterySwap.setVerifier(invalidMockVRF.address)
      ).to.be.revertedWith("Invalid VRF coordinator");
    });

    it("should allow setting a valid VRF verifier", async function () {
      // Deploy another valid mock VRF
      const anotherValidMock = await MockVRF.deploy(OFFICIAL_VRF_COORDINATOR, true);
      await anotherValidMock.deployed();
      
      // Should be able to set it
      await lotterySwap.setVerifier(anotherValidMock.address);
      
      // Verify it was set
      const vrfConfig = await lotterySwap.getVRFConfiguration();
      expect(vrfConfig[0]).to.equal(OFFICIAL_VRF_COORDINATOR);
    });
  });

  describe("Fallback Mechanism", function () {
    it("should use fallback mechanism when VRF is unavailable", async function () {
      // Configure the mock to fail
      await mockVRF.setShouldFail(true);
      
      // Mock some wSonic for testing
      await wrappedSonic.mint(user1.address, ethers.utils.parseEther("10"));
      await wrappedSonic.connect(user1).approve(lotterySwap.address, ethers.utils.parseEther("10"));
      
      // Set up the test environment
      await lotterySwap.setExchangePair(owner.address); // Mock exchange pair
      
      // Entry should still work with fallback
      await lotterySwap.connect(owner).testProcessEntry(
        user1.address, 
        ethers.utils.parseEther("10"), 
        0, // No scratcher
        "", // No promotion type
        0  // No promotion ID
      );
      
      // Entry was processed despite VRF failure
      // Check that the entry was recorded
      expect(await lotterySwap.totalEntries()).to.equal(1);
    });
  });

  describe("VRF Retry Mechanism", function () {
    it("should handle delayed entries when VRF is temporarily unavailable", async function () {
      // Configure the mock to fail
      await mockVRF.setShouldFail(true);
      
      // Mock some wSonic for testing
      await wrappedSonic.mint(user1.address, ethers.utils.parseEther("10"));
      await wrappedSonic.connect(user1).approve(lotterySwap.address, ethers.utils.parseEther("10"));
      
      // Set up the retry parameters
      await lotterySwap.setVrfRetryParameters(60, 3); // 60 seconds delay, 3 retries
      
      // Try to process entry by user directly (should create pending entry)
      // This method would need to be added to the concrete implementation for testing
      await lotterySwap.connect(user1).tryProcessEntry(
        ethers.utils.parseEther("10")
      );
      
      // Verify the entry was registered as pending
      const pendingEntry = await lotterySwap.pendingEntries(user1.address);
      expect(pendingEntry.isPending).to.be.true;
      expect(pendingEntry.wsAmount).to.equal(ethers.utils.parseEther("10"));
      
      // Fix the VRF
      await mockVRF.setShouldFail(false);
      
      // Advance time
      await ethers.provider.send("evm_increaseTime", [61]); // 61 seconds
      await ethers.provider.send("evm_mine");
      
      // Process the delayed entry
      await lotterySwap.processDelayedEntry(user1.address);
      
      // Verify the entry was processed
      const pendingEntryAfter = await lotterySwap.pendingEntries(user1.address);
      expect(pendingEntryAfter.isPending).to.be.false;
      expect(await lotterySwap.totalEntries()).to.equal(1);
    });
  });
}); 