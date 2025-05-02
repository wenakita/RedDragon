// SPDX-License-Identifier: MIT
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { smock } = require('@defi-wonderland/smock');

describe("DragonPartnerRouter Tick-Based Price Discovery", function () {
  let router;
  let partnerRegistry;
  let mockPool;
  let quoter;
  let jackpot;
  let ve69LP;
  let booster;
  let redDragonToken;
  let partnerToken;
  let wrappedSonicToken;
  let owner;
  let user;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Create mock tokens
    const Token = await ethers.getContractFactory('MockERC20');
    redDragonToken = await Token.deploy('Red Dragon', 'RDGS', 18);
    partnerToken = await Token.deploy('Partner Token', 'PTN', 18);
    wrappedSonicToken = await Token.deploy('Wrapped Sonic', 'wS', 18);
    
    // Create mock UniswapV3 pool that returns predictable ticks
    const MockPoolFactory = await smock.mock('MockShadowUniswapV3Pool');
    mockPool = await MockPoolFactory.deploy();
    
    // Configure the mock pool
    await mockPool.mock.token0.returns(partnerToken.address);
    await mockPool.mock.token1.returns(wrappedSonicToken.address);
    await mockPool.mock.fee.returns(3000); // 0.3%
    
    // Default slot0 values - we'll adjust tick for testing
    await mockPool.mock.slot0.returns(
      ethers.BigNumber.from('1461446703485210103287273052203988822378723970341'), // sqrtPriceX96 for price ~2.0
      100, // tick
      1, // observationIndex
      1, // observationCardinality
      1, // observationCardinalityNext
      0, // feeProtocol
      true // unlocked
    );
    
    // Create mock ticks function
    await mockPool.mock.ticks.returns(
      ethers.utils.parseUnits('1000', 0), // liquidityGross
      ethers.utils.parseUnits('1000', 0), // liquidityNet
      0, // feeGrowthOutside0X128
      0, // feeGrowthOutside1X128
      0, // tickCumulativeOutside
      0, // secondsPerLiquidityOutsideX128
      0, // secondsOutside
      true // initialized
    );
    
    // Create mock quoter
    const MockQuoterFactory = await smock.mock('MockShadowQuoter');
    quoter = await MockQuoterFactory.deploy();
    
    // Create mock components
    const mockJackpot = await smock.fake('IJackpot');
    jackpot = mockJackpot.address;
    
    const mockVe69LP = await smock.fake('Ive69LPBoost');
    ve69LP = mockVe69LP.address;
    booster = mockVe69LP.address;
    
    // Deploy partner registry
    const DragonPartnerRegistry = await ethers.getContractFactory("DragonPartnerRegistry");
    partnerRegistry = await DragonPartnerRegistry.deploy();
    
    // Deploy the UniswapV3PriceUtils library
    const UniswapV3PriceUtils = await ethers.getContractFactory("UniswapV3PriceUtils");
    const priceUtils = await UniswapV3PriceUtils.deploy();
    
    // Deploy router with library linking
    const DragonPartnerRouter = await ethers.getContractFactory("DragonPartnerRouter", {
      libraries: {
        UniswapV3PriceUtils: priceUtils.address
      }
    });
    
    // Deploy the router
    router = await DragonPartnerRouter.deploy(
      partnerRegistry.address,
      mockPool.address, // We're using the pool as a mock router too for simplicity
      quoter.address,
      jackpot,
      ve69LP,
      booster,
      redDragonToken.address,
      partnerToken.address,
      wrappedSonicToken.address
    );
    
    // Set pools for tick-based pricing
    await router.setV3Pools(mockPool.address, mockPool.address);
    
    // Set price method to TICK_BASED
    await router.setPriceMethod(3); // TICK_BASED = 3
    
    // Mint tokens to users for testing
    await partnerToken.mint(user.address, ethers.utils.parseEther("1000"));
    await partnerToken.connect(user).approve(router.address, ethers.utils.parseEther("1000"));
  });

  it("should calculate wrapped Sonic equivalent using tick-based pricing", async function () {
    // Test with a tick of 100, which should give a price of approximately 1.01 (1.0001^100)
    await mockPool.mock.slot0.returns(
      ethers.BigNumber.from('1461446703485210103287273052203988822378723970341'), // sqrtPriceX96
      100, // tick
      1, // observationIndex
      1, // observationCardinality
      1, // observationCardinalityNext
      0, // feeProtocol
      true // unlocked
    );
    
    const partnerAmount = ethers.utils.parseEther('10');
    const wrappedSonicEquivalent = await router.calculateWrappedSonicEquivalent(partnerAmount);
    
    // With tick 100, price should be approximately 1.01, so 10 PTN ≈ 10.1 wS
    // Allow some deviation due to calculation precision
    const expectedMin = ethers.utils.parseEther('10.05');
    const expectedMax = ethers.utils.parseEther('10.15');
    
    expect(wrappedSonicEquivalent).to.be.gte(expectedMin);
    expect(wrappedSonicEquivalent).to.be.lte(expectedMax);
  });

  it("should handle negative ticks correctly", async function () {
    // Test with a tick of -100, which should give a price of approximately 0.99 (1/1.0001^100)
    await mockPool.mock.slot0.returns(
      ethers.BigNumber.from('1461446703485210103287273052203988822378723970341'), // sqrtPriceX96
      -100, // tick
      1, // observationIndex
      1, // observationCardinality
      1, // observationCardinalityNext
      0, // feeProtocol
      true // unlocked
    );
    
    const partnerAmount = ethers.utils.parseEther('10');
    const wrappedSonicEquivalent = await router.calculateWrappedSonicEquivalent(partnerAmount);
    
    // With tick -100, price should be approximately 0.99, so 10 PTN ≈ 9.9 wS
    // Allow some deviation due to calculation precision
    const expectedMin = ethers.utils.parseEther('9.85');
    const expectedMax = ethers.utils.parseEther('9.95');
    
    expect(wrappedSonicEquivalent).to.be.gte(expectedMin);
    expect(wrappedSonicEquivalent).to.be.lte(expectedMax);
  });

  it("should correctly calculate token ratios based on position in the range", async function () {
    // We'll test the ratio calculation with a specific range
    const currentTick = 100;
    const lowerTick = 0;
    const upperTick = 200;
    
    const [token0Percent, token1Percent] = await router.calculateTokenRatios(
      currentTick,
      lowerTick,
      upperTick
    );
    
    // With current tick in the middle of the range (100/200), we expect roughly 50/50 split
    // Might not be exactly 50% due to non-linear relationship between tick and price
    expect(token0Percent).to.be.closeTo(50, 5); // Allow 5% deviation
    expect(token1Percent).to.be.closeTo(50, 5);
    expect(token0Percent + token1Percent).to.equal(100); // Must sum to 100%
  });

  it("should correctly handle token ratios at range boundaries", async function () {
    // Test at lower boundary
    let [token0Percent, token1Percent] = await router.calculateTokenRatios(
      0, // current = lower
      0, // lower
      200 // upper
    );
    
    // At lower bound, should be 100% token0
    expect(token0Percent).to.equal(100);
    expect(token1Percent).to.equal(0);
    
    // Test at upper boundary
    [token0Percent, token1Percent] = await router.calculateTokenRatios(
      200, // current = upper
      0, // lower
      200 // upper
    );
    
    // At upper bound, should be 100% token1
    expect(token0Percent).to.equal(0);
    expect(token1Percent).to.equal(100);
  });

  it("should correctly read pool data", async function () {
    const currentTick = 150;
    
    // Update mock pool data
    await mockPool.mock.slot0.returns(
      ethers.BigNumber.from('1461446703485210103287273052203988822378723970341'), // sqrtPriceX96
      currentTick, // tick
      1, // observationIndex
      1, // observationCardinality
      1, // observationCardinalityNext
      0, // feeProtocol
      true // unlocked
    );
    
    const poolData = await router.getPartnerToWrappedSonicPoolData();
    
    expect(poolData.currentTick).to.equal(currentTick);
    expect(poolData.token0).to.equal(partnerToken.address);
    expect(poolData.token1).to.equal(wrappedSonicToken.address);
    // sqrtPriceX96 and liquidity are harder to verify exactly, but should be non-zero
    expect(poolData.sqrtPriceX96).to.not.equal(0);
  });

  it("should calculate wrapped Sonic equivalent using sqrtPriceX96-based pricing", async function () {
    // Set up a specific sqrtPriceX96 value for testing
    // This value corresponds to a price of approximately 2.0
    const sqrtPriceX96 = ethers.BigNumber.from('1461446703485210103287273052203988822378723970341');
    
    await mockPool.mock.slot0.returns(
      sqrtPriceX96, // sqrtPriceX96
      0, // tick (not used in this test)
      1, // observationIndex
      1, // observationCardinality
      1, // observationCardinalityNext
      0, // feeProtocol
      true // unlocked
    );
    
    const partnerAmount = ethers.utils.parseEther('10');
    const wrappedSonicEquivalent = await router.calculateWrappedSonicEquivalentFromSqrtPrice(partnerAmount);
    
    // With price 2.0, 10 PTN should equal 20 wS (since PTN is token0)
    // Allow some deviation due to calculation precision
    const expectedMin = ethers.utils.parseEther('19');
    const expectedMax = ethers.utils.parseEther('21');
    
    expect(wrappedSonicEquivalent).to.be.gte(expectedMin);
    expect(wrappedSonicEquivalent).to.be.lte(expectedMax);
  });

  it("should correctly calculate token prices from ticks", async function () {
    const amount = ethers.utils.parseEther('10');
    const decimals = 18;
    const currentTick = 6900; // Price ~1.97
    const lowerTick = 0;     // Price 1.0
    const upperTick = 10000;  // Price ~2.71
    
    const [lowerPrice, upperPrice, currentPrice] = await router.calculateTokenPrices(
      amount,
      decimals,
      currentTick,
      lowerTick,
      upperTick
    );
    
    // Verify each price is in the expected range
    // Lower price should be around 1.0 * 10^18
    expect(lowerPrice).to.be.closeTo(ethers.utils.parseEther('1'), ethers.utils.parseEther('0.1'));
    
    // Upper price should be around 2.71 * 10^18
    expect(upperPrice).to.be.closeTo(ethers.utils.parseEther('2.71'), ethers.utils.parseEther('0.3'));
    
    // Current price should be around 1.97 * 10^18
    expect(currentPrice).to.be.closeTo(ethers.utils.parseEther('1.97'), ethers.utils.parseEther('0.2'));
  });

  it("should correctly calculate APR based on volume and fee tier", async function () {
    const amountUSD = ethers.utils.parseEther('1000'); // $1000 of liquidity
    const dailyVolumeUSD = ethers.utils.parseEther('10000'); // $10K daily volume
    const feeTier = 3000; // 0.3% fee tier
    
    const apr = await router.calculateAPR(amountUSD, dailyVolumeUSD, feeTier);
    
    // Expected APR calculation:
    // Daily fees = $10,000 * 0.003 = $30
    // Yearly fees = $30 * 365 = $10,950
    // APR = ($10,950 / $1000) * 100 = 1095%
    // But our implementation caps at 1000%
    expect(apr).to.equal(10000); // 1000% in basis points
    
    // Test with a more realistic volume
    const realisticVolume = ethers.utils.parseEther('2000'); // $2K daily volume
    const realisticAPR = await router.calculateAPR(amountUSD, realisticVolume, feeTier);
    
    // Expected realistic APR:
    // Daily fees = $2,000 * 0.003 = $6
    // Yearly fees = $6 * 365 = $2,190
    // APR = ($2,190 / $1000) * 100 = 219%
    const expectedAPR = 2190; // 219% in basis points
    expect(realisticAPR).to.be.closeTo(expectedAPR, 10); // Allow small deviation due to rounding
  });
}); 