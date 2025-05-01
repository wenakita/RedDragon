const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BaseDragonSwapTrigger", function () {
  let baseDragonSwapTrigger;
  let mockChainRegistry;
  let mockWeth;
  let mockDragonToken;
  let mockVrfCoordinator;
  let owner;
  let user;
  
  const SUBSCRIPTION_ID = 123;
  const KEY_HASH = "0x8472ba59cf7134dfe321f4d61a430c4857e8b19cdd5230b09952a92671c24409";
  const CALLBACK_GAS_LIMIT = 500000;
  const MIN_SWAP_AMOUNT = ethers.utils.parseEther("0.01");
  const BASE_CHAIN_ID = 184;
  
  beforeEach(async function () {
    // Get signers
    [owner, user] = await ethers.getSigners();
    
    // Deploy mock contracts
    const MockWETH = await ethers.getContractFactory("MockERC20");
    mockWeth = await MockWETH.deploy("Wrapped ETH", "WETH");
    
    const MockDragonToken = await ethers.getContractFactory("MockERC20");
    mockDragonToken = await MockDragonToken.deploy("Dragon Token", "DRAGON");
    
    const MockChainRegistry = await ethers.getContractFactory("MockChainRegistry");
    mockChainRegistry = await MockChainRegistry.deploy();
    
    const MockVRFCoordinator = await ethers.getContractFactory("MockVRFCoordinator");
    mockVrfCoordinator = await MockVRFCoordinator.deploy();
    
    // Deploy BaseDragonSwapTrigger
    const BaseDragonSwapTrigger = await ethers.getContractFactory("BaseDragonSwapTrigger");
    baseDragonSwapTrigger = await BaseDragonSwapTrigger.deploy(
      mockWeth.address,
      mockDragonToken.address,
      mockVrfCoordinator.address,
      KEY_HASH,
      SUBSCRIPTION_ID,
      CALLBACK_GAS_LIMIT,
      MIN_SWAP_AMOUNT,
      mockChainRegistry.address
    );
    
    // Fund user with WETH
    await mockWeth.mint(user.address, ethers.utils.parseEther("10"));
    
    // Approve BaseDragonSwapTrigger to spend user's WETH
    await mockWeth.connect(user).approve(baseDragonSwapTrigger.address, ethers.utils.parseEther("10"));
  });
  
  describe("Initialization", function() {
    it("Should initialize with correct values", async function() {
      expect(await baseDragonSwapTrigger.getNativeTokenWrapper()).to.equal(mockWeth.address);
      expect(await baseDragonSwapTrigger.dragonToken()).to.equal(mockDragonToken.address);
      expect(await baseDragonSwapTrigger.minSwapAmount()).to.equal(MIN_SWAP_AMOUNT);
      expect(await baseDragonSwapTrigger.chainId()).to.equal(BASE_CHAIN_ID);
      expect(await baseDragonSwapTrigger.chainName()).to.equal("Base");
      expect(await baseDragonSwapTrigger.keyHash()).to.equal(KEY_HASH);
      expect(await baseDragonSwapTrigger.subscriptionId()).to.equal(SUBSCRIPTION_ID);
      expect(await baseDragonSwapTrigger.callbackGasLimit()).to.equal(CALLBACK_GAS_LIMIT);
    });
  });
  
  describe("VRF Functionality", function() {
    it("Should request randomness when a user swaps", async function() {
      // Set up VRF Coordinator mock to record requestRandomWords calls
      await mockVrfCoordinator.setWillFulfill(true);
      
      // Execute swap
      const swapAmount = ethers.utils.parseEther("0.05");
      await baseDragonSwapTrigger.connect(user).onSwapNativeTokenToDragon(user.address, swapAmount);
      
      // Check if VRF request was made
      const requestId = await mockVrfCoordinator.getLastRequestId();
      expect(requestId).to.not.equal(0);
      
      // Verify request details
      const requestDetails = await baseDragonSwapTrigger.requestToUser(requestId);
      expect(requestDetails).to.equal(user.address);
    });
    
    it("Should handle VRF callback and process randomness", async function() {
      // Execute swap first
      const swapAmount = ethers.utils.parseEther("0.05");
      await baseDragonSwapTrigger.connect(user).onSwapNativeTokenToDragon(user.address, swapAmount);
      
      // Get requestId
      const requestId = await mockVrfCoordinator.getLastRequestId();
      
      // Generate random values
      const randomWords = [ethers.BigNumber.from("12345678901234567890")];
      
      // Call fulfillRandomWords to simulate VRF callback
      await mockVrfCoordinator.fulfillRandomWords(requestId, baseDragonSwapTrigger.address, randomWords);
      
      // Check if randomness was processed
      // This would typically trigger the fulfillRandomness function in BaseDragonSwapTrigger
      // which would call the internal this.fulfillRandomness function with the random value
      
      // Verify request is cleaned up or processed
      const userAfterFulfill = await baseDragonSwapTrigger.requestToUser(requestId);
      expect(userAfterFulfill).to.equal(ethers.constants.AddressZero); // Should be cleared
    });
  });
  
  describe("Lottery Mechanics", function() {
    it("Should have jackpot balance", async function() {
      // Add funds to jackpot
      const jackpotAmount = ethers.utils.parseEther("5");
      await mockWeth.mint(owner.address, jackpotAmount);
      await mockWeth.approve(baseDragonSwapTrigger.address, jackpotAmount);
      await baseDragonSwapTrigger.addToJackpot(jackpotAmount);
      
      // Check jackpot balance
      expect(await baseDragonSwapTrigger.jackpotBalance()).to.equal(jackpotAmount);
    });
    
    it("Should handle lottery win condition correctly", async function() {
      // Add funds to jackpot first
      const jackpotAmount = ethers.utils.parseEther("5");
      await mockWeth.mint(owner.address, jackpotAmount);
      await mockWeth.approve(baseDragonSwapTrigger.address, jackpotAmount);
      await baseDragonSwapTrigger.addToJackpot(jackpotAmount);
      
      // Execute swap
      const swapAmount = ethers.utils.parseEther("0.05");
      await baseDragonSwapTrigger.connect(user).onSwapNativeTokenToDragon(user.address, swapAmount);
      
      // Get requestId
      const requestId = await mockVrfCoordinator.getLastRequestId();
      
      // Mock winning randomness by providing a value that will trigger a win
      // This will depend on the specific implementation of the win condition
      const winningRandomness = 0; // Typically a value where randomness % threshold == 0
      
      // Process the winning randomness
      await baseDragonSwapTrigger.connect(mockVrfCoordinator.address).fulfillRandomness(requestId, winningRandomness);
      
      // Check if the user won (should have received jackpot)
      const userBalanceAfterWin = await mockWeth.balanceOf(user.address);
      expect(userBalanceAfterWin).to.be.gt(ethers.utils.parseEther("0")); // User should have won something
      
      // Jackpot should be reduced
      expect(await baseDragonSwapTrigger.jackpotBalance()).to.be.lt(jackpotAmount);
    });
  });
  
  describe("Admin Functions", function() {
    it("Should allow owner to update min swap amount", async function() {
      const newMinAmount = ethers.utils.parseEther("0.02");
      await baseDragonSwapTrigger.setMinSwapAmount(newMinAmount);
      expect(await baseDragonSwapTrigger.minSwapAmount()).to.equal(newMinAmount);
    });
    
    it("Should prevent non-owner from updating settings", async function() {
      const newMinAmount = ethers.utils.parseEther("0.02");
      await expect(
        baseDragonSwapTrigger.connect(user).setMinSwapAmount(newMinAmount)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    
    it("Should revert when trying to change VRF consumer", async function() {
      await expect(
        baseDragonSwapTrigger.setVRFConsumer(user.address)
      ).to.be.revertedWith("VRF consumer cannot be changed on Base");
    });
  });
});
