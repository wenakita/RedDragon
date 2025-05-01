// SPDX-License-Identifier: MIT
const { ethers } = require("hardhat");

// Constants
const TICK_BASE = 1.0001;
const MIN_TICK = -887272;
const MAX_TICK = 887272;

// Convert tick to price
const tickToPrice = (tick) => {
  return Math.pow(TICK_BASE, tick);
};

// Calculate token ratios based on ticks
const calculateTokenRatios = (currentTick, lowerTick, upperTick) => {
  if (currentTick <= lowerTick) {
    return { token0Percent: 100, token1Percent: 0 };
  } else if (currentTick >= upperTick) {
    return { token0Percent: 0, token1Percent: 100 };
  } else {
    const currentPrice = tickToPrice(currentTick);
    const lowerPrice = tickToPrice(lowerTick);
    const upperPrice = tickToPrice(upperTick);
    const position = (currentPrice - lowerPrice) / (upperPrice - lowerPrice);
    const token1Percent = Math.round(position * 100);
    const token0Percent = 100 - token1Percent;
    return { token0Percent, token1Percent };
  }
};

// Calculate APR
const calculateAPR = (amountUSD, dailyVolumeUSD, feeTier) => {
  if (amountUSD === 0) return 0;
  
  const feePercent = feeTier / 1000000; // Convert basis points to percentage (3000 -> 0.003)
  const dailyFees = dailyVolumeUSD * feePercent;
  const yearlyFees = dailyFees * 365;
  const apr = (yearlyFees / amountUSD) * 100;
  
  return Math.min(Math.max(apr, 0), 1000); // Cap APR between 0% and 1000%
};

// Convert sqrtPriceX96 to price
const sqrtPriceX96ToPrice = (sqrtPriceX96) => {
  // Convert BigNumber to string, then to number
  const sqrtPrice = Number(ethers.utils.formatUnits(sqrtPriceX96, 0));
  // Calculate price = (sqrtPrice / 2^96)^2
  const price = Math.pow(sqrtPrice / Math.pow(2, 96), 2);
  return price;
};

// Test the math functions to validate our implementations
async function testMath() {
  console.log("Testing UniswapV3 Math Functions:");
  
  // Test tickToPrice
  const testTicks = [0, 100, 1000, 10000, -100, -1000, -10000];
  console.log("\nTick to Price Conversion:");
  for (const tick of testTicks) {
    console.log(`Tick ${tick} -> Price ${tickToPrice(tick).toFixed(6)}`);
  }
  
  // Test token ratios
  console.log("\nToken Ratio Calculations:");
  const testPositions = [
    { current: 0, lower: 0, upper: 10000 },
    { current: 5000, lower: 0, upper: 10000 },
    { current: 10000, lower: 0, upper: 10000 },
    { current: 2500, lower: 0, upper: 10000 }
  ];
  
  for (const pos of testPositions) {
    const ratios = calculateTokenRatios(pos.current, pos.lower, pos.upper);
    console.log(`Position ${pos.current}/${pos.lower}-${pos.upper} -> Token0: ${ratios.token0Percent}%, Token1: ${ratios.token1Percent}%`);
  }
  
  // Test APR calculations
  console.log("\nAPR Calculations:");
  const testAPRs = [
    { amount: 1000, volume: 10000, fee: 3000 }, // High volume
    { amount: 1000, volume: 2000, fee: 3000 },  // Medium volume
    { amount: 1000, volume: 200, fee: 3000 },   // Low volume
  ];
  
  for (const test of testAPRs) {
    const apr = calculateAPR(test.amount, test.volume, test.fee);
    console.log(`Liquidity: $${test.amount}, Volume: $${test.volume}, Fee: ${test.fee/100}% -> APR: ${apr.toFixed(2)}%`);
  }
}

// Export the functions for use in tests
module.exports = {
  tickToPrice,
  calculateTokenRatios,
  calculateAPR,
  sqrtPriceX96ToPrice,
  testMath
}; 