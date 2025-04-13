/**
 * Maximum Probability Likelihood Analysis
 * 
 * This script analyzes how likely users are to achieve the maximum 25% win probability
 * based on realistic user behavior, LP distribution, and swap amounts.
 */

// System parameters
const TOTAL_LP_SUPPLY = 1000000;       // Total LP tokens in circulation
const TOTAL_WSONIC_LIQUIDITY = 5000000; // Total wSonic in the trading pool
const MAX_LP_PERCENTAGE = 10;          // Max % of LP considered (cap for boost calculation)
const MAX_PROBABILITY = 0.25;          // 25% max win probability
const MAX_BOOST = 2.5;                 // Maximum 2.5x boost
const BASE_PROBABILITY = 0.001;        // 0.1% per 100 wS

/**
 * Requirements to hit 25% win probability
 */
function analyzeMaxProbabilityRequirements() {
  // To hit 25% probability, need base probability of at least 10% (which gets 2.5x boost)
  // Or any base probability with sufficient boost to reach 25%
  
  // Minimum wS amount needed for 10% base probability
  const minWsForMaxProb = (0.1 / BASE_PROBABILITY) * 100;
  
  // Define realistic swap amounts users might make
  const typicalSwapAmounts = [
    { amount: 1000, description: "Small Swap (1,000 wS)" },
    { amount: 5000, description: "Medium Swap (5,000 wS)" },
    { amount: 10000, description: "Large Swap (10,000 wS)" },
    { amount: 25000, description: "Very Large Swap (25,000 wS)" },
    { amount: 50000, description: "Whale Swap (50,000 wS)" }
  ];
  
  const results = [];
  
  // For each swap amount, analyze if and how 25% probability can be achieved
  typicalSwapAmounts.forEach(swap => {
    // Calculate base probability
    const baseProb = Math.min((swap.amount * BASE_PROBABILITY) / 100, MAX_PROBABILITY);
    
    // Check if this amount can achieve 25% with maximum boost
    const maxBoostedProb = Math.min(baseProb * MAX_BOOST, MAX_PROBABILITY);
    const canHit25Pct = maxBoostedProb >= 0.25;
    
    // Calculate minimum boost needed to reach 25%
    const minBoostFor25Pct = baseProb > 0 ? Math.min(0.25 / baseProb, MAX_BOOST) : "N/A";
    
    // Calculate LP percentage needed for full boost
    const swapPercentage = (swap.amount / TOTAL_WSONIC_LIQUIDITY) * 100;
    const requiredLpPercentage = Math.min(swapPercentage, MAX_LP_PERCENTAGE);
    const requiredLpAmount = Math.ceil((requiredLpPercentage / 100) * TOTAL_LP_SUPPLY);
    
    results.push({
      swapAmount: swap.amount,
      swapDescription: swap.description,
      baseProb: (baseProb * 100).toFixed(2) + "%",
      maxBoostedProb: (maxBoostedProb * 100).toFixed(2) + "%",
      canHit25Pct: canHit25Pct ? "YES" : "NO",
      minBoostNeeded: typeof minBoostFor25Pct === "number" ? 
                        minBoostFor25Pct.toFixed(2) + "x" : minBoostFor25Pct,
      requiredLpAmount: requiredLpAmount.toLocaleString(),
      requiredLpPercentage: requiredLpPercentage.toFixed(3) + "%",
      difficulty: canHit25Pct ? 
                   (requiredLpPercentage > 5 ? "VERY HARD" : 
                    requiredLpPercentage > 1 ? "HARD" : 
                    requiredLpPercentage > 0.1 ? "MODERATE" : "ACHIEVABLE") :
                   "IMPOSSIBLE"
    });
  });
  
  return results;
}

/**
 * LP Distribution Analysis
 * Analyzes likelihood of users holding sufficient LP to qualify for maximum boost
 */
