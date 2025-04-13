const fs = require('fs');

/**
 * Proportional Boost Lottery Simulation
 * 
 * This script simulates a lottery with a proportional boost system where
 * the maximum boost (2.5x) is only applied up to the amount of LP/voting power
 * the user holds proportional to their lottery entry.
 */

// Configuration
const SIMULATION_RUNS = 10000;

// Lottery parameters
const BASE_PROBABILITY = 0.0004; // 0.04% per 100 wS
const MAX_PROBABILITY = 0.04;    // 4% max
const MAX_BOOST = 2.5;          // Maximum boost multiplier (up to 10% max)
const BOOSTED_MAX_PROBABILITY = 0.10; // 10% max with boost
const PRECISION = 1000;         // For precision in calculations

// User Types with LP and Voting Power
const USERS = [
  // Base users for comparison
  { 
    name: "No LP User", 
    wsAmount: 1000, 
    lpAmount: 0,          // No LP tokens
    votePower: 0,         // No voting power
    description: "User with no LP tokens"
  },
  
  // Users with varying amounts of LP and voting power
  { 
    name: "Small LP Holder", 
    wsAmount: 1000, 
    lpAmount: 100,        // Small LP position
    votePower: 100,       // All LP tokens locked with max time
    description: "Small LP holder with full locking"
  },
  { 
    name: "Medium LP Holder", 
    wsAmount: 1000, 
    lpAmount: 1000,       // Medium LP position (matches swap amount)
    votePower: 1000,      // All LP tokens locked with max time
    description: "Medium LP holder with full locking - LP matches swap"
  },
  { 
    name: "Large LP Holder", 
    wsAmount: 1000, 
    lpAmount: 10000,      // Large LP position
    votePower: 10000,     // All LP tokens locked with max time
    description: "Large LP holder with full locking"
  },
  
  // Partial locking scenarios
  { 
    name: "Partial Locker", 
    wsAmount: 1000, 
    lpAmount: 1000,       // Medium LP position
    votePower: 500,       // Half of LP tokens locked (or shorter lock time)
    description: "Medium LP holder with partial locking"
  },
  
  // Whales with different LP scenarios
  { 
    name: "Whale No LP", 
    wsAmount: 10000, 
    lpAmount: 0,          // No LP tokens
    votePower: 0,         // No voting power
    description: "Large trader with no LP tokens"
  },
  { 
    name: "Whale Small LP", 
    wsAmount: 10000, 
    lpAmount: 1000,       // Small LP relative to trade size
    votePower: 1000,      // All LP tokens locked
    description: "Large trader with small LP position"
  },
  { 
    name: "Whale Matching LP", 
    wsAmount: 10000, 
    lpAmount: 10000,      // LP matches swap size
    votePower: 10000,     // All LP tokens locked
    description: "Large trader with LP matching trade size"
  }
];

/**
 * Calculate proportional boost based on LP and voting power relative to swap amount
 * 
 * @param {number} wsAmount - Amount of wSonic in swap
 * @param {number} lpAmount - Amount of LP tokens held by user
 * @param {number} votePower - Voting power of user from locked LP tokens
 * @return {number} Effective boost multiplier (1.0 to MAX_BOOST)
 */
function calculateProportionalBoost(wsAmount, lpAmount, votePower) {
  // If user has no LP or voting power, no boost
  if (lpAmount === 0 || votePower === 0) {
    return 1.0;
  }
  
  // Calculate base multiplier based on voting power to LP ratio (for Curve-style boost)
  // This ensures users who lock longer get more boost
  const voteToLPRatio = Math.min(votePower / lpAmount, 1.0);
  
  // Calculate proportional multiplier based on LP to swap ratio
  // This implements the proportionality requirement
  const proportionalFactor = Math.min(lpAmount / wsAmount, 1.0);
  
  // Calculate Curve-style boost formula (simplified):
  // boost = 1.0 + (MAX_BOOST - 1.0) * voteToLPRatio * proportionalFactor
  const boost = 1.0 + (MAX_BOOST - 1.0) * voteToLPRatio * proportionalFactor;
  
  return Math.min(boost, MAX_BOOST);
}

