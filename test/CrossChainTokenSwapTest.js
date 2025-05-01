const { expect } = require("chai");
const { ethers } = require("hardhat");
const { parseEther } = ethers.utils;

// Test for cross-chain native token swapping consistency
describe("Cross-Chain Native Token Swap Tests", function () {
  // Test variables
  let owner, user1, user2, treasury;
  let chainRegistry;
  let omniDragon;
  let wrappedSonic, wrappedArbitrum, wrappedOptimism;
  let sonicSwapTrigger, arbitrumSwapTrigger, optimismSwapTrigger;
  let sonicVRFConsumer, arbitrumVRFConsumer, optimismVRFConsumer;
  let jackpotVault, ve69LPFeeDistributor;
  
  // Chain IDs (using LayerZero chain IDs)
  const SONIC_CHAIN_ID = 146;
  const ARBITRUM_CHAIN_ID = 110;
  const OPTIMISM_CHAIN_ID = 111;
  
  // Test amounts
  const SWAP_AMOUNT = parseEther("100");
  const MIN_SWAP_AMOUNT = parseEther("10");
  
  // Deploy basic setup across three chains
  before(async function() {
    [owner, user1, user2, treasury] = await ethers.getSigners();
    
    // Mock endpoints for LayerZero
    const MockLayerZeroEndpoint = await ethers.getContractFactory("MockLzEndpoint");
    const sonicEndpoint = await MockLayerZeroEndpoint.deploy(SONIC_CHAIN_ID);
    const arbitrumEndpoint = await MockLayerZeroEndpoint.deploy(ARBITRUM_CHAIN_ID);
    const optimismEndpoint = await MockLayerZeroEndpoint.deploy(OPTIMISM_CHAIN_ID);
    
    // Deploy wrapped tokens for each chain
    const WrappedToken = await ethers.getContractFactory("MockWETH");
    wrappedSonic = await WrappedToken.deploy("Wrapped Sonic", "wS");
    wrappedArbitrum = await WrappedToken.deploy("Wrapped Arbitrum", "wARB");
    wrappedOptimism = await WrappedToken.deploy("Wrapped Optimism", "wOP");
    
    // Mint some wrapped tokens to user1 for testing
    await wrappedSonic.deposit({ value: parseEther("1000") });
    await wrappedArbitrum.deposit({ value: parseEther("1000") });
    await wrappedOptimism.deposit({ value: parseEther("1000") });
    
    await wrappedSonic.transfer(user1.address, parseEther("500"));
    await wrappedArbitrum.transfer(user1.address, parseEther("500"));
    await wrappedOptimism.transfer(user1.address, parseEther("500"));
    
    // Deploy Chain Registry
    const ChainRegistry = await ethers.getContractFactory("ChainRegistry");
    chainRegistry = await ChainRegistry.deploy(SONIC_CHAIN_ID);
    
    // Deploy fee recipients
    const MockJackpotVault = await ethers.getContractFactory("MockJackpotVault");
    jackpotVault = await MockJackpotVault.deploy();
    
    const MockVe69LPFeeDistributor = await ethers.getContractFactory("MockVe69LPFeeDistributor");
    ve69LPFeeDistributor = await MockVe69LPFeeDistributor.deploy();
    
    // Deploy VRF consumers for each chain
    const MockVRFConsumer = await ethers.getContractFactory("MockVRFConsumer");
    sonicVRFConsumer = await MockVRFConsumer.deploy();
    arbitrumVRFConsumer = await MockVRFConsumer.deploy();
    optimismVRFConsumer = await MockVRFConsumer.deploy();
    
    // Deploy OmniDragon for cross-chain setup
    const OmniDragon = await ethers.getContractFactory("OmniDragon");
    omniDragon = await OmniDragon.deploy(
      "Dragon", 
      "DRAGON",
      parseEther("1000000"), // 1 million initial supply
      sonicEndpoint.address,
      jackpotVault.address,
      ve69LPFeeDistributor.address,
      chainRegistry.address,
      treasury.address
    );
    
    // Prepare swap triggers for each chain
    // Sonic
    const SonicSwapTrigger = await ethers.getContractFactory("DragonSwapTriggerV2");
    sonicSwapTrigger = await SonicSwapTrigger.deploy(
      wrappedSonic.address,
      omniDragon.address,
      sonicVRFConsumer.address,
      MIN_SWAP_AMOUNT,
      ethers.constants.AddressZero, // No Chainlink feed for test
      ethers.constants.AddressZero, // No Pyth Oracle for test
      ethers.constants.HashZero,    // No Pyth Price ID for test
      owner.address,
      1, // PayoutMethod.UNWRAP_TO_NATIVE
      "Sonic"
    );
    
    // Arbitrum
    const ArbitrumSwapTrigger = await ethers.getContractFactory("DragonSwapTriggerV2");
    arbitrumSwapTrigger = await ArbitrumSwapTrigger.deploy(
      wrappedArbitrum.address,
      omniDragon.address,
      arbitrumVRFConsumer.address,
      MIN_SWAP_AMOUNT,
      ethers.constants.AddressZero, // No Chainlink feed for test
      ethers.constants.AddressZero, // No Pyth Oracle for test
      ethers.constants.HashZero,    // No Pyth Price ID for test
      owner.address,
      1, // PayoutMethod.UNWRAP_TO_NATIVE
      "Arbitrum"
    );
    
    // Optimism
    const OptimismSwapTrigger = await ethers.getContractFactory("DragonSwapTriggerV2");
    optimismSwapTrigger = await OptimismSwapTrigger.deploy(
      wrappedOptimism.address,
      omniDragon.address,
      optimismVRFConsumer.address,
      MIN_SWAP_AMOUNT,
      ethers.constants.AddressZero, // No Chainlink feed for test
      ethers.constants.AddressZero, // No Pyth Oracle for test
      ethers.constants.HashZero,    // No Pyth Price ID for test
      owner.address,
      1, // PayoutMethod.UNWRAP_TO_NATIVE
      "Optimism"
    );
    
    // Set up VRF permissions
    await sonicSwapTrigger.grantRole(await sonicSwapTrigger.VRF_ROLE(), sonicVRFConsumer.address);
    await arbitrumSwapTrigger.grantRole(await arbitrumSwapTrigger.VRF_ROLE(), arbitrumVRFConsumer.address);
    await optimismSwapTrigger.grantRole(await optimismSwapTrigger.VRF_ROLE(), optimismVRFConsumer.address);
    
    // Register chains in the registry
    await chainRegistry.registerChain(
      SONIC_CHAIN_ID, 
      "Sonic", 
      wrappedSonic.address, 
      sonicSwapTrigger.address, 
      sonicVRFConsumer.address,
      omniDragon.address
    );
    
    await chainRegistry.registerChain(
      ARBITRUM_CHAIN_ID, 
      "Arbitrum", 
      wrappedArbitrum.address, 
      arbitrumSwapTrigger.address, 
      arbitrumVRFConsumer.address,
      omniDragon.address
    );
    
    await chainRegistry.registerChain(
      OPTIMISM_CHAIN_ID, 
      "Optimism", 
      wrappedOptimism.address, 
      optimismSwapTrigger.address, 
      optimismVRFConsumer.address,
      omniDragon.address
    );
    
    // Add to jackpots
    await wrappedSonic.connect(owner).approve(sonicSwapTrigger.address, parseEther("10000"));
    await wrappedArbitrum.connect(owner).approve(arbitrumSwapTrigger.address, parseEther("10000"));
    await wrappedOptimism.connect(owner).approve(optimismSwapTrigger.address, parseEther("10000"));
    
    await sonicSwapTrigger.addToJackpot(parseEther("1000"));
    await arbitrumSwapTrigger.addToJackpot(parseEther("1000"));
    await optimismSwapTrigger.addToJackpot(parseEther("1000"));
    
    // Link cross-chain endpoints
    await sonicEndpoint.setDestLzEndpoint(arbitrumEndpoint.address, ARBITRUM_CHAIN_ID);
    await sonicEndpoint.setDestLzEndpoint(optimismEndpoint.address, OPTIMISM_CHAIN_ID);
    await arbitrumEndpoint.setDestLzEndpoint(sonicEndpoint.address, SONIC_CHAIN_ID);
    await arbitrumEndpoint.setDestLzEndpoint(optimismEndpoint.address, OPTIMISM_CHAIN_ID);
    await optimismEndpoint.setDestLzEndpoint(sonicEndpoint.address, SONIC_CHAIN_ID);
    await optimismEndpoint.setDestLzEndpoint(arbitrumEndpoint.address, ARBITRUM_CHAIN_ID);
    
    // Setup cross-chain trust
    await omniDragon.setTrustedRemote(SONIC_CHAIN_ID, omniDragon.address);
    await omniDragon.setTrustedRemote(ARBITRUM_CHAIN_ID, omniDragon.address);
    await omniDragon.setTrustedRemote(OPTIMISM_CHAIN_ID, omniDragon.address);
    
    // Approve tokens for swap
    await wrappedSonic.connect(user1).approve(sonicSwapTrigger.address, parseEther("1000"));
    await wrappedArbitrum.connect(user1).approve(arbitrumSwapTrigger.address, parseEther("1000"));
    await wrappedOptimism.connect(user1).approve(optimismSwapTrigger.address, parseEther("1000"));
  });
  
  describe("Setup Validation", function() {
    it("Should have correct chain configurations", async function() {
      const sonicConfig = await chainRegistry.getChainConfig(SONIC_CHAIN_ID);
      const arbitrumConfig = await chainRegistry.getChainConfig(ARBITRUM_CHAIN_ID);
      const optimismConfig = await chainRegistry.getChainConfig(OPTIMISM_CHAIN_ID);
      
      expect(sonicConfig.nativeTokenWrapper).to.equal(wrappedSonic.address);
      expect(arbitrumConfig.nativeTokenWrapper).to.equal(wrappedArbitrum.address);
      expect(optimismConfig.nativeTokenWrapper).to.equal(wrappedOptimism.address);
      
      expect(sonicConfig.swapTrigger).to.equal(sonicSwapTrigger.address);
      expect(arbitrumConfig.swapTrigger).to.equal(arbitrumSwapTrigger.address);
      expect(optimismConfig.swapTrigger).to.equal(optimismSwapTrigger.address);
    });
    
    it("Should have correct jackpot balances", async function() {
      expect(await sonicSwapTrigger.getJackpotBalance()).to.equal(parseEther("1000"));
      expect(await arbitrumSwapTrigger.getJackpotBalance()).to.equal(parseEther("1000"));
      expect(await optimismSwapTrigger.getJackpotBalance()).to.equal(parseEther("1000"));
    });
  });
  
  describe("Native Token Swap Tests", function() {
    it("Should handle native token swaps on Sonic chain", async function() {
      // Get initial balances
      const initialJackpotBalance = await sonicSwapTrigger.getJackpotBalance();
      
      // Perform a swap using wrapped token
      const tx = await sonicSwapTrigger.connect(user1).onSwapNativeTokenToDragon(user1.address, SWAP_AMOUNT);
      const receipt = await tx.wait();
      
      // Check events
      const swapEvent = receipt.events.find(e => e.event === "SwapDetected");
      const randomnessRequestedEvent = receipt.events.find(e => e.event === "RandomnessRequested");
      
      expect(swapEvent).to.not.be.undefined;
      expect(swapEvent.args.user).to.equal(user1.address);
      expect(swapEvent.args.amount).to.equal(SWAP_AMOUNT);
      
      expect(randomnessRequestedEvent).to.not.be.undefined;
      
      // Get request ID and user
      const requestId = randomnessRequestedEvent.args.requestId;
      const user = randomnessRequestedEvent.args.user;
      
      expect(user).to.equal(user1.address);
      
      // Mock VRF response (but not winning)
      await sonicVRFConsumer.mockResponseNotWinning(
        sonicSwapTrigger.address,
        requestId,
        user,
        1234567890 // Random number that won't win
      );
      
      // Check if jackpot is still the same (since we mocked a non-winning response)
      expect(await sonicSwapTrigger.getJackpotBalance()).to.equal(initialJackpotBalance);
    });
    
    it("Should handle native token swaps on Arbitrum chain", async function() {
      // Get initial balances
      const initialJackpotBalance = await arbitrumSwapTrigger.getJackpotBalance();
      
      // Perform a swap using wrapped token
      const tx = await arbitrumSwapTrigger.connect(user1).onSwapNativeTokenToDragon(user1.address, SWAP_AMOUNT);
      const receipt = await tx.wait();
      
      // Check events
      const swapEvent = receipt.events.find(e => e.event === "SwapDetected");
      const randomnessRequestedEvent = receipt.events.find(e => e.event === "RandomnessRequested");
      
      expect(swapEvent).to.not.be.undefined;
      expect(swapEvent.args.user).to.equal(user1.address);
      expect(swapEvent.args.amount).to.equal(SWAP_AMOUNT);
      
      expect(randomnessRequestedEvent).to.not.be.undefined;
      
      // Get request ID and user
      const requestId = randomnessRequestedEvent.args.requestId;
      const user = randomnessRequestedEvent.args.user;
      
      expect(user).to.equal(user1.address);
      
      // Mock VRF response (but not winning)
      await arbitrumVRFConsumer.mockResponseNotWinning(
        arbitrumSwapTrigger.address,
        requestId,
        user,
        1234567890 // Random number that won't win
      );
      
      // Check if jackpot is still the same (since we mocked a non-winning response)
      expect(await arbitrumSwapTrigger.getJackpotBalance()).to.equal(initialJackpotBalance);
    });
    
    it("Should handle native token swaps on Optimism chain", async function() {
      // Get initial balances
      const initialJackpotBalance = await optimismSwapTrigger.getJackpotBalance();
      
      // Perform a swap using wrapped token
      const tx = await optimismSwapTrigger.connect(user1).onSwapNativeTokenToDragon(user1.address, SWAP_AMOUNT);
      const receipt = await tx.wait();
      
      // Check events
      const swapEvent = receipt.events.find(e => e.event === "SwapDetected");
      const randomnessRequestedEvent = receipt.events.find(e => e.event === "RandomnessRequested");
      
      expect(swapEvent).to.not.be.undefined;
      expect(swapEvent.args.user).to.equal(user1.address);
      expect(swapEvent.args.amount).to.equal(SWAP_AMOUNT);
      
      expect(randomnessRequestedEvent).to.not.be.undefined;
      
      // Get request ID and user
      const requestId = randomnessRequestedEvent.args.requestId;
      const user = randomnessRequestedEvent.args.user;
      
      expect(user).to.equal(user1.address);
      
      // Mock VRF response (but not winning)
      await optimismVRFConsumer.mockResponseNotWinning(
        optimismSwapTrigger.address,
        requestId,
        user,
        1234567890 // Random number that won't win
      );
      
      // Check if jackpot is still the same (since we mocked a non-winning response)
      expect(await optimismSwapTrigger.getJackpotBalance()).to.equal(initialJackpotBalance);
    });
    
    it("Should simulate a winning native token swap", async function() {
      // Get initial balances
      const initialJackpotBalance = await sonicSwapTrigger.getJackpotBalance();
      const initialUserBalance = await wrappedSonic.balanceOf(user2.address);
      
      // Give some tokens to user2
      await wrappedSonic.transfer(user2.address, parseEther("200"));
      await wrappedSonic.connect(user2).approve(sonicSwapTrigger.address, parseEther("200"));
      
      // Perform a swap using wrapped token
      const tx = await sonicSwapTrigger.connect(user2).onSwapNativeTokenToDragon(user2.address, SWAP_AMOUNT);
      const receipt = await tx.wait();
      
      // Get request ID and user
      const randomnessRequestedEvent = receipt.events.find(e => e.event === "RandomnessRequested");
      const requestId = randomnessRequestedEvent.args.requestId;
      const user = randomnessRequestedEvent.args.user;
      
      expect(user).to.equal(user2.address);
      
      // Mock a winning VRF response
      await sonicVRFConsumer.mockResponseWinning(
        sonicSwapTrigger.address,
        requestId,
        user
      );
      
      // Check that user2 won the jackpot
      const finalUserBalance = await wrappedSonic.balanceOf(user2.address);
      expect(finalUserBalance.sub(initialUserBalance)).to.equal(initialJackpotBalance);
      
      // Check that the jackpot is now empty
      expect(await sonicSwapTrigger.getJackpotBalance()).to.equal(0);
      
      // Check stats
      const stats = await sonicSwapTrigger.getStats();
      expect(stats.winners).to.equal(1);
      expect(stats.paidOut).to.equal(initialJackpotBalance);
      expect(stats.current).to.equal(0);
    });
  });
  
  describe("Direct Native Token Swap", function() {
    it("Should handle direct native token swaps", async function() {
      // Refill the jackpot
      await wrappedSonic.connect(owner).approve(sonicSwapTrigger.address, parseEther("1000"));
      await sonicSwapTrigger.addToJackpot(parseEther("1000"));
      
      // Get initial balances
      const initialJackpotBalance = await sonicSwapTrigger.getJackpotBalance();
      
      // Perform a direct swap with native tokens
      const tx = await sonicSwapTrigger.connect(user1).swapNativeForDragon({
        value: SWAP_AMOUNT
      });
      
      const receipt = await tx.wait();
      
      // Check events
      const swapEvent = receipt.events.find(e => e.event === "SwapDetected");
      const randomnessRequestedEvent = receipt.events.find(e => e.event === "RandomnessRequested");
      
      expect(swapEvent).to.not.be.undefined;
      expect(swapEvent.args.user).to.equal(user1.address);
      expect(swapEvent.args.amount).to.equal(SWAP_AMOUNT);
      
      expect(randomnessRequestedEvent).to.not.be.undefined;
      
      // Get request ID and user
      const requestId = randomnessRequestedEvent.args.requestId;
      const user = randomnessRequestedEvent.args.user;
      
      expect(user).to.equal(user1.address);
      
      // Mock VRF response (but not winning)
      await sonicVRFConsumer.mockResponseNotWinning(
        sonicSwapTrigger.address,
        requestId,
        user,
        1234567890 // Random number that won't win
      );
      
      // Jackpot should remain unchanged
      expect(await sonicSwapTrigger.getJackpotBalance()).to.equal(initialJackpotBalance);
    });
  });
  
  describe("Fee Logic Consistency", function() {
    it("Should apply fees consistently across chains", async function() {
      // Since we can't easily simulate DEX swaps in the test environment,
      // we'll directly test the fee application on a standard transfer
      
      // Get initial balances
      const initialJackpotBalance = await jackpotVault.getBalance();
      const initialVe69Balance = await ve69LPFeeDistributor.getBalance();
      
      // Perform a token transfer that should apply fees
      await omniDragon.transfer(user2.address, parseEther("10000"));
      
      // Check fee distributions
      const finalJackpotBalance = await jackpotVault.getBalance();
      const finalVe69Balance = await ve69LPFeeDistributor.getBalance();
      
      // Fees are defined as:
      // 10% total fee - 6.9% to jackpot, 2.41% to ve69LPfeedistributor, 0.69% burn
      expect(finalJackpotBalance).to.be.gt(initialJackpotBalance);
      expect(finalVe69Balance).to.be.gt(initialVe69Balance);
      
      // Calculate expected fee amounts
      const transferAmount = parseEther("10000");
      const expectedJackpotFee = transferAmount.mul(690).div(10000); // 6.9%
      const expectedVe69Fee = transferAmount.mul(241).div(10000); // 2.41%
      
      // Check against actual fees (allowing for small rounding errors)
      const jackpotFeeReceived = finalJackpotBalance.sub(initialJackpotBalance);
      const ve69FeeReceived = finalVe69Balance.sub(initialVe69Balance);
      
      // Within 0.1% tolerance
      expect(jackpotFeeReceived).to.be.closeTo(expectedJackpotFee, expectedJackpotFee.div(1000));
      expect(ve69FeeReceived).to.be.closeTo(expectedVe69Fee, expectedVe69Fee.div(1000));
    });
  });
}); 