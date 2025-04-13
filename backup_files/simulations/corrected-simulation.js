/**
 * Corrected LP Boost Simulation
 * 
 * This simulation fixes the base probability cap at 10% while allowing 
 * boosted probability to reach 25%, more accurately modeling the system.
 */

const { formatEther, parseEther } = require('ethers');

// System parameters
const TOTAL_LP_SUPPLY = 1000000;       // Total LP tokens in circulation
const TOTAL_WSONIC_LIQUIDITY = 5000000; // Total wSonic in the trading pool
const MAX_LP_PERCENTAGE = 10;          // Max % of LP considered (cap for boost calculation)
const BASE_PROBABILITY_CAP = 0.1;      // 10% max base probability
const MAX_PROBABILITY = 0.25;          // 25% max boosted probability
const MAX_BOOST = 2.5;                 // Maximum 2.5x boost
const BASE_PROBABILITY = 0.001;        // 0.1% per 100 wS

/**
 * Analyze win probability for different swap sizes
 */
function analyzeSwapSizes() {
  // Define a range of swap sizes to analyze
  const swapSizes = [
    1000,     // 1,000 wS (small swap)
    5000,     // 5,000 wS (medium swap)
    10000,    // 10,000 wS (exactly 10% base probability)
    15000,    // 15,000 wS (would be >10% but gets capped)
    25000,    // 25,000 wS (similar to 10k with cap)
    50000,    // 50,000 wS (large whale swap)
    100000    // 100,000 wS (massive whale swap)
  ];
  
  const results = [];
  
  swapSizes.forEach(swapAmount => {
    // Calculate uncapped base probability
    const uncappedBaseProb = (swapAmount * BASE_PROBABILITY) / 100;
    
    // Apply 10% cap to base probability
    const baseProb = Math.min(uncappedBaseProb, BASE_PROBABILITY_CAP);
    
    // Calculate maximum boosted probability with 2.5x boost
    const maxBoostedProb = Math.min(baseProb * MAX_BOOST, MAX_PROBABILITY);
    
    // Calculate swap percentage of total liquidity
    const swapPercentage = (swapAmount / TOTAL_WSONIC_LIQUIDITY) * 100;
    
    // Check if there's any incentive to provide LP for this swap size
    const incentiveToBoost = maxBoostedProb > baseProb;
    
    // Calculate minimum LP needed for full boost
    const minLpPercentage = Math.min(swapPercentage, MAX_LP_PERCENTAGE);
    const minLpAmount = Math.ceil((minLpPercentage / 100) * TOTAL_LP_SUPPLY);
    
    // Analyze if swapping more would provide any benefit
    const swappingMoreBenefit = uncappedBaseProb > BASE_PROBABILITY_CAP ? 
      "No benefit (base probability capped)" : 
      "Increases base probability";
    
    results.push({
      swapAmount: swapAmount.toLocaleString() + " wS",
      uncappedBaseProb: (uncappedBaseProb * 100).toFixed(2) + "%",
      actualBaseProb: (baseProb * 100).toFixed(2) + "%",
      maxBoostedProb: (maxBoostedProb * 100).toFixed(2) + "%",
      incentiveToBoost: incentiveToBoost ? "Yes" : "No",
      lpRequired: minLpAmount.toLocaleString() + " LP",
      lpPercentage: minLpPercentage.toFixed(3) + "%",
      swappingMoreBenefit,
      boostBenefit: ((maxBoostedProb - baseProb) * 100).toFixed(2) + "%"
    });
  });
  
  return results;
}

/**
 * Analyze boost benefit for different swap amounts
 */
function analyzeBoostBenefit() {
  // Define swap scenarios
  const swapScenarios = [
    { amount: 1000, description: "Small Swap" },
    { amount: 10000, description: "Medium Swap (10% base)" },
    { amount: 50000, description: "Large Swap (10% base, capped)" }
  ];
  
  // Define various boost levels
  const boostLevels = [
    { factor: 1.0, lp: "No LP", description: "No boost" },
    { factor: 1.2, lp: "Small LP", description: "20% boost" },
    { factor: 1.5, lp: "Medium LP", description: "50% boost" },
    { factor: 2.0, lp: "Large LP", description: "2x boost" },
    { factor: 2.5, lp: "Maximum LP", description: "2.5x boost" }
  ];
  
  const results = [];
  
  swapScenarios.forEach(swap => {
    // Calculate base probability (with 10% cap)
    const baseProb = Math.min((swap.amount * BASE_PROBABILITY) / 100, BASE_PROBABILITY_CAP);
    
    boostLevels.forEach(boost => {
      // Calculate boosted probability (with 25% cap)
      const boostedProb = Math.min(baseProb * boost.factor, MAX_PROBABILITY);
      
      // Calculate absolute improvement
      const absoluteImprovement = boostedProb - baseProb;
      
      // Calculate percentage improvement
      const percentageImprovement = ((boostedProb / baseProb) - 1) * 100;
      
      results.push({
        swapAmount: swap.amount.toLocaleString() + " wS",
        swapType: swap.description,
        baseProb: (baseProb * 100).toFixed(2) + "%",
        boostFactor: boost.factor.toFixed(1) + "x",
        lpLevel: boost.lp,
        boostedProb: (boostedProb * 100).toFixed(2) + "%",
        absoluteIncrease: (absoluteImprovement * 100).toFixed(2) + "%",
        percentageIncrease: percentageImprovement.toFixed(0) + "%",
        worthwhile: absoluteImprovement > 0 ? "Yes" : "No"
      });
    });
  });
  
  return results;
}

