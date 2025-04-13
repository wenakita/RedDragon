/**
 * Simplified Analysis of Maximum Win Probability Requirements
 */

// System parameters
const TOTAL_LP_SUPPLY = 1000000;       // Total LP tokens in circulation
const TOTAL_WSONIC_LIQUIDITY = 5000000; // Total wSonic in the trading pool
const MAX_LP_PERCENTAGE = 10;          // Max % of LP considered (cap for boost calculation)
const MAX_PROBABILITY = 0.04;          // 4% max win probability
const MAX_BOOSTED_PROBABILITY = 0.10;  // 10% max win probability with boost
const MAX_BOOST = 2.5;                 // Maximum 2.5x boost
const BASE_PROBABILITY = 0.0004;       // 0.04% per 100 wS

/**
 * Calculate requirements for different swap sizes
 */
function analyzeRequirements() {
  // Define typical swap sizes
  const swapSizes = [
    1000,    // 1,000 wS (small)
    5000,    // 5,000 wS (medium)
    10000,   // 10,000 wS (large - 10% base probability)
    25000,   // 25,000 wS (very large - max probability without boost)
    50000    // 50,000 wS (whale size)
  ];
  
  const results = [];
  
  swapSizes.forEach(swapAmount => {
    // Calculate base probability
    const baseProb = Math.min((swapAmount * BASE_PROBABILITY) / 100, MAX_PROBABILITY);
    
    // Calculate if max probability is possible
    const maxBoostedProb = Math.min(baseProb * MAX_BOOST, MAX_BOOSTED_PROBABILITY);
    const canReachMax = maxBoostedProb >= MAX_BOOSTED_PROBABILITY;
    
    // Calculate minimum boost needed to hit max
    let minBoostNeeded;
    if (baseProb >= MAX_BOOSTED_PROBABILITY) {
      minBoostNeeded = "No boost needed";
    } else if (baseProb > 0) {
      minBoostNeeded = Math.min(MAX_BOOSTED_PROBABILITY / baseProb, MAX_BOOST);
      minBoostNeeded = minBoostNeeded.toFixed(2) + "x";
    } else {
      minBoostNeeded = "Impossible";
    }
    
    // Calculate LP requirements
    const swapPercentage = (swapAmount / TOTAL_WSONIC_LIQUIDITY) * 100;
    const lpPercentageNeeded = Math.min(swapPercentage, MAX_LP_PERCENTAGE);
    const lpAmountNeeded = Math.round((lpPercentageNeeded / 100) * TOTAL_LP_SUPPLY);
    
    // Calculate years of locking needed for full voting power
    const yearsNeeded = canReachMax ? "Up to 4 years" : "N/A";
    
    results.push({
      swapAmount: swapAmount.toLocaleString() + " wS",
      baseProb: (baseProb * 100).toFixed(2) + "%",
      canReachMax,
      maxBoostedProb: (maxBoostedProb * 100).toFixed(2) + "%",
      minBoostNeeded,
      lpAmountNeeded: lpAmountNeeded.toLocaleString() + " LP",
      lpPercentageNeeded: lpPercentageNeeded.toFixed(3) + "%",
      yearsNeeded,
      rarity: getRarityLevel(lpPercentageNeeded, swapAmount)
    });
  });
  
  return results;
}

/**
 * Determine how rare this scenario would be
 */
function getRarityLevel(lpPercentage, swapAmount) {
  // Estimate rarity based on LP percentage and swap size
  if (swapAmount >= 25000) {
    return "EXTREMELY RARE"; // Very large swaps are rare
  } else if (lpPercentage >= 5) {
    return "VERY RARE"; // Very few users hold this much LP
  } else if (lpPercentage >= 1) {
    return "RARE"; // Few users hold this much LP
  } else if (lpPercentage >= 0.1) {
    return "UNCOMMON"; // Some users hold this much LP
  } else {
    return "COMMON"; // More common scenario
  }
}

/**
 * Calculate percentage of users who might reach max probability
 */
function estimateUserPercentage() {
  // Estimate based on typical DeFi user behavior
  
  // Swap size distribution
  const largeSwapUsers = 10; // % of users making 10k+ wS swaps
  
  // LP holding distribution
  const significantLpUsers = 15; // % of users holding >0.1% of LP supply
  
  // Locking duration distribution
  const longTermLockers = 6; // % of users locking for >1 year
  
  // Combined percentage (all three conditions needed)
  // This is a very rough approximation
  const combinedPercentage = (largeSwapUsers / 100) * (significantLpUsers / 100) * (longTermLockers / 100) * 100;
  
  return {
    swapDistribution: {
      largeSwapUsers: largeSwapUsers + "%",
      mediumSwapUsers: "15%",
      smallSwapUsers: "75%"
    },
    lpDistribution: {
      significantLpUsers: significantLpUsers + "%",
      smallLpUsers: "35%",
      noLpUsers: "50%"
    },
    lockingDistribution: {
      longTermLockers: longTermLockers + "%",
      mediumTermLockers: "14%",
      shortTermLockers: "10%",
      nonLockers: "70%"
    },
    maxProbabilityUsers: {
      percentage: combinedPercentage.toFixed(3) + "%",
      frequency: combinedPercentage <= 0.1 ? "VERY RARE" : 
                 combinedPercentage <= 0.5 ? "RARE" : 
                 combinedPercentage <= 1 ? "UNCOMMON" : "COMMON"
    }
  };
}

// Run analysis
console.log("\n================ REQUIREMENTS FOR REACHING 10% WIN PROBABILITY ================\n");
const requirements = analyzeRequirements();
console.table(requirements);

console.log("\n================ ESTIMATED PERCENTAGE OF USERS WHO COULD REACH 10% ================\n");
const userEstimates = estimateUserPercentage();
console.log("Swap Size Distribution:");
console.table(userEstimates.swapDistribution);

console.log("\nLP Holding Distribution:");
console.table(userEstimates.lpDistribution);

console.log("\nLocking Duration Distribution:");
console.table(userEstimates.lockingDistribution);

console.log("\nUsers Who Could Reach Maximum 10% Probability:");
console.table(userEstimates.maxProbabilityUsers);

console.log("\n================ CONCLUSION ================\n");
console.log(`Based on these estimates, approximately ${userEstimates.maxProbabilityUsers.percentage} of users`);
console.log("could potentially achieve the maximum 10% win probability.");
console.log("\nThis requires a combination of:");
console.log("1. Large swap (≥10,000 wS)");
console.log("2. Significant LP holdings (proportional to swap amount)");
console.log("3. Long-term locking (to maximize voting power)");
console.log("\nThe 10% probability cap provides a strong incentive for users to provide LP and");
console.log("lock for long periods, while being rare enough to maintain the lottery excitement."); 