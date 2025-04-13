/**
 * Percentage-Based LP Boost Simulation
 * 
 * This script simulates a boost system where:
 * 1. Boost is based on % of total LP supply rather than absolute amounts
 * 2. Maximum boost (2.5x) is given when LP % matches or exceeds swap % (up to 10% max)
 * 3. Boost is proportional to current swap amount, not overall trading volume
 */

// Simulation parameters
const TOTAL_LP_SUPPLY = 1000000;       // Total LP tokens in circulation
const TOTAL_WSONIC_LIQUIDITY = 5000000; // Total wSonic in the trading pool
const MAX_LP_PERCENTAGE = 10;          // Max % of LP considered (cap for boost calculation)

// Lottery parameters
const BASE_PROBABILITY = 0.001; // 0.1% per 100 wS
const MAX_PROBABILITY = 0.1;    // 10% max win probability
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
 * Compare various scenarios with percentage-based boosting
 */
function comparePercentageScenarios() {
  // Create test cases with percentages of LP supply
  const testCases = [
    { 
      name: "Tiny Swap (0.01%)", 
      swapAmount: 500, 
      swapPercentage: 0.01,
      lpScenarios: [
        { name: "No LP", lpPercentage: 0, lpAmount: 0, votePower: 0 },
        { name: "0.01% LP (Equal)", lpPercentage: 0.01, lpAmount: 100, votePower: 100 },
        { name: "0.1% LP (10x)", lpPercentage: 0.1, lpAmount: 1000, votePower: 1000 },
        { name: "1% LP (100x)", lpPercentage: 1, lpAmount: 10000, votePower: 10000 },
        { name: "10% LP (1000x)", lpPercentage: 10, lpAmount: 100000, votePower: 100000 }
      ]
    },
    { 
      name: "Small Swap (0.1%)", 
      swapAmount: 5000, 
      swapPercentage: 0.1,
      lpScenarios: [
        { name: "No LP", lpPercentage: 0, lpAmount: 0, votePower: 0 },
        { name: "0.01% LP (1/10)", lpPercentage: 0.01, lpAmount: 100, votePower: 100 },
        { name: "0.1% LP (Equal)", lpPercentage: 0.1, lpAmount: 1000, votePower: 1000 },
        { name: "1% LP (10x)", lpPercentage: 1, lpAmount: 10000, votePower: 10000 },
        { name: "10% LP (100x)", lpPercentage: 10, lpAmount: 100000, votePower: 100000 }
      ]
    },
    { 
      name: "Medium Swap (1%)", 
      swapAmount: 50000, 
      swapPercentage: 1,
      lpScenarios: [
        { name: "No LP", lpPercentage: 0, lpAmount: 0, votePower: 0 },
        { name: "0.1% LP (1/10)", lpPercentage: 0.1, lpAmount: 1000, votePower: 1000 },
        { name: "1% LP (Equal)", lpPercentage: 1, lpAmount: 10000, votePower: 10000 },
        { name: "5% LP (5x)", lpPercentage: 5, lpAmount: 50000, votePower: 50000 },
        { name: "10% LP (10x)", lpPercentage: 10, lpAmount: 100000, votePower: 100000 }
      ]
    },
    { 
      name: "Large Swap (5%)", 
      swapAmount: 250000, 
      swapPercentage: 5,
      lpScenarios: [
        { name: "No LP", lpPercentage: 0, lpAmount: 0, votePower: 0 },
        { name: "0.5% LP (1/10)", lpPercentage: 0.5, lpAmount: 5000, votePower: 5000 },
        { name: "1% LP (1/5)", lpPercentage: 1, lpAmount: 10000, votePower: 10000 },
        { name: "5% LP (Equal)", lpPercentage: 5, lpAmount: 50000, votePower: 50000 },
        { name: "10% LP (2x)", lpPercentage: 10, lpAmount: 100000, votePower: 100000 }
      ]
    },
    { 
      name: "Whale Swap (10%)", 
      swapAmount: 500000, 
      swapPercentage: 10,
      lpScenarios: [
        { name: "No LP", lpPercentage: 0, lpAmount: 0, votePower: 0 },
        { name: "1% LP (1/10)", lpPercentage: 1, lpAmount: 10000, votePower: 10000 },
        { name: "5% LP (1/2)", lpPercentage: 5, lpAmount: 50000, votePower: 50000 },
        { name: "10% LP (Equal)", lpPercentage: 10, lpAmount: 100000, votePower: 100000 },
        { name: "15% LP (1.5x)", lpPercentage: 15, lpAmount: 150000, votePower: 150000 }
      ]
    }
  ];
  
  // Results for each swap size
  const results = {};
  
  // For each swap scenario
  testCases.forEach(swapCase => {
    console.log(`\n======== ${swapCase.name} (${swapCase.swapAmount} wS, ${swapCase.swapPercentage}% of total) ========`);
    
    const scenarioResults = [];
    
    // Calculate base probability for this swap
    const baseProbability = Math.min((swapCase.swapAmount * BASE_PROBABILITY) / 100, MAX_PROBABILITY);
    
    // For each LP holding scenario
    swapCase.lpScenarios.forEach(lpCase => {
      // Calculate boost using the percentage-based formula
      const boost = calculatePercentageBoost(swapCase.swapAmount, lpCase.lpAmount, lpCase.votePower);
      
      // Calculate boosted probability
      const boostedProbability = Math.min(baseProbability * boost, MAX_PROBABILITY);
      
      // Add to results
      scenarioResults.push({
        lpScenario: lpCase.name,
        lpPercentage: lpCase.lpPercentage.toFixed(2) + "%",
        lpAmount: lpCase.lpAmount,
        ratioToSwap: (lpCase.lpPercentage / swapCase.swapPercentage).toFixed(2) + "x",
        boost: boost.toFixed(2) + "x",
        baseProbability: (baseProbability * 100).toFixed(3) + "%",
        boostedProbability: (boostedProbability * 100).toFixed(3) + "%"
      });
    });
    
    console.table(scenarioResults);
    results[swapCase.name] = scenarioResults;
  });
  
  return results;
}

/**
 * Compare current flat boost vs percentage-based boost models
 */
function compareBoostModels() {
  // Test cases covering various swap and LP percentages
  const testCases = [
    { swapAmount: 500, lpAmount: 0, votePower: 0, name: "Tiny swap (0.01%), No LP" },
    { swapAmount: 500, lpAmount: 100, votePower: 100, name: "Tiny swap (0.01%), Equal % LP (0.01%)" },
    { swapAmount: 500, lpAmount: 10000, votePower: 10000, name: "Tiny swap (0.01%), 100x LP (1%)" },
    { swapAmount: 50000, lpAmount: 1000, votePower: 1000, name: "Medium swap (1%), 1/10 LP (0.1%)" },
    { swapAmount: 50000, lpAmount: 10000, votePower: 10000, name: "Medium swap (1%), Equal % LP (1%)" },
    { swapAmount: 500000, lpAmount: 10000, votePower: 10000, name: "Whale swap (10%), 1/10 LP (1%)" },
    { swapAmount: 500000, lpAmount: 100000, votePower: 100000, name: "Whale swap (10%), Equal % LP (10%)" }
  ];
  
  // Results
  const comparison = [];
  
  // Calculate percentages for each case
  testCases.forEach(test => {
    const swapPercentage = (test.swapAmount / TOTAL_WSONIC_LIQUIDITY) * 100;
    const lpPercentage = Math.min((test.lpAmount / TOTAL_LP_SUPPLY) * 100, MAX_LP_PERCENTAGE);
    
    // Calculate base probability
    const baseProbability = Math.min((test.swapAmount * BASE_PROBABILITY) / 100, MAX_PROBABILITY);
    
    // Current flat boost model (all LP holders get full 2.5x)
    const flatBoost = test.lpAmount > 0 ? MAX_BOOST : 1.0;
    const flatProbability = Math.min(baseProbability * flatBoost, MAX_PROBABILITY);
    
    // Percentage-based proportional boost model
    const percentageBoost = calculatePercentageBoost(test.swapAmount, test.lpAmount, test.votePower);
    const percentageProbability = Math.min(baseProbability * percentageBoost, MAX_PROBABILITY);
    
    comparison.push({
      scenario: test.name,
      swapAmount: test.swapAmount,
      swapPercentage: swapPercentage.toFixed(2) + "%",
      lpAmount: test.lpAmount,
      lpPercentage: lpPercentage.toFixed(2) + "%",
      percentageRatio: (lpPercentage / swapPercentage).toFixed(2) + "x",
      currentBoost: flatBoost.toFixed(2) + "x",
      currentProbability: (flatProbability * 100).toFixed(3) + "%",
      percentageBoost: percentageBoost.toFixed(2) + "x",
      percentageProbability: (percentageProbability * 100).toFixed(3) + "%"
    });
  });
  
  return comparison;
}

// Run simulations
console.log("\n================ PERCENTAGE-BASED LP BOOST MODEL ================\n");
console.log(`Total LP Supply: ${TOTAL_LP_SUPPLY.toLocaleString()} tokens`);
console.log(`Total wSonic Liquidity: ${TOTAL_WSONIC_LIQUIDITY.toLocaleString()} wS`);
console.log(`Maximum LP Percentage Cap: ${MAX_LP_PERCENTAGE}%`);

// Run comparison of current vs percentage-based models
const modelComparison = compareBoostModels();
console.log("\n================ CURRENT VS PERCENTAGE-BASED BOOST COMPARISON ================\n");
console.table(modelComparison);

// Run detailed percentage-based scenarios
console.log("\n================ DETAILED PERCENTAGE-BASED SCENARIOS ================");
const scenarioResults = comparePercentageScenarios();

console.log("\n================ KEY ADVANTAGES ================\n");
console.log("1. Based on % of total LP supply rather than absolute amounts");
console.log("2. Scales naturally as the protocol grows");
console.log("3. Maximum boost when LP % matches or exceeds swap % (up to 10% cap)");
console.log("4. Whales need proportionally more LP to get the same boost");
console.log("5. Rewards users who contribute significant liquidity to the protocol");

console.log("\n================ IMPLEMENTATION NOTES ================\n");
console.log("To implement this in the smart contract:");
console.log("1. Track total LP supply in the boost calculation function");
console.log("2. Calculate percentage of LP supply the user holds");
console.log("3. Calculate percentage of total liquidity represented by the current swap");
console.log("4. Apply the boost formula: 1.0 + (MAX_BOOST - 1.0) * voteRatio * min(lpPercentage/swapPercentage, 1.0)");
console.log("5. Cap lpPercentage at 10% to prevent whale dominance"); 