function analyzeLpDistribution() {
  // Define a realistic LP distribution based on typical DeFi protocols
  // This is an assumption of how LP tokens might be distributed
  const lpDistribution = [
    { range: "0% (No LP)", minPct: 0, maxPct: 0, userPercentage: 50 }, // 50% of users hold no LP
    { range: "0-0.01% of LP", minPct: 0.000001, maxPct: 0.01, userPercentage: 20 }, // 20% hold tiny amounts
    { range: "0.01-0.1% of LP", minPct: 0.01, maxPct: 0.1, userPercentage: 15 }, // 15% hold small amounts
    { range: "0.1-1% of LP", minPct: 0.1, maxPct: 1, userPercentage: 10 }, // 10% hold moderate amounts
    { range: "1-5% of LP", minPct: 1, maxPct: 5, userPercentage: 4 }, // 4% hold large amounts
    { range: "5-10% of LP", minPct: 5, maxPct: 10, userPercentage: 0.9 }, // 0.9% hold very large amounts
    { range: ">10% of LP", minPct: 10, maxPct: 100, userPercentage: 0.1 } // 0.1% are whales with >10%
  ];
  
  return lpDistribution;
}

/**
 * Swap Size Analysis
 * Analyzes the distribution of swap sizes users might make
 */
function analyzeSwapSizeDistribution() {
  // Define a realistic distribution of swap sizes based on typical DEX activity
  const swapDistribution = [
    { range: "< 1,000 wS", minAmount: 0, maxAmount: 1000, userPercentage: 45 }, // 45% make tiny swaps
    { range: "1,000-5,000 wS", minAmount: 1000, maxAmount: 5000, userPercentage: 30 }, // 30% make small swaps
    { range: "5,000-10,000 wS", minAmount: 5000, maxAmount: 10000, userPercentage: 15 }, // 15% make medium swaps
    { range: "10,000-25,000 wS", minAmount: 10000, maxAmount: 25000, userPercentage: 7 }, // 7% make large swaps
    { range: "25,000-50,000 wS", minAmount: 25000, maxAmount: 50000, userPercentage: 2 }, // 2% make very large swaps
    { range: ">50,000 wS", minAmount: 50000, maxAmount: 1000000, userPercentage: 1 } // 1% are whales making huge swaps
  ];
  
  return swapDistribution;
}

/**
 * Lock Duration Analysis
 * Analyzes the distribution of how long users typically lock their tokens
 */
function analyzeLockDurationDistribution() {
  // Define a realistic distribution of lock durations users might choose
  const lockDistribution = [
    { range: "No Lock", durationMonths: 0, percentageOfMaxVotePower: 0, userPercentage: 70 }, // 70% don't lock
    { range: "1-3 months", durationMonths: 3, percentageOfMaxVotePower: 6.25, userPercentage: 10 }, // 10% lock short term
    { range: "3-6 months", durationMonths: 6, percentageOfMaxVotePower: 12.5, userPercentage: 8 }, // 8% lock medium term
    { range: "6-12 months", durationMonths: 12, percentageOfMaxVotePower: 25, userPercentage: 6 }, // 6% lock up to a year
    { range: "1-2 years", durationMonths: 24, percentageOfMaxVotePower: 50, userPercentage: 3 }, // 3% lock 1-2 years
    { range: "2-3 years", durationMonths: 36, percentageOfMaxVotePower: 75, userPercentage: 2 }, // 2% lock 2-3 years
    { range: "3-4 years", durationMonths: 48, percentageOfMaxVotePower: 100, userPercentage: 1 } // 1% lock full 4 years
  ];
  
  return lockDistribution;
}

/**
 * Calculate combined probabilities of users achieving maximum boost based on distributions
 */