// Main lottery simulator with proportional boost
function simulateProportionalLottery() {
  const results = {};
  
  // Initialize results for each user
  USERS.forEach(user => {
    // Calculate the boost for this user
    const boost = calculateProportionalBoost(
      user.wsAmount,
      user.lpAmount,
      user.votePower
    );
    
    // Calculate base and boosted probabilities
    const baseProbability = Math.min(
      (user.wsAmount * BASE_PROBABILITY) / 100,
      MAX_PROBABILITY
    );
    
    const boostedProbability = Math.min(
      baseProbability * boost,
      BOOSTED_MAX_PROBABILITY
    );
    
    // Initialize user's statistics
    results[user.name] = {
      wsAmount: user.wsAmount,
      lpAmount: user.lpAmount,
      votePower: user.votePower,
      lpToSwapRatio: user.lpAmount / user.wsAmount,
      boostMultiplier: boost.toFixed(2),
      swaps: 0,
      wins: 0,
      baseProbability: (baseProbability * 100).toFixed(3) + "%",
      boostedProbability: (boostedProbability * 100).toFixed(3) + "%",
      description: user.description
    };
  });
  
  // Run simulations
  for (let i = 0; i < SIMULATION_RUNS; i++) {
    USERS.forEach(user => {
      const userData = results[user.name];
      userData.swaps++;
      
      // Calculate boost and probability for this user
      const boost = calculateProportionalBoost(
        user.wsAmount,
        user.lpAmount,
        user.votePower
      );
      
      const baseProbability = Math.min(
        (user.wsAmount * BASE_PROBABILITY) / 100,
        MAX_PROBABILITY
      );
      
      const effectiveProbability = Math.min(
        baseProbability * boost,
        BOOSTED_MAX_PROBABILITY
      );
      
      // Determine if user won
      const randomValue = Math.random();
      if (randomValue < effectiveProbability) {
        userData.wins++;
      }
    });
  }
  
  // Calculate win statistics
  USERS.forEach(user => {
    const userData = results[user.name];
    userData.winRate = (userData.wins / userData.swaps * 100).toFixed(3) + "%";
    userData.avgSwapsToWin = userData.wins > 0 
      ? (userData.swaps / userData.wins).toFixed(1) 
      : "N/A";
  });
  
  return results;
}

// Function to compare proportional vs flat boost models
function compareBoostModels() {
  const flatResults = {};
  const proportionalResults = {};
  
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
  
  testCases.forEach(test => {
    // Calculate base probability
    const baseProbability = Math.min(
      (test.wsAmount * BASE_PROBABILITY) / 100,
      MAX_PROBABILITY
    );
    
    // Current flat boost model (all users with LP get 2.5x regardless of amount)
    const flatBoost = test.lpAmount > 0 ? MAX_BOOST : 1.0;
    const flatProbability = Math.min(baseProbability * flatBoost, MAX_PROBABILITY);
    
    // New proportional boost model
    const propBoost = calculateProportionalBoost(test.wsAmount, test.lpAmount, test.votePower);
    const propProbability = Math.min(baseProbability * propBoost, MAX_PROBABILITY);
    
    // Calculate required swaps to win
    const baseSwapsToWin = 1 / baseProbability;
    const flatSwapsToWin = 1 / flatProbability;
    const propSwapsToWin = 1 / propProbability;
    
    // Calculate total wS needed to win on average
    const baseWSNeeded = baseSwapsToWin * test.wsAmount;
    const flatWSNeeded = flatSwapsToWin * test.wsAmount;
    const propWSNeeded = propSwapsToWin * test.wsAmount;
    
    // Store results
    const key = test.name;
    flatResults[key] = {
      wsAmount: test.wsAmount,
      lpAmount: test.lpAmount,
      boost: flatBoost.toFixed(1) + "x",
      probability: (flatProbability * 100).toFixed(3) + "%",
      swapsToWin: flatSwapsToWin.toFixed(1),
      wsNeeded: Math.round(flatWSNeeded),
      improvementOverBase: ((baseWSNeeded / flatWSNeeded) * 100 - 100).toFixed(1) + "%"
    };
    
    proportionalResults[key] = {
      wsAmount: test.wsAmount,
      lpAmount: test.lpAmount,
      boost: propBoost.toFixed(2) + "x",
      probability: (propProbability * 100).toFixed(3) + "%",
      swapsToWin: propSwapsToWin.toFixed(1),
      wsNeeded: Math.round(propWSNeeded),
      improvementOverBase: ((baseWSNeeded / propWSNeeded) * 100 - 100).toFixed(1) + "%"
    };
  });
  
  return { flatResults, proportionalResults };
}

// Run simulations
const lotteryResults = simulateProportionalLottery();
const modelComparison = compareBoostModels();

// Print results
console.log("================ PROPORTIONAL BOOST LOTTERY SIMULATION ================\n");
console.log("User performance with proportional boost system (runs:", SIMULATION_RUNS, ")");
console.table(lotteryResults);

console.log("\n================ FLAT VS PROPORTIONAL BOOST COMPARISON ================\n");
console.log("CURRENT SYSTEM (Flat 2.5x boost for any LP holder):");
console.table(modelComparison.flatResults);

console.log("\nPROPOSED SYSTEM (Proportional boost based on LP to swap ratio):");
console.table(modelComparison.proportionalResults);

console.log("\n================ ANALYSIS AND RECOMMENDATIONS ================\n");
console.log("1. The proportional boost system better rewards users who provide LP in proportion to their trading volume");
console.log("2. Users who provide small LP relative to their trading get a smaller boost, encouraging more LP provision");
console.log("3. The system still provides meaningful benefits to loyal LP providers without being exploitable");
console.log("4. Whales must provide proportionally more LP to get the same boost benefits");
console.log("5. This creates a more balanced and fair ecosystem while still incentivizing LP provision");

// Save results to file
const outputPath = "proportional-boost-results.json";
fs.writeFileSync(outputPath, JSON.stringify({
  lotteryResults,
  modelComparison
}, null, 2));

console.log("\nDetailed results saved to", outputPath); 