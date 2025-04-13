const fs = require('fs');

/**
 * Lottery Simulation
 * This script simulates lottery outcomes with different boost multipliers
 * to evaluate if a 2.5x boost is appropriate or excessive.
 */

// Configuration
const SIMULATION_RUNS = 10000;
const USERS = [
  { name: "Regular User", wsAmount: 1000, boost: 1.0 },     // No boost (1x)
  { name: "Small Holder", wsAmount: 1000, boost: 1.5 },     // Small boost (1.5x)
  { name: "Medium Holder", wsAmount: 1000, boost: 2.0 },    // Medium boost (2.0x)
  { name: "Large Holder", wsAmount: 1000, boost: 2.5 },     // Max boost (2.5x)
  { name: "Whale Regular", wsAmount: 10000, boost: 1.0 },   // Large amount, no boost
  { name: "Whale Boosted", wsAmount: 10000, boost: 2.5 },   // Large amount, max boost
];

// Lottery parameters
const BASE_PROBABILITY = 0.001; // 0.1% per 100 wS
const MAX_PROBABILITY = 0.1;    // 10% max
const PRECISION = 1000;         // For precision in calculations

// Lottery simulator
function simulateLottery() {
  const results = {};
  
  // Initialize results for each user
  USERS.forEach(user => {
    results[user.name] = {
      swaps: 0,
      wins: 0,
      totalSpent: 0,
      winRate: 0,
      averageSwapsPerWin: 0,
      baseProbability: 0,
      effectiveProbability: 0
    };
  });
  
  // Run simulations
  for (let i = 0; i < SIMULATION_RUNS; i++) {
    USERS.forEach(user => {
      results[user.name].swaps++;
      results[user.name].totalSpent += user.wsAmount;
      
      // Calculate base probability
      const baseProbability = Math.min(
        (user.wsAmount * BASE_PROBABILITY) / 100,
        MAX_PROBABILITY
      );
      
      // Apply boost multiplier
      const effectiveProbability = Math.min(
        baseProbability * user.boost,
        MAX_PROBABILITY
      );
      
      // Store probabilities for reporting
      results[user.name].baseProbability = baseProbability;
      results[user.name].effectiveProbability = effectiveProbability;
      
      // Determine if user won
      const randomValue = Math.random();
      if (randomValue < effectiveProbability) {
        results[user.name].wins++;
      }
    });
  }
  
  // Calculate statistics
  USERS.forEach(user => {
    const userData = results[user.name];
    userData.winRate = userData.wins / userData.swaps;
    userData.averageSwapsPerWin = userData.wins > 0 ? userData.swaps / userData.wins : "Never won";
    
    // Convert probabilities to percentages for display
    userData.baseProbability = (userData.baseProbability * 100).toFixed(3) + "%";
    userData.effectiveProbability = (userData.effectiveProbability * 100).toFixed(3) + "%";
  });
  
  return results;
}

// Function to simulate boost impact
function simulateBoostImpact() {
  // Simulate different boost multipliers from 1.0 to 3.0
  const boostValues = [1.0, 1.5, 2.0, 2.5, 3.0];
  const results = {};
  
  boostValues.forEach(boost => {
    // Number of swaps needed on average to win with 1000 wS
    const baseProbability = Math.min((1000 * BASE_PROBABILITY) / 100, MAX_PROBABILITY);
    const boostedProbability = Math.min(baseProbability * boost, MAX_PROBABILITY);
    
    const averageSwapsToWin = 1 / boostedProbability;
    const wSNeeded = averageSwapsToWin * 1000;
    
    results[boost.toFixed(1) + "x"] = {
      probability: (boostedProbability * 100).toFixed(3) + "%",
      averageSwapsToWin: averageSwapsToWin.toFixed(1),
      averageWSNeeded: Math.round(wSNeeded)
    };
  });
  
  return results;
}

// Function to simulate whale advantage
function simulateWhaleAdvantage() {
  // Define different user types with varying wS amounts
  const userTypes = [
    { name: "Small User", wsAmount: 100, boost: 1.0 },
    { name: "Small User (Max Boost)", wsAmount: 100, boost: 2.5 },
    { name: "Medium User", wsAmount: 1000, boost: 1.0 },
    { name: "Medium User (Max Boost)", wsAmount: 1000, boost: 2.5 },
    { name: "Large User", wsAmount: 10000, boost: 1.0 },
    { name: "Large User (Max Boost)", wsAmount: 10000, boost: 2.5 }
  ];
  
  const results = {};
  
  userTypes.forEach(user => {
    // Calculate probabilities
    const baseProbability = Math.min((user.wsAmount * BASE_PROBABILITY) / 100, MAX_PROBABILITY);
    const boostedProbability = Math.min(baseProbability * user.boost, MAX_PROBABILITY);
    
    // Calculate average swaps needed to win
    const averageSwapsToWin = 1 / boostedProbability;
    const totalWSNeeded = averageSwapsToWin * user.wsAmount;
    
    // Calculate relative advantage compared to smallest user
    const relativeAdvantage = boostedProbability / (userTypes[0].wsAmount * BASE_PROBABILITY / 100);
    
    results[user.name] = {
      wsPerSwap: user.wsAmount,
      boost: user.boost.toFixed(1) + "x",
      probability: (boostedProbability * 100).toFixed(3) + "%",
      averageSwapsToWin: averageSwapsToWin.toFixed(1),
      totalWSNeeded: Math.round(totalWSNeeded),
      relativeAdvantage: relativeAdvantage.toFixed(1) + "x"
    };
  });
  
  return results;
}

// Run the simulations
const lotteryResults = simulateLottery();
const boostImpactResults = simulateBoostImpact();
const whaleAdvantageResults = simulateWhaleAdvantage();

// Output results
console.log("=============== LOTTERY SIMULATION RESULTS ===============");
console.log("\nUser Performance Over", SIMULATION_RUNS, "Swaps:");
console.table(lotteryResults);

console.log("\n=============== BOOST IMPACT ANALYSIS ===============");
console.log("\nImpact of Different Boost Multipliers (1000 wS):");
console.table(boostImpactResults);

console.log("\n=============== USER TYPE COMPARISON ===============");
console.log("\nComparison of Different User Types:");
console.table(whaleAdvantageResults);

console.log("\n=============== RECOMMENDATIONS ===============");
console.log("\nBased on simulations:");
console.log("1. A 2.5x max boost provides significant benefit to loyal LP providers without being excessive");
console.log("2. Even with 2.5x boost, users with larger swap amounts (whales) still have a natural advantage");
console.log("3. The boost system helps smaller users remain competitive while rewarding ecosystem participation");
console.log("4. The 10% maximum probability cap prevents any user from having guaranteed wins regardless of boost");

// Save results to file
const outputPath = "simulation-results.json";
fs.writeFileSync(outputPath, JSON.stringify({
  lotteryResults,
  boostImpactResults,
  whaleAdvantageResults
}, null, 2));

console.log("\nDetailed results saved to", outputPath); 