function calculateMaxProbabilityLikelihood() {
  // Get distributions
  const lpDistribution = analyzeLpDistribution();
  const swapDistribution = analyzeSwapSizeDistribution();
  const lockDistribution = analyzeLockDurationDistribution();
  
  // Calculate combined probabilities for different scenarios
  
  // Scenario 1: Medium swap (10,000 wS) with varying LP and lock durations
  const scenarios = [];
  
  swapDistribution.forEach(swap => {
    // For each swap size, check requirements to reach max probability
    const swapAmount = (swap.minAmount + swap.maxAmount) / 2; // Use average of range
    const baseProb = Math.min((swapAmount * BASE_PROBABILITY) / 100, MAX_PROBABILITY);
    const swapPercentage = (swapAmount / TOTAL_WSONIC_LIQUIDITY) * 100;
    
    lpDistribution.forEach(lp => {
      // Skip the no LP category since it can't reach max boost
      if (lp.maxPct === 0) return;
      
      // Use middle of range for calculation
      const lpPercentage = Math.min((lp.minPct + lp.maxPct) / 2, MAX_LP_PERCENTAGE);
      const lpToSwapRatio = lpPercentage / swapPercentage;
      
      lockDistribution.forEach(lock => {
        // Skip the no lock category since it has no boost
        if (lock.durationMonths === 0) return;
        
        // Calculate effective voting power based on lock duration
        const effectiveVotePower = lock.percentageOfMaxVotePower / 100;
        
        // Calculate boost with these parameters
        const boost = 1.0 + (MAX_BOOST - 1.0) * effectiveVotePower * Math.min(lpToSwapRatio, 1.0);
        const effectiveBoost = Math.min(boost, MAX_BOOST);
        
        // Calculate final probability
        const finalProb = Math.min(baseProb * effectiveBoost, MAX_PROBABILITY);
        
        // Calculate percentage of users who might be in this scenario
        // This is a very rough approximation based on distribution percentages
        const userPctInScenario = (swap.userPercentage / 100) * (lp.userPercentage / 100) * (lock.userPercentage / 100) * 100;
        
        scenarios.push({
          swapRange: swap.range,
          lpRange: lp.range,
          lockRange: lock.range,
          baseProb: (baseProb * 100).toFixed(2) + "%",
          effectiveBoost: effectiveBoost.toFixed(2) + "x",
          finalProb: (finalProb * 100).toFixed(2) + "%",
          reachedMax: finalProb >= 0.25 ? "YES" : "NO",
          approxUserPct: userPctInScenario.toFixed(4) + "%",
          swapPct: swap.userPercentage,
          lpPct: lp.userPercentage,
          lockPct: lock.userPercentage
        });
      });
    });
  });
  
  // Calculate total probability of users achieving maximum 25% probability
  const scenariosReachingMax = scenarios.filter(s => s.reachedMax === "YES");
  const totalPctReachingMax = scenariosReachingMax.reduce((sum, s) => sum + parseFloat(s.approxUserPct), 0);
  
  return {
    detailedScenarios: scenarios,
    scenariosReachingMax: scenariosReachingMax,
    totalPctReachingMax: totalPctReachingMax,
    summary: {
      totalUsers: "100%",
      usersReachingMax: totalPctReachingMax.toFixed(4) + "%",
      scenariosCount: scenarios.length,
      maxProbScenarios: scenariosReachingMax.length
    }
  };
}

// Run the analysis
console.log("\n================ REQUIREMENTS FOR 25% WIN PROBABILITY ================\n");
const requirements = analyzeMaxProbabilityRequirements();
console.table(requirements);

console.log("\n================ TYPICAL LP DISTRIBUTION ================\n");
const lpDistribution = analyzeLpDistribution();
console.table(lpDistribution);

console.log("\n================ TYPICAL SWAP SIZE DISTRIBUTION ================\n");
const swapDistribution = analyzeSwapSizeDistribution();
console.table(swapDistribution);

console.log("\n================ TYPICAL LOCK DURATION DISTRIBUTION ================\n");
const lockDistribution = analyzeLockDurationDistribution();
console.table(lockDistribution);

console.log("\n================ LIKELIHOOD OF REACHING 25% PROBABILITY ================\n");
const likelihoodResults = calculateMaxProbabilityLikelihood();
console.log("SUMMARY:");
console.table(likelihoodResults.summary);

console.log("\nTop 5 most common scenarios reaching maximum probability:");
console.table(likelihoodResults.scenariosReachingMax
  .sort((a, b) => parseFloat(b.approxUserPct) - parseFloat(a.approxUserPct))
  .slice(0, 5));

console.log("\n================ CONCLUSION ================\n");
console.log(`Based on realistic distributions, approximately ${likelihoodResults.summary.usersReachingMax} of users`);
console.log("would be able to achieve the maximum 25% win probability.");
console.log("\nThis is a relatively rare occurrence, requiring a combination of:");
console.log("1. Sufficiently large swap (generally 10,000+ wS)");
console.log("2. Significant LP holdings (generally at least 0.1-1% of total LP supply)");
console.log("3. Long lock duration (generally 1+ years)");
console.log("\nThe 25% cap is therefore appropriate as it provides a strong incentive");
console.log("for LP provision and long-term locking without being easily achievable");
console.log("by most users, maintaining the lottery-like excitement of the system."); 