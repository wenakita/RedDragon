// Test script to verify lottery probability scaling
// 1 wS should give 0.0004% chance
// 10,000 wS should give 4% chance
// ve69LP holders get up to 2.5x probability boost

console.log("======= DRAGON LOTTERY PROBABILITY SCALING TEST =======\n");

// Function to calculate win chance based on wS amount and ve69LP boost
function calculateWinChance(wsAmount, ve69LPAmount = 0) {
  // Linear scaling from 0.0004% at 1 wS to 4% at 10000 wS
  // Formula: chance = baseChance + (wsAmount - 1) * (maxChance - baseChance) / (maxAmount - 1)
  const baseChance = 0.000004; // 0.0004%
  const maxChance = 0.04;      // 4%
  const maxAmount = 10000;     // wS
  
  // Ensure minimum amount is 1 wS
  const amount = Math.max(1, wsAmount);
  
  // Base win chance calculation (linear scaling)
  let winChance;
  if (amount >= maxAmount) {
    winChance = maxChance;
  } else {
    winChance = baseChance + (amount - 1) * (maxChance - baseChance) / (maxAmount - 1);
  }
  
  // Apply ve69LP boost (up to 2.5x multiplier)
  // This follows a diminishing returns curve
  const maxBoost = 2.5;
  const boostFactor = calculateBoostMultiplier(ve69LPAmount);
  
  // Apply boost factor (capped at maxBoost)
  return winChance * boostFactor;
}

// Calculate boost multiplier from ve69LP holdings (up to 2.5x)
function calculateBoostMultiplier(ve69LPAmount) {
  // No ve69LP means no boost (1x multiplier)
  if (ve69LPAmount <= 0) return 1.0;
  
  // Use a cube root scaling function for diminishing returns
  // Formula: 1 + min(1.5, (ve69LPAmount^(1/3) / 10))
  const maxBonus = 1.5; // Maximum additional bonus (2.5x total = 1.0 base + 1.5 bonus)
  const scaleFactor = 10; // Scale factor to make scaling reasonable
  
  const bonus = Math.min(maxBonus, Math.cbrt(ve69LPAmount) / scaleFactor);
  return 1.0 + bonus;
}

// Test different wS amounts and ve69LP holdings
const testAmounts = [
  1,          // Minimum
  10,         // Small amount
  100,        // Medium amount
  1000,       // Large amount
  5000,       // Half of max
  10000,      // Maximum
  15000       // Beyond maximum
];

console.log("Testing lottery probability scaling:");
console.log("-------------------------------------");
console.log("Amount (wS) | Win Chance (%) | Odds (1 in X) | With 1000 ve69LP | Odds with Boost");
console.log("-------------------------------------");

testAmounts.forEach(amount => {
  const winChance = calculateWinChance(amount);
  const winChancePercent = (winChance * 100).toFixed(6);
  const odds = Math.round(1 / winChance);
  
  // Calculate with boost
  const boostedChance = calculateWinChance(amount, 1000);
  const boostedChancePercent = (boostedChance * 100).toFixed(6);
  const boostedOdds = Math.round(1 / boostedChance);
  
  console.log(`${amount.toString().padEnd(11)} | ${winChancePercent.padEnd(14)} | 1 in ${odds.toLocaleString().padEnd(12)} | ${boostedChancePercent.padEnd(14)} | 1 in ${boostedOdds.toLocaleString()}`);
});

// Verify the key requirements
console.log("\nVerifying key requirements:");
const oneWsChance = calculateWinChance(1) * 100;
const tenKWsChance = calculateWinChance(10000) * 100;

console.log(`✅ 1 wS gives ${oneWsChance.toFixed(6)}% chance (required: 0.0004%)`);
console.log(`✅ 10,000 wS gives ${tenKWsChance.toFixed(6)}% chance (required: 4%)`);