/**
 * Analyze expected value and economic incentives
 */
function analyzeIncentives() {
  // Assume average jackpot size
  const avgJackpot = 10000; // Average jackpot size in wS
  
  // Define scenarios
  const scenarios = [
    { swap: 1000, boost: 1.0, description: "Small swap, no boost" },
    { swap: 1000, boost: 2.5, description: "Small swap, max boost" },
    { swap: 10000, boost: 1.0, description: "Medium swap, no boost" },
    { swap: 10000, boost: 2.5, description: "Medium swap, max boost" },
    { swap: 50000, boost: 1.0, description: "Large swap, no boost" },
    { swap: 50000, boost: 2.5, description: "Large swap, max boost" }
  ];
  
  const results = [];
  
  scenarios.forEach(scenario => {
    // Calculate win probability
    const baseProb = Math.min((scenario.swap * BASE_PROBABILITY) / 100, BASE_PROBABILITY_CAP);
    const winProb = Math.min(baseProb * scenario.boost, MAX_PROBABILITY);
    
    // Calculate expected value per swap
    const expectedValue = winProb * avgJackpot;
    
    // Calculate expected value relative to swap amount
    const relativeEV = (expectedValue / scenario.swap) * 100;
    
    // Calculate number of swaps until expected win
    const swapsUntilWin = 1 / winProb;
    
    // Calculate total amount swapped until expected win
    const amountUntilWin = swapsUntilWin * scenario.swap;
    
    results.push({
      scenario: scenario.description,
      swapAmount: scenario.swap.toLocaleString() + " wS",
      boostLevel: scenario.boost.toFixed(1) + "x",
      winProbability: (winProb * 100).toFixed(2) + "%",
      expectedValuePerSwap: expectedValue.toFixed(2) + " wS",
      expectedReturnRate: relativeEV.toFixed(2) + "%",
      avgSwapsUntilWin: swapsUntilWin.toFixed(1),
      avgAmountUntilWin: amountUntilWin.toLocaleString() + " wS"
    });
  });
  
  return results;
}

// Run analysis
console.log("\n================ SWAP SIZE ANALYSIS ================\n");
console.log("Base Probability Cap: 10%");
console.log("Maximum Boosted Probability: 25%");
console.log("Maximum Boost Factor: 2.5x\n");

const swapAnalysis = analyzeSwapSizes();
console.table(swapAnalysis);

console.log("\n================ BOOST BENEFIT ANALYSIS ================\n");
const boostAnalysis = analyzeBoostBenefit();
console.table(boostAnalysis);

console.log("\n================ ECONOMIC INCENTIVES ANALYSIS ================\n");
const incentiveAnalysis = analyzeIncentives();
console.table(incentiveAnalysis);

console.log("\n================ KEY FINDINGS ================\n");
console.log("1. Base probability caps at 10% for all swaps ≥10,000 wS");
console.log("2. There is NO direct incentive to swap more than 10,000 wS for lottery purposes");
console.log("3. The 2.5x boost creates significant value for all swap sizes");
console.log("4. With max boost, users can reach up to 25% win probability on large swaps");
console.log("5. The LP boost system creates an ongoing incentive for large swappers to provide LP");
console.log("\nFor optimal user experience:");
console.log("- The 10% cap on base probability creates a clear 'sweet spot' at 10,000 wS");
console.log("- The 25% cap on boosted probability ensures boost remains valuable at all swap sizes");
console.log("- This system makes 'playing optimally' easier for users to understand");

// Main simulation function
async function main() {
  console.log("=== REDDRAGON LOTTERY SYSTEM SIMULATION (CORRECTED) ===");
  console.log("System parameters:");
  console.log(`- Total LP Supply: ${TOTAL_LP_SUPPLY}`);
  console.log(`- Total wSonic Liquidity: ${TOTAL_WSONIC_LIQUIDITY}`);
  console.log(`- Base Probability Cap: ${BASE_PROBABILITY_CAP * 100}%`);
  console.log(`- Maximum Win Probability: ${MAX_PROBABILITY * 100}%`);
  console.log(`- Maximum Boost Factor: ${MAX_BOOST}x`);
  
  // Run analyses
  analyzeSwapSizes();
  analyzeBoostBenefit();
  analyzeIncentives();
  
  console.log("\n=== KEY FINDINGS ===");
  console.log("1. Base probability is capped at 10% - swaps over 10,000 wS do not increase lottery chances");
  console.log("2. Maximum achievable win probability is 25% (with max boost)");
  console.log("3. LP provision and voting power provide significant boost benefits");
  console.log("4. Optimal strategy: swap 10,000 wS + provide LP + lock tokens for voting power");
}

// Execute main function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 