const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("OmniDragon Chain-Specific Implementation", function () {
  // Contracts
  let chainRegistry;
  let omniDragon;
  let sonicSwapTrigger;
  let baseSwapTrigger;
  let jackpotVault;
  let feeDistributor;
  let mockLzEndpoint;

  // Tokens
  let wSonic;
  let wEth;
  
  // Mock VRF
  let sonicVRFConsumer;
  let chainlinkVRFCoordinator;
  
  // Addresses
  let owner;
  let user1;
  let user2;
  let multisig;
  
  // Constants
  const SONIC_CHAIN_ID = 146;
  const BASE_CHAIN_ID = 184;
  const DRAGON_SUPPLY = ethers.utils.parseEther("1000000");
  const MIN_SWAP_AMOUNT = ethers.utils.parseEther("10");

  beforeEach(async function () {
    [owner, user1, user2, multisig] = await ethers.getSigners();
    
    // Deploy mock LayerZero endpoint
    const MockLzEndpoint = await ethers.getContractFactory("MockLzEndpoint");
    mockLzEndpoint = await MockLzEndpoint.deploy();
    
    // Deploy mock tokens - wSonic and wEth
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    wSonic = await MockERC20.deploy("Wrapped Sonic", "wS", 18);
    wEth = await MockERC20.deploy("Wrapped Ether", "WETH", 18);
    
    // Deploy mock VRF components
    const MockSonicVRFConsumer = await ethers.getContractFactory("MockSonicVRFConsumer");
    sonicVRFConsumer = await MockSonicVRFConsumer.deploy();
    
    const MockVRFCoordinatorV2 = await ethers.getContractFactory("MockVRFCoordinatorV2");
    chainlinkVRFCoordinator = await MockVRFCoordinatorV2.deploy();
    
    // Deploy jackpot vault and fee distributor
    const DragonJackpotVault = await ethers.getContractFactory("DragonJackpotVault");
    jackpotVault = await DragonJackpotVault.deploy(wSonic.address);
    
    const Ve69LPFeeDistributor = await ethers.getContractFactory("Ve69LPFeeDistributor");
    feeDistributor = await Ve69LPFeeDistributor.deploy(wSonic.address);
    
    // Deploy ChainRegistry on Sonic
    const ChainRegistry = await ethers.getContractFactory("ChainRegistry");
    chainRegistry = await ChainRegistry.deploy(SONIC_CHAIN_ID);
    
    // Deploy OmniDragon token
    const OmniDragon = await ethers.getContractFactory("OmniDragon");
    omniDragon = await OmniDragon.deploy(
      "Dragon Token",
      "DRAGON",
      DRAGON_SUPPLY,
      mockLzEndpoint.address,
      jackpotVault.address,
      feeDistributor.address,
      chainRegistry.address,
      multisig.address
    );
    
    // Register Sonic chain in the registry
    await chainRegistry.registerChain(
      SONIC_CHAIN_ID,
      "Sonic",
      wSonic.address,
      ethers.constants.AddressZero, // Will be updated after swap trigger deployment
      sonicVRFConsumer.address,
      omniDragon.address
    );
    
    // Register Base chain in the registry
    await chainRegistry.registerChain(
      BASE_CHAIN_ID,
      "Base",
      wEth.address,
      ethers.constants.AddressZero, // Will be updated after swap trigger deployment
      chainlinkVRFCoordinator.address,
      omniDragon.address
    );
    
    // Deploy Sonic-specific swap trigger
    const DragonSwapTriggerV2 = await ethers.getContractFactory("DragonSwapTriggerV2");
    sonicSwapTrigger = await DragonSwapTriggerV2.deploy(
      wSonic.address,
      omniDragon.address,
      sonicVRFConsumer.address,
      ethers.utils.parseEther("0.01"),
      "0x0000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      owner.address,
      0,
      "Sonic"
    );
    
    // Deploy Base-specific swap trigger (with mock parameters)
    const keyHash = "0x8472ba59cf7134dfe321f4d61a430c4857e8b19cdd5230b09952a92671c24409";
    const subscriptionId = 1;
    const callbackGasLimit = 500000;
    
    const BaseDragonSwapTrigger = await ethers.getContractFactory("BaseDragonSwapTrigger");
    baseSwapTrigger = await BaseDragonSwapTrigger.deploy(
      wEth.address,
      omniDragon.address,
      chainlinkVRFCoordinator.address,
      keyHash,
      subscriptionId,
      callbackGasLimit,
      MIN_SWAP_AMOUNT,
      chainRegistry.address
    );
    
    // Update the swap triggers in the registry
    await chainRegistry.updateChain(
      SONIC_CHAIN_ID,
      wSonic.address,
      sonicSwapTrigger.address,
      sonicVRFConsumer.address,
      omniDragon.address
    );
    
    await chainRegistry.updateChain(
      BASE_CHAIN_ID,
      wEth.address,
      baseSwapTrigger.address,
      chainlinkVRFCoordinator.address,
      omniDragon.address
    );
    
    // Setup initial token balances
    await wSonic.mint(user1.address, ethers.utils.parseEther("1000"));
    await wSonic.mint(user2.address, ethers.utils.parseEther("1000"));
    await wEth.mint(user1.address, ethers.utils.parseEther("1000"));
    await wEth.mint(user2.address, ethers.utils.parseEther("1000"));
    
    // Configure swap triggers with initial jackpot
    await wSonic.connect(user1).approve(sonicSwapTrigger.address, ethers.utils.parseEther("100"));
    await sonicSwapTrigger.connect(user1).addToJackpot(ethers.utils.parseEther("100"));
    
    await wEth.connect(user1).approve(baseSwapTrigger.address, ethers.utils.parseEther("100"));
    await baseSwapTrigger.connect(user1).addToJackpot(ethers.utils.parseEther("100"));
  });

  describe("Chain Registry Functionality", function () {
    it("Should correctly identify the current chain", async function () {
      const currentChainId = await chainRegistry.getCurrentChainId();
      expect(currentChainId).to.equal(SONIC_CHAIN_ID);
    });

    it("Should correctly return chain-specific native token wrappers", async function () {
      const sonicToken = await chainRegistry.getNativeTokenWrapper(SONIC_CHAIN_ID);
      const baseToken = await chainRegistry.getNativeTokenWrapper(BASE_CHAIN_ID);
      
      expect(sonicToken).to.equal(wSonic.address);
      expect(baseToken).to.equal(wEth.address);
    });
    
    it("Should correctly return chain-specific swap triggers", async function () {
      const sonicTrigger = await chainRegistry.getSwapTrigger(SONIC_CHAIN_ID);
      const baseTrigger = await chainRegistry.getSwapTrigger(BASE_CHAIN_ID);
      
      expect(sonicTrigger).to.equal(sonicSwapTrigger.address);
      expect(baseTrigger).to.equal(baseSwapTrigger.address);
    });
  });

  describe("OmniDragon Interactions", function () {
    it("Should use the correct native token based on chain", async function () {
      // OmniDragon is deployed on Sonic, so it should use wSonic
      const nativeToken = await omniDragon.nativeTokenWrapper();
      expect(nativeToken).to.equal(wSonic.address);
    });
    
    it("Should add to jackpot using the current chain's native token", async function () {
      // First, authorize transfer to OmniDragon
      await wSonic.connect(user1).approve(omniDragon.address, ethers.utils.parseEther("50"));
      
      // Add to jackpot via OmniDragon
      await expect(omniDragon.connect(multisig).addToJackpot(ethers.utils.parseEther("50")))
        .to.emit(omniDragon, "FeeTransferred")
        .withArgs(jackpotVault.address, ethers.utils.parseEther("50"), "Jackpot");
    });
  });

  describe("Chain-Specific Swap Triggers", function () {
    it("Should correctly identify the native token wrapper", async function () {
      const sonicNativeToken = await sonicSwapTrigger.getNativeTokenWrapper();
      const baseNativeToken = await baseSwapTrigger.getNativeTokenWrapper();
      
      expect(sonicNativeToken).to.equal(wSonic.address);
      expect(baseNativeToken).to.equal(wEth.address);
    });
    
    it("Should trigger lottery when swapping native token for DRAGON", async function () {
      // Setup: User approves wSonic tokens for swap trigger
      await wSonic.connect(user2).approve(sonicSwapTrigger.address, ethers.utils.parseEther("20"));
      
      // Simulate swap by directly calling the trigger
      await expect(sonicSwapTrigger.connect(user2).onSwapNativeTokenToDragon(user2.address, ethers.utils.parseEther("20")))
        .to.emit(sonicSwapTrigger, "SwapDetected")
        .withArgs(user2.address, ethers.utils.parseEther("20"));
    });
    
    it("Should not trigger lottery when amount is below minimum", async function () {
      // Setup: User approves just under the minimum amount
      await wSonic.connect(user2).approve(sonicSwapTrigger.address, ethers.utils.parseEther("9"));
      
      // Simulate swap with amount below minimum
      // This shouldn't emit any events
      await expect(sonicSwapTrigger.connect(user2).onSwapNativeTokenToDragon(user2.address, ethers.utils.parseEther("9")))
        .to.not.emit(sonicSwapTrigger, "SwapDetected");
    });
  });

  describe("VRF Integration", function () {
    it("Should request randomness from the appropriate VRF provider", async function () {
      // Setup: Prepare for randomness request
      await wSonic.connect(user2).approve(sonicSwapTrigger.address, ethers.utils.parseEther("20"));
      
      // Mock the VRF Consumer to track if requestRandomness was called
      await sonicVRFConsumer.mock.requestRandomness.returns(123);
      
      // Trigger a swap which should call the VRF consumer
      await sonicSwapTrigger.connect(user2).onSwapNativeTokenToDragon(user2.address, ethers.utils.parseEther("20"));
      
      // Verify the mock received the call
      expect(await sonicVRFConsumer.getRequestCount()).to.equal(1);
    });
    
    it("Should process VRF randomness and award jackpot on winning number", async function () {
      // Setup: Prepare user and randomness request
      await wSonic.connect(user2).approve(sonicSwapTrigger.address, ethers.utils.parseEther("20"));
      
      // Mock the VRF Consumer to track requests
      await sonicVRFConsumer.mock.requestRandomness.returns(999);
      
      // Trigger a swap which should call the VRF consumer
      await sonicSwapTrigger.connect(user2).onSwapNativeTokenToDragon(user2.address, ethers.utils.parseEther("20"));
      
      // Get initial jackpot balance
      const initialJackpot = await sonicSwapTrigger.jackpotBalance();
      
      // Simulate VRF returning a winning number (assuming winThreshold is 1000)
      // Using randomness % winThreshold == 0, so we pass 0 or 1000 or 2000 etc.
      await sonicSwapTrigger.connect(sonicVRFConsumer.address).fulfillRandomness(999, 2000);
      
      // Verify jackpot was won
      const finalJackpot = await sonicSwapTrigger.jackpotBalance();
      expect(finalJackpot).to.equal(0);
      
      // Verify stats updated
      expect(await sonicSwapTrigger.totalWinners()).to.equal(1);
      expect(await sonicSwapTrigger.lastWinner()).to.equal(user2.address);
    });
  });
}); 