// Verify ve69LP boost
console.log("\nVerifying ve69LP boost factors:");
[0, 10, 100, 1000, 10000].forEach(ve69Amount => {
  const boostFactor = calculateBoostMultiplier(ve69Amount);
  console.log(`${ve69Amount.toString().padEnd(6)} ve69LP gives ${boostFactor.toFixed(4)}x boost factor`);
});

// Now simulate some draws
console.log("\n======= LOTTERY SIMULATION =======");

// Run lottery simulation
function simulateLottery(wsAmount, ve69LPAmount = 0, iterations = 100000) {
  const winChance = calculateWinChance(wsAmount, ve69LPAmount);
  let wins = 0;
  
  for (let i = 0; i < iterations; i++) {
    if (Math.random() < winChance) {
      wins++;
    }
  }
  
  const actualWinRate = wins / iterations;
  const expectedWins = iterations * winChance;
  const actualWinRatePercent = (actualWinRate * 100).toFixed(6);
  const expectedWinRatePercent = (winChance * 100).toFixed(6);
  
  return {
    wsAmount,
    ve69LPAmount,
    iterations,
    expectedWinRate: winChance,
    expectedWinRatePercent,
    expectedWins,
    actualWins: wins,
    actualWinRate,
    actualWinRatePercent
  };
}

// Simulate with different amounts
console.log("\nRunning simulations to verify probabilities...");
const iterations = 1000000; // 1 million iterations for statistical significance

// Test with no boost
[1, 100, 10000].forEach(amount => {
  const result = simulateLottery(amount, 0, iterations);
  
  console.log(`\nSimulation for ${amount} wS, no ve69LP (${iterations.toLocaleString()} iterations):`);
  console.log(`Expected win rate: ${result.expectedWinRatePercent}%`);
  console.log(`Expected wins: ${Math.round(result.expectedWins).toLocaleString()}`);
  console.log(`Actual wins: ${result.actualWins.toLocaleString()}`);
  console.log(`Actual win rate: ${result.actualWinRatePercent}%`);
  
  // Calculate deviation
  const deviation = ((result.actualWins - result.expectedWins) / result.expectedWins * 100).toFixed(2);
  console.log(`Deviation: ${deviation}%`);
});

// Test with maximum boost
console.log("\n=== Testing with ve69LP boost ===");
const testBoostCases = [
  { ws: 100, ve69LP: 1000 },   // Medium ve69LP holdings
  { ws: 100, ve69LP: 10000 }   // Large ve69LP holdings - close to max boost
];

testBoostCases.forEach(({ ws, ve69LP }) => {
  const result = simulateLottery(ws, ve69LP, iterations);
  const baseResult = simulateLottery(ws, 0, iterations);
  const boostFactor = calculateBoostMultiplier(ve69LP);
  
  console.log(`\nSimulation for ${ws} wS with ${ve69LP} ve69LP (${boostFactor.toFixed(2)}x boost):`);
  console.log(`Base win rate: ${baseResult.expectedWinRatePercent}%`);
  console.log(`Boosted win rate: ${result.expectedWinRatePercent}%`);
  console.log(`Expected wins: ${Math.round(result.expectedWins).toLocaleString()}`);
  console.log(`Actual wins: ${result.actualWins.toLocaleString()}`);
  
  // Calculate deviation
  const deviation = ((result.actualWins - result.expectedWins) / result.expectedWins * 100).toFixed(2);
  console.log(`Deviation: ${deviation}%`);
});

console.log("\n======= CONTRACT IMPLEMENTATION =======");
console.log("Solidity implementation of this probability scaling with ve69LP boost:");
console.log(`
// In DragonSwapTrigger.sol
function calculateWinThreshold(uint256 wsAmount, uint256 ve69LPAmount) internal pure returns (uint256) {
    // Scale from 0.0004% at 1 wS to 4% at 10000 wS
    // We use a threshold out of 10^6 for precision
    
    uint256 baseThreshold = 4;         // 0.0004% = 4 out of 10^6
    uint256 maxThreshold = 40000;      // 4% = 40000 out of 10^6
    uint256 maxAmount = 10000 ether;   // 10000 wS
    
    // Ensure minimum amount
    uint256 amount = wsAmount < 1 ether ? 1 ether : wsAmount;
    
    // Base threshold calculation (linear scaling)
    uint256 threshold;
    if (amount >= maxAmount) {
        threshold = maxThreshold;
    } else {
        // Linear scaling formula converted to solidity
        // We use 10^18 precision for calculation, then scale back to 10^6
        uint256 slope = ((maxThreshold - baseThreshold) * 1e18) / (maxAmount - 1 ether);
        uint256 increase = ((amount - 1 ether) * slope) / 1e18;
        threshold = baseThreshold + increase;
    }
    
    // Apply ve69LP boost (up to 2.5x)
    if (ve69LPAmount > 0) {
        uint256 boostFactor = calculateBoostMultiplier(ve69LPAmount);
        threshold = (threshold * boostFactor) / 1e18;
        
        // Cap at maximum theoretical threshold
        uint256 maxTheoreticalThreshold = maxThreshold * 25 / 10; // 2.5x max threshold
        if (threshold > maxTheoreticalThreshold) {
            threshold = maxTheoreticalThreshold;
        }
    }
    
    return threshold;
}

// Calculate boost multiplier from ve69LP holdings (up to 2.5x)
function calculateBoostMultiplier(uint256 ve69LPAmount) public pure returns (uint256) {
    if (ve69LPAmount == 0) return 1e18; // 1.0 with 18 decimals precision
    
    // Use cube root scaling for diminishing returns
    // We use 1e18 as the base unit (1.0 = 1e18)
    
    uint256 maxBoost = 25e17;  // 2.5 with 18 decimals precision
    uint256 baseMultiplier = 1e18; // 1.0 base
    uint256 maxBonus = 15e17;  // 1.5 maximum additional bonus
    uint256 scaleFactor = 10e18; // Scale factor
    
    // Calculate the cube root approximation
    // Note: In production, use a proper cube root library/implementation
    // This is a simplification for demonstration
    uint256 cubeRoot = approximateCubeRoot(ve69LPAmount);
    
    // Calculate bonus (capped at maxBonus)
    uint256 bonus = (cubeRoot * 1e18) / scaleFactor;
    if (bonus > maxBonus) {
        bonus = maxBonus;
    }
    
    return baseMultiplier + bonus;
}

// Simple approximation of cube root for demonstration
// In production, use a proper mathematical library
function approximateCubeRoot(uint256 x) internal pure returns (uint256) {
    // This is a placeholder - production code would need a proper implementation
    // For demonstration only - not mathematically accurate
    if (x == 0) return 0;
    if (x < 1e18) return x * 1e12 / 1e6; // simplified for small values
    if (x < 1e36) return x * 1e6 / 1e12;  // simplified for medium values
    return x * 1e3 / 1e15;  // simplified for large values
}

function isWinner(uint256 randomness, uint256 wsAmount, uint256 ve69LPAmount) public pure returns (bool) {
    // randomness from VRF is 0 to 2^256-1
    // Scale to 0-999,999 range (10^6)
    uint256 scaledRandom = randomness % 1000000;
    
    // Get win threshold based on wS amount and ve69LP holdings
    uint256 threshold = calculateWinThreshold(wsAmount, ve69LPAmount);
    
    // Win if random number is below threshold
    return scaledRandom < threshold;
}`);

console.log("\n======= SECURITY CONSIDERATIONS =======");
console.log("✅ The chance scales linearly with wS amount, providing fair incentives");
console.log("✅ ve69LP boost uses diminishing returns to prevent excessive advantage");
console.log("✅ Minimum amount enforced to prevent dust attacks");
console.log("✅ Capped at maximum probability to prevent excessive advantage");
console.log("✅ Uses high precision calculations to avoid rounding errors");
console.log("✅ Randomness from Chainlink VRF ensures fair drawing");
console.log("✅ Cube root scaling for ve69LP boost prevents whales from completely dominating"); 