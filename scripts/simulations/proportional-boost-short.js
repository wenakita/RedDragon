/**
 * Simplified Proportional Boost Comparison
 * Compares flat 2.5x boost vs proportional boost based on LP/vote ratio
 */

// Lottery parameters
const BASE_PROBABILITY = 0.001; // 0.1% per 100 wS
const MAX_PROBABILITY = 0.1;    // 10% max
const MAX_BOOST = 2.5;          // Maximum boost multiplier

/**
 * Calculate proportional boost based on LP and voting power relative to swap amount
 */
function calculateProportionalBoost(wsAmount, lpAmount, votePower) {
  if (lpAmount === 0 || votePower === 0) return 1.0;
  
  // Calculate proportion factors
  const voteToLPRatio = Math.min(votePower / lpAmount, 1.0);
  const proportionalFactor = Math.min(lpAmount / wsAmount, 1.0);
  
  // Proportional boost formula
  const boost = 1.0 + (MAX_BOOST - 1.0) * voteToLPRatio * proportionalFactor;
  return Math.min(boost, MAX_BOOST);
}

// Function to compare flat vs proportional boost models
function compareBoostModels() {
  // Create a set of test cases
  const testCases = [
    { wsAmount: 1000, lpAmount: 0, votePower: 0, name: "No LP" },
    { wsAmount: 1000, lpAmount: 100, votePower: 100, name: "10% LP to Swap" },
    { wsAmount: 1000, lpAmount: 500, votePower: 500, name: "50% LP to Swap" },
    { wsAmount: 1000, lpAmount: 1000, votePower: 1000, name: "100% LP to Swap" },
    { wsAmount: 1000, lpAmount: 2500, votePower: 2500, name: "250% LP to Swap" },
    { wsAmount: 10000, lpAmount: 1000, votePower: 1000, name: "Whale - 10% LP to Swap" },
    { wsAmount: 10000, lpAmount: 10000, votePower: 10000, name: "Whale - 100% LP to Swap" }
  ];
  
  // Results for each model
  const comparison = [];
  
  testCases.forEach(test => {
    // Calculate base probability
    const baseProbability = Math.min((test.wsAmount * BASE_PROBABILITY) / 100, MAX_PROBABILITY);
    
    // Current flat boost model (all users with LP get 2.5x regardless of amount)
    const flatBoost = test.lpAmount > 0 ? MAX_BOOST : 1.0;
    const flatProbability = Math.min(baseProbability * flatBoost, MAX_PROBABILITY);
    
    // New proportional boost model
    const propBoost = calculateProportionalBoost(test.wsAmount, test.lpAmount, test.votePower);
    const propProbability = Math.min(baseProbability * propBoost, MAX_PROBABILITY);
    
    // Store comparative results
    comparison.push({
      scenario: test.name,
      wsAmount: test.wsAmount,
      lpAmount: test.lpAmount,
      lpToSwapRatio: (test.lpAmount / test.wsAmount).toFixed(2),
      currentBoost: flatBoost.toFixed(1) + "x",
      currentProbability: (flatProbability * 100).toFixed(3) + "%",
      propBoost: propBoost.toFixed(2) + "x",
      propProbability: (propProbability * 100).toFixed(3) + "%"
    });
  });
  
  return comparison;
}

// Run and display comparison
const comparison = compareBoostModels();
console.log("\n================ FLAT VS PROPORTIONAL BOOST COMPARISON ================\n");
console.table(comparison);

console.log("\n================ KEY FINDINGS ================\n");
console.log("1. The proportional boost system rewards users based on their LP contribution relative to trading volume");
console.log("2. Users get full 2.5x boost only when their LP matches or exceeds their swap amount");
console.log("3. Whales must provide proportionally more LP to get the same boost benefits");
console.log("4. This creates a more balanced ecosystem while still incentivizing LP provision"); 