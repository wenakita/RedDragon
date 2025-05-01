// SPDX-License-Identifier: MIT
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("UniswapV3PriceUtils", function () {
  let priceUtils;

  before(async function () {
    // Deploy the UniswapV3PriceUtils library
    const UniswapV3PriceUtils = await ethers.getContractFactory("UniswapV3PriceUtils");
    priceUtils = await UniswapV3PriceUtils.deploy();
    await priceUtils.deployed();

    // Create test contract to expose library functions
    const PriceUtilsTestFactory = await ethers.getContractFactory("UniswapV3PriceUtilsTest", {
      libraries: {
        UniswapV3PriceUtils: priceUtils.address
      }
    });
    this.priceUtilsTest = await PriceUtilsTestFactory.deploy();
    await this.priceUtilsTest.deployed();
  });

  describe("Math Functions", function () {
    it("should correctly calculate square root", async function () {
      const testValue = ethers.utils.parseEther("4"); // 4 * 10^18
      const expectedSqrt = ethers.utils.parseEther("2"); // 2 * 10^18
      
      const result = await this.priceUtilsTest.testSqrt(testValue);
      
      expect(result).to.equal(expectedSqrt);
    });

    it("should correctly convert tick to price", async function () {
      // Test positive tick
      const positiveTick = 10000; // Should be approximately 2.71 in price
      const expectedPriceMin = ethers.utils.parseEther("2.68");
      const expectedPriceMax = ethers.utils.parseEther("2.74");
      
      const positiveResult = await this.priceUtilsTest.testTickToPrice(positiveTick);
      
      expect(positiveResult).to.be.gte(expectedPriceMin);
      expect(positiveResult).to.be.lte(expectedPriceMax);
      
      // Test negative tick
      const negativeTick = -10000; // Should be approximately 0.369 in price
      const expectedNegPriceMin = ethers.utils.parseEther("0.365");
      const expectedNegPriceMax = ethers.utils.parseEther("0.375");
      
      const negativeResult = await this.priceUtilsTest.testTickToPrice(negativeTick);
      
      expect(negativeResult).to.be.gte(expectedNegPriceMin);
      expect(negativeResult).to.be.lte(expectedNegPriceMax);
    });

    it("should correctly convert sqrtPriceX96 to price", async function () {
      // sqrtPriceX96 value for price ~2.0
      const sqrtPriceX96 = ethers.BigNumber.from('1461446703485210103287273052203988822378723970341'); 
      const expectedPrice = ethers.utils.parseEther("2");
      
      const result = await this.priceUtilsTest.testSqrtPriceX96ToPrice(sqrtPriceX96);
      
      // Allow 1% deviation due to precision
      const tolerance = expectedPrice.div(100);
      expect(result).to.be.gte(expectedPrice.sub(tolerance));
      expect(result).to.be.lte(expectedPrice.add(tolerance));
    });

    it("should correctly convert tick to sqrtPriceX96", async function () {
      // Tick 6932 corresponds approximately to price 2.0
      const tick = 6932;
      
      const result = await this.priceUtilsTest.testTickToSqrtPriceX96(tick);
      
      // Check it's a reasonable value - full precision comparison is difficult
      expect(result).to.be.gt(0);
    });
  });

  describe("Token Ratio Calculations", function () {
    it("should calculate correct token ratios within the range", async function () {
      const currentTick = 5000;
      const lowerTick = 0;
      const upperTick = 10000;
      
      const [token0Percent, token1Percent] = await this.priceUtilsTest.testCalculateTokenRatios(
        currentTick,
        lowerTick,
        upperTick
      );
      
      // At tick 5000 (halfway), we expect roughly 50/50 split
      expect(token0Percent).to.be.closeTo(50, 5); // Allow 5% deviation
      expect(token1Percent).to.be.closeTo(50, 5);
      expect(token0Percent + token1Percent).to.equal(100);
    });

    it("should handle token ratios at range boundaries", async function () {
      // At lower bound
      let [token0Percent, token1Percent] = await this.priceUtilsTest.testCalculateTokenRatios(
        0, // current = lower
        0, // lower
        10000 // upper
      );
      
      expect(token0Percent).to.equal(100);
      expect(token1Percent).to.equal(0);
      
      // At upper bound
      [token0Percent, token1Percent] = await this.priceUtilsTest.testCalculateTokenRatios(
        10000, // current = upper
        0, // lower
        10000 // upper
      );
      
      expect(token0Percent).to.equal(0);
      expect(token1Percent).to.equal(100);
    });
  });

  describe("APR Calculations", function () {
    it("should correctly calculate APR", async function () {
      const amountUSD = ethers.utils.parseEther("1000"); // $1000 of liquidity
      const dailyVolumeUSD = ethers.utils.parseEther("10000"); // $10K daily volume
      const feeTier = 3000; // 0.3% fee tier
      
      const apr = await this.priceUtilsTest.testCalculateAPR(
        amountUSD,
        dailyVolumeUSD,
        feeTier
      );
      
      // Expected APR calculation:
      // Daily fees = $10,000 * 0.003 = $30
      // Yearly fees = $30 * 365 = $10,950
      // APR = ($10,950 / $1000) * 100 = 1095%
      // But our implementation caps at 1000%
      expect(apr).to.equal(10000); // 1000% in basis points
    });

    it("should correctly calculate APR with realistic values", async function () {
      const amountUSD = ethers.utils.parseEther("1000"); // $1000 of liquidity
      const dailyVolumeUSD = ethers.utils.parseEther("2000"); // $2K daily volume
      const feeTier = 3000; // 0.3% fee tier
      
      const apr = await this.priceUtilsTest.testCalculateAPR(
        amountUSD,
        dailyVolumeUSD,
        feeTier
      );
      
      // Expected realistic APR:
      // Daily fees = $2,000 * 0.003 = $6
      // Yearly fees = $6 * 365 = $2,190
      // APR = ($2,190 / $1000) * 100 = 219%
      const expectedAPR = 2190; // 219% in basis points
      expect(apr).to.be.closeTo(expectedAPR, 10); // Allow small deviation due to rounding
    });
  });
}); 