/**
 * Swap-Based Proportional Boost Simulation
 * 
 * This script simulates a lottery where the boost is calculated based on
 * the user's LP/voting power relative to their current swap amount,
 * not their overall trading volume or history.
 */

// Lottery parameters
const BASE_PROBABILITY = 0.001; // 0.1% per 100 wS
const MAX_PROBABILITY = 0.1;    // 10% max
const MAX_BOOST = 2.5;          // Maximum boost multiplier

/**
 * Calculate boost based on LP and voting power relative to current swap amount
 * 
 * @param {number} swapAmount - Current swap amount in wS
 * @param {number} lpAmount - LP tokens held by user
 * @param {number} votePower - Voting power from locked LP
 * @return {number} Effective boost multiplier (1.0 to MAX_BOOST)
 */
function calculateSwapBasedBoost(swapAmount, lpAmount, votePower) {
  if (lpAmount === 0 || votePower === 0) return 1.0;
  
  // Calculate boost based on vote power ratio (incentive for locking)
  const voteToLPRatio = Math.min(votePower / lpAmount, 1.0);
  
  // Calculate boost based on LP to current swap ratio
  const lpToSwapRatio = Math.min(lpAmount / swapAmount, 1.0);
  
  // Calculate final boost using both factors
  const boost = 1.0 + (MAX_BOOST - 1.0) * voteToLPRatio * lpToSwapRatio;
  return Math.min(boost, MAX_BOOST);
}

/**
 * Simulate a series of swaps with different amounts for a given user
 */
function simulateUserSwaps(lpAmount, votePower, swapAmounts) {
  const results = [];
  
  swapAmounts.forEach(swapAmount => {
    // Calculate base probability for this swap
    const baseProbability = Math.min((swapAmount * BASE_PROBABILITY) / 100, MAX_PROBABILITY);
    
    // Calculate boost for this specific swap
    const boost = calculateSwapBasedBoost(swapAmount, lpAmount, votePower);
    
    // Calculate boosted probability
    const boostedProbability = Math.min(baseProbability * boost, MAX_PROBABILITY);
    
    results.push({
      swapAmount,
      lpAmount,
      votePower,
      lpToSwapRatio: (lpAmount / swapAmount).toFixed(2),
      boost: boost.toFixed(2) + "x",
      baseProbability: (baseProbability * 100).toFixed(3) + "%",
      boostedProbability: (boostedProbability * 100).toFixed(3) + "%"
    });
  });
  
  return results;
}

/**
 * Compare different user profiles and their boost across various swap amounts
 */
function compareUserProfiles() {
  // Define user profiles with different LP holdings
  const userProfiles = [
    { name: "No LP User", lpAmount: 0, votePower: 0 },
    { name: "Small LP Holder", lpAmount: 500, votePower: 500 },
    { name: "Medium LP Holder", lpAmount: 1000, votePower: 1000 },
    { name: "Large LP Holder", lpAmount: 10000, votePower: 10000 }
  ];
  
  // Different swap scenarios to test
  const swapAmounts = [100, 500, 1000, 5000, 10000];
  
  // Results table
  const results = {};
  
  userProfiles.forEach(user => {
    console.log(`\n== ${user.name} (LP: ${user.lpAmount}, Vote Power: ${user.votePower}) ==`);
    
    const userResults = simulateUserSwaps(user.lpAmount, user.votePower, swapAmounts);
    console.table(userResults);
    
    results[user.name] = userResults;
  });
  
  return results;
}

/**
 * Demonstrate a user's experience with multiple swaps
 */
function simulateSingleUserJourney() {
  // User with 1000 LP and full voting power
  const lpAmount = 1000;
  const votePower = 1000;
  
  console.log("\n================ SINGLE USER JOURNEY ================\n");
  console.log(`User with ${lpAmount} LP tokens and ${votePower} voting power making various swaps:`);
  
  // Simulate various swap amounts
  const smallSwap = { amount: 100, description: "Small swap (100 wS)" };
  const matchingSwap = { amount: 1000, description: "Matching swap (1000 wS)" };
  const largeSwap = { amount: 5000, description: "Large swap (5000 wS)" };
  
  const swaps = [smallSwap, matchingSwap, largeSwap];
  
  swaps.forEach(swap => {
    const baseProbability = Math.min((swap.amount * BASE_PROBABILITY) / 100, MAX_PROBABILITY);
    const boost = calculateSwapBasedBoost(swap.amount, lpAmount, votePower);
    const boostedProbability = Math.min(baseProbability * boost, MAX_PROBABILITY);
    
    console.log(`\n${swap.description}:`);
    console.log(`- Base probability: ${(baseProbability * 100).toFixed(3)}%`);
    console.log(`- LP to swap ratio: ${(lpAmount / swap.amount).toFixed(2)}`);
    console.log(`- Boost multiplier: ${boost.toFixed(2)}x`);
    console.log(`- Boosted probability: ${(boostedProbability * 100).toFixed(3)}%`);
    console.log(`- Improvement: ${((boost - 1) * 100).toFixed(1)}%`);
  });
}

/**
 * Compare current flat boost vs swap-based proportional boost
 */
function compareBoostModels() {
  // Test cases
  const testCases = [
    { swapAmount: 100, lpAmount: 500, votePower: 500, name: "Small swap, medium LP" },
    { swapAmount: 1000, lpAmount: 500, votePower: 500, name: "Medium swap, half matching LP" },
    { swapAmount: 1000, lpAmount: 1000, votePower: 1000, name: "Swap matching LP exactly" },
    { swapAmount: 5000, lpAmount: 1000, votePower: 1000, name: "Large swap, smaller LP" },
    { swapAmount: 10000, lpAmount: 1000, votePower: 1000, name: "Very large swap, small LP" },
    { swapAmount: 10000, lpAmount: 10000, votePower: 10000, name: "Large swap, matching LP" }
  ];
  
  // Results
  const comparison = [];
  
  testCases.forEach(test => {
    // Calculate base probability
    const baseProbability = Math.min((test.swapAmount * BASE_PROBABILITY) / 100, MAX_PROBABILITY);
    
    // Current flat boost model (all LP holders get full 2.5x)
    const flatBoost = test.lpAmount > 0 ? MAX_BOOST : 1.0;
    const flatProbability = Math.min(baseProbability * flatBoost, MAX_PROBABILITY);
    
    // Swap-based proportional boost model
    const swapBoost = calculateSwapBasedBoost(test.swapAmount, test.lpAmount, test.votePower);
    const swapProbability = Math.min(baseProbability * swapBoost, MAX_PROBABILITY);
    
    comparison.push({
      scenario: test.name,
      swapAmount: test.swapAmount,
      lpAmount: test.lpAmount,
      lpToSwapRatio: (test.lpAmount / test.swapAmount).toFixed(2),
      currentBoost: flatBoost.toFixed(1) + "x",
      currentProbability: (flatProbability * 100).toFixed(3) + "%",
      swapBasedBoost: swapBoost.toFixed(2) + "x",
      swapBasedProbability: (swapProbability * 100).toFixed(3) + "%"
    });
  });
  
  return comparison;
}

// Run simulations
console.log("\n================ SWAP-BASED BOOST MODEL ================\n");
console.log("This model calculates boost based on LP relative to CURRENT SWAP AMOUNT only");

const comparison = compareBoostModels();
console.log("\n================ CURRENT VS SWAP-BASED BOOST COMPARISON ================\n");
console.table(comparison);

simulateSingleUserJourney();

console.log("\n================ IMPLEMENTATION NOTES ================\n");
console.log("To implement this in the smart contract:");
console.log("1. In the lottery entry function, pass the actual swap amount as a parameter");
console.log("2. Calculate LP to swap ratio at the time of each lottery entry");
console.log("3. Apply the appropriate boost formula: 1.0 + (MAX_BOOST - 1.0) * voteRatio * lpToSwapRatio");
console.log("4. Cap the boost at MAX_BOOST (2.5x)");

console.log("\n================ KEY BENEFITS ================\n");
console.log("1. More directly ties boost to the specific transaction");
console.log("2. Users need LP proportional to their swap amount to get maximum boost");
console.log("3. Whales must provide proportionally more LP for larger swaps");
console.log("4. Creates fair balance between swap size and protocol support");
console.log("5. Simpler to implement than tracking trading volume over time"); 