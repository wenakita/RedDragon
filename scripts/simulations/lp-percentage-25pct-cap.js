/**
 * Percentage-Based LP Boost Simulation with 25% Max Probability
 * 
 * This script simulates a boost system where:
 * 1. Boost is based on % of total LP supply relative to swap %
 * 2. Maximum boost is 2.5x when LP % matches or exceeds swap % (up to 10% cap)
 * 3. Maximum win probability is capped at 25% (increased from 10%)
 */

// Simulation parameters
const TOTAL_LP_SUPPLY = 1000000;       // Total LP tokens in circulation
const TOTAL_WSONIC_LIQUIDITY = 5000000; // Total wSonic in the trading pool
const MAX_LP_PERCENTAGE = 10;          // Max % of LP considered (cap for boost calculation)

// Lottery parameters
const BASE_PROBABILITY = 0.001; // 0.1% per 100 wS
const MAX_PROBABILITY = 0.25;   // 25% max win probability (increased from 10%)
const MAX_BOOST = 2.5;          // Maximum boost multiplier

/**
 * Calculate boost based on percentage of LP supply relative to percentage of swap
 * 
 * @param {number} swapAmount - Current swap amount in wS
 * @param {number} lpAmount - User's LP tokens 
 * @param {number} votePower - User's voting power from locked LP
 * @return {number} Effective boost multiplier (1.0 to MAX_BOOST)
 */
function calculatePercentageBoost(swapAmount, lpAmount, votePower) {
  if (lpAmount === 0 || votePower === 0) return 1.0;
  
  // Calculate percentages
  const lpPercentage = Math.min((lpAmount / TOTAL_LP_SUPPLY) * 100, MAX_LP_PERCENTAGE);
  const swapPercentage = (swapAmount / TOTAL_WSONIC_LIQUIDITY) * 100;
  
  // Calculate boost based on vote power ratio (incentive for locking)
  const voteToLPRatio = Math.min(votePower / lpAmount, 1.0);
  
  // Calculate percentage-based ratio with 10% cap
  const percentageRatio = Math.min(lpPercentage / swapPercentage, 1.0);
  
  // Calculate final boost using both factors
  const boost = 1.0 + (MAX_BOOST - 1.0) * voteToLPRatio * percentageRatio;
  return Math.min(boost, MAX_BOOST);
}

/**
 * Compare different swap sizes and probability caps
 */
function compareSwapSizes() {
  // Create test cases with different swap sizes
  const swapSizes = [
    { amount: 1000, description: "Small Swap (1,000 wS)" },
    { amount: 5000, description: "Medium Swap (5,000 wS)" },
    { amount: 10000, description: "Large Swap (10,000 wS)" },
    { amount: 25000, description: "Very Large Swap (25,000 wS)" },
    { amount: 50000, description: "Whale Swap (50,000 wS)" },
    { amount: 100000, description: "Huge Whale Swap (100,000 wS)" }
  ];
  
  // LP scenarios (same for all swap sizes)
  const lpScenarios = [
    { lpPercentage: 0, lpAmount: 0, votePower: 0, description: "No LP" },
    { lpPercentage: 0.1, lpAmount: 1000, votePower: 1000, description: "0.1% LP" },
    { lpPercentage: 1, lpAmount: 10000, votePower: 10000, description: "1% LP" },
    { lpPercentage: 5, lpAmount: 50000, votePower: 50000, description: "5% LP" },
    { lpPercentage: 10, lpAmount: 100000, votePower: 100000, description: "10% LP (Max)" }
  ];
  
  // Results table
  const results = [];
  
  // Process each swap size
  swapSizes.forEach(swap => {
    // Calculate swap percentage
    const swapPercentage = (swap.amount / TOTAL_WSONIC_LIQUIDITY) * 100;
    
    // For each LP scenario
    lpScenarios.forEach(lp => {
      // Calculate base probability
      const baseProb = Math.min((swap.amount * BASE_PROBABILITY) / 100, MAX_PROBABILITY);
      
      // Calculate boost
      const boost = calculatePercentageBoost(swap.amount, lp.lpAmount, lp.votePower);
      
      // Calculate final probability
      const finalProb = Math.min(baseProb * boost, MAX_PROBABILITY);
      
      // Add to results
      results.push({
        swapAmount: swap.amount,
        swapPercentage: swapPercentage.toFixed(3) + "%",
        lpPercentage: lp.lpPercentage.toFixed(2) + "%",
        lpAmount: lp.lpAmount,
        lpToSwapRatio: lp.lpAmount > 0 ? (lp.lpPercentage / swapPercentage).toFixed(2) + "x" : "N/A",
        boost: boost.toFixed(2) + "x",
        baseProb: (baseProb * 100).toFixed(3) + "%",
        finalProb: (finalProb * 100).toFixed(3) + "%",
        capped: finalProb >= MAX_PROBABILITY ? "YES" : "NO",
        lpDescription: lp.description,
        swapDescription: swap.description
      });
    });
  });
  
  return results;
}

/**
 * Simulate a user making increasingly larger swaps with the same LP amount
 */
function simulateIncreasingSwaps() {
  // User with 5% of LP supply
  const userLPAmount = 50000;
  const userVotePower = 50000;
  const userLPPercentage = (userLPAmount / TOTAL_LP_SUPPLY) * 100;
  
  // Different swap sizes to try
  const swapSizes = [
    1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000
  ];
  
  const results = [];
  
  swapSizes.forEach(swapAmount => {
    // Calculate swap percentage
    const swapPercentage = (swapAmount / TOTAL_WSONIC_LIQUIDITY) * 100;
    
    // Calculate ratio of LP% to swap%
    const ratio = userLPPercentage / swapPercentage;
    
    // Calculate base probability
    const baseProb = Math.min((swapAmount * BASE_PROBABILITY) / 100, MAX_PROBABILITY);
    
    // Calculate boost
    const boost = calculatePercentageBoost(swapAmount, userLPAmount, userVotePower);
    
    // Calculate final probability
    const finalProb = Math.min(baseProb * boost, MAX_PROBABILITY);
    
    results.push({
      swapAmount,
      swapPercentage: swapPercentage.toFixed(3) + "%",
      lpToSwapRatio: ratio.toFixed(2) + "x",
      boost: boost.toFixed(2) + "x",
      baseProb: (baseProb * 100).toFixed(3) + "%",
      finalProb: (finalProb * 100).toFixed(3) + "%",
      swapsTillWin: Math.round(1 / finalProb),
      capped: finalProb >= MAX_PROBABILITY ? "YES" : "NO"
    });
  });
  
  return results;
}

/**
 * Calculate the minimum LP needed to get maximum boost at different swap sizes
 */
function calculateMinimumLPRequired() {
  // Different swap sizes
  const swapSizes = [
    { amount: 1000, description: "Small Swap (1,000 wS)" },
    { amount: 5000, description: "Medium Swap (5,000 wS)" },
    { amount: 10000, description: "Large Swap (10,000 wS)" },
    { amount: 25000, description: "Very Large Swap (25,000 wS)" },
    { amount: 50000, description: "Whale Swap (50,000 wS)" },
    { amount: 100000, description: "Huge Whale Swap (100,000 wS)" }
  ];
  
  const results = [];
  
  swapSizes.forEach(swap => {
    // Calculate swap percentage 
    const swapPercentage = (swap.amount / TOTAL_WSONIC_LIQUIDITY) * 100;
    
    // Calculate minimum LP needed for full boost
    // Since max boost is when LP% >= swap%, we need LP amount that gives same percentage
    const minLPPercentage = Math.min(swapPercentage, MAX_LP_PERCENTAGE);
    const minLPAmount = Math.ceil((minLPPercentage / 100) * TOTAL_LP_SUPPLY);
    
    // Calculate base and boosted probabilities
    const baseProb = Math.min((swap.amount * BASE_PROBABILITY) / 100, MAX_PROBABILITY);
    const boostedProb = Math.min(baseProb * MAX_BOOST, MAX_PROBABILITY);
    
    results.push({
      swapAmount: swap.amount,
      swapPercentage: swapPercentage.toFixed(3) + "%",
      requiredLPAmount: minLPAmount,
      requiredLPPercentage: minLPPercentage.toFixed(3) + "%",
      baseProb: (baseProb * 100).toFixed(3) + "%",
      maxBoostedProb: (boostedProb * 100).toFixed(3) + "%",
      capped: boostedProb >= MAX_PROBABILITY ? "YES" : "NO",
      effectiveBoost: baseProb > 0 ? (boostedProb / baseProb).toFixed(2) + "x" : "N/A"
    });
  });
  
  return results;
}

// Run simulations
console.log("\n================ PERCENTAGE-BASED LP BOOST WITH 25% MAX PROBABILITY ================\n");
console.log(`Total LP Supply: ${TOTAL_LP_SUPPLY.toLocaleString()} tokens`);
console.log(`Total wSonic Liquidity: ${TOTAL_WSONIC_LIQUIDITY.toLocaleString()} wS`);
console.log(`Maximum LP Percentage Cap: ${MAX_LP_PERCENTAGE}%`);
console.log(`Maximum Probability: ${MAX_PROBABILITY * 100}%`);

// Calculate minimum LP required for maximum boost
const lpRequirements = calculateMinimumLPRequired();
console.log("\n================ MINIMUM LP REQUIRED FOR MAXIMUM BOOST ================\n");
console.table(lpRequirements);

// Simulate a user with fixed LP making increasingly larger swaps
console.log("\n================ USER WITH 5% LP MAKING INCREASINGLY LARGER SWAPS ================\n");
const increasingSwaps = simulateIncreasingSwaps();
console.table(increasingSwaps);

// Compare different swap sizes and LP percentages
const swapComparison = compareSwapSizes();
console.log("\n================ COMPARISON OF SWAP SIZES AND LP PERCENTAGES ================\n");
console.log("Sample of results (first 10 entries):");
console.table(swapComparison.slice(0, 10));

console.log("\n================ KEY POINTS ================\n");
console.log("1. Maximum probability is now capped at 25% (up from 10%)");
console.log("2. Users still need LP proportional to their swap size to get max boost");
console.log("3. LP holdings are capped at 10% of total supply for boost calculation");
console.log("4. The 25% cap is reached when making larger swaps with sufficient LP");
console.log("5. Users with 10% LP get maximum boost for all swaps up to ~10% of total liquidity");

console.log("\n================ IMPLEMENTATION NOTES ================\n");
console.log("To implement this in the smart contract:");
console.log("1. Change MAX_PROBABILITY from 10% to 25%");
console.log("2. Keep the boost calculation based on LP/swap ratio as before");
console.log("3. Ensure probabilities are capped at 25% maximum");
console.log("4. Keep the 10% LP percentage cap to prevent whale dominance"); 