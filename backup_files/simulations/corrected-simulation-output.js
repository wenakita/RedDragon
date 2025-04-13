/**
 * Simplified LP Boost Simulation with Formatted Output
 * 
 * This simulation shows key metrics about the lottery system with:
 * - 10% cap on base probability
 * - 25% cap on total boosted probability
 * - 2.5x maximum boost factor
 */

// System parameters
const TOTAL_LP_SUPPLY = 1000000;       // Total LP tokens in circulation
const TOTAL_WSONIC_LIQUIDITY = 5000000; // Total wSonic in the trading pool
const MAX_LP_PERCENTAGE = 10;          // Max % of LP considered (cap for boost calculation)
const BASE_PROBABILITY_CAP = 0.1;      // 10% max base probability cap
const MAX_PROBABILITY = 0.25;          // 25% max boosted probability 
const MAX_BOOST = 2.5;                 // Maximum 2.5x boost
const BASE_PROBABILITY = 0.001;        // 0.1% per 100 wS

// Format helper
function formatPercent(value) {
  return (value * 100).toFixed(2) + '%';
}

// Main analysis function
function runSimulation() {
  console.log("\n========== REDDRAGON LOTTERY SIMULATION ==========\n");
  console.log("SYSTEM PARAMETERS:");
  console.log(`- Base probability: ${BASE_PROBABILITY * 100}% per 100 wSonic`);
  console.log(`- Base probability cap: ${formatPercent(BASE_PROBABILITY_CAP)}`);
  console.log(`- Maximum boost factor: ${MAX_BOOST}x`);
  console.log(`- Maximum total probability: ${formatPercent(MAX_PROBABILITY)}`);
  
  // Define important swap sizes to analyze
  const swapSizes = [1000, 5000, 10000, 15000, 25000, 50000];
  
  // Table header
  console.log("\n\nSWAP SIZE ANALYSIS");
  console.log("┌────────────┬─────────────┬─────────────┬────────────────┬───────────────┐");
  console.log("│ Swap Size  │ Base Prob   │ Base Capped │ Max With Boost │ LP for Max    │");
  console.log("├────────────┼─────────────┼─────────────┼────────────────┼───────────────┤");
  
  // Generate table rows
  swapSizes.forEach(size => {
    // Calculate probabilities
    const rawBaseProb = (size * BASE_PROBABILITY) / 100;
    const cappedBaseProb = Math.min(rawBaseProb, BASE_PROBABILITY_CAP);
    const maxBoostedProb = Math.min(cappedBaseProb * MAX_BOOST, MAX_PROBABILITY);
    
    // Calculate LP needed
    const swapPercentage = (size / TOTAL_WSONIC_LIQUIDITY) * 100;
    const lpPercentage = Math.min(swapPercentage, MAX_LP_PERCENTAGE);
    const lpAmount = Math.ceil((lpPercentage / 100) * TOTAL_LP_SUPPLY);
    
    // Format row
    console.log(`│ ${size.toString().padEnd(10)} │ ${formatPercent(rawBaseProb).padEnd(11)} │ ${formatPercent(cappedBaseProb).padEnd(11)} │ ${formatPercent(maxBoostedProb).padEnd(14)} │ ${lpAmount.toLocaleString().padEnd(13)} │`);
  });
  
  console.log("└────────────┴─────────────┴─────────────┴────────────────┴───────────────┘");
  
  // Key findings
  console.log("\n\nKEY FINDINGS:");
  console.log("1. Base probability caps at 10% for swaps of 10,000 wSonic or more");
  console.log("2. There is no incentive to swap more than 10,000 wSonic for lottery purposes alone");
  console.log("3. With max LP boost, probability can reach 25% on any swap ≥10,000 wSonic");
  console.log("4. The 10K wSonic mark represents the optimal swap size efficiency");
  
  // Boost value analysis
  console.log("\n\nBOOST VALUE ANALYSIS");
  console.log("┌────────────┬────────────┬────────────┬─────────────┐");
  console.log("│ Swap Size  │ No Boost   │ Max Boost  │ Value Added │");
  console.log("├────────────┼────────────┼────────────┼─────────────┤");
  
  const boostSwaps = [1000, 10000, 50000]; 
  
  boostSwaps.forEach(size => {
    const baseProb = Math.min((size * BASE_PROBABILITY) / 100, BASE_PROBABILITY_CAP);
    const boostedProb = Math.min(baseProb * MAX_BOOST, MAX_PROBABILITY);
    const valueAdded = boostedProb - baseProb;
    
    console.log(`│ ${size.toString().padEnd(10)} │ ${formatPercent(baseProb).padEnd(10)} │ ${formatPercent(boostedProb).padEnd(10)} │ ${formatPercent(valueAdded).padEnd(11)} │`);
  });
  
  console.log("└────────────┴────────────┴────────────┴─────────────┘");
  
  // Return on investment analysis
  const avgJackpot = 10000; // Example jackpot in wSonic
  
  console.log("\n\nECONOMIC ANALYSIS (Assuming 10,000 wSonic average jackpot)");
  console.log("┌────────────┬────────────┬──────────────┬────────────────┐");
  console.log("│ Swap Size  │ Win Chance │ Expected ROI │ Swaps Until Win│");
  console.log("├────────────┼────────────┼──────────────┼────────────────┤");
  
  // Define scenarios
  const scenarios = [
    { swap: 1000, boost: 1.0 },
    { swap: 1000, boost: 2.5 },
    { swap: 10000, boost: 1.0 },
    { swap: 10000, boost: 2.5 }
  ];
  
  scenarios.forEach(scenario => {
    const baseProb = Math.min((scenario.swap * BASE_PROBABILITY) / 100, BASE_PROBABILITY_CAP);
    const winProb = Math.min(baseProb * scenario.boost, MAX_PROBABILITY);
    
    const expectedValue = winProb * avgJackpot;
    const roi = (expectedValue / scenario.swap) * 100;
    const swapsUntilWin = Math.round(1 / winProb);
    
    const desc = `${scenario.swap} ${scenario.boost === 2.5 ? '(boosted)' : ''}`;
    
    console.log(`│ ${desc.padEnd(10)} │ ${formatPercent(winProb).padEnd(10)} │ ${roi.toFixed(2)}%${' '.repeat(Math.max(0, 10-roi.toFixed(2).length))} │ ${swapsUntilWin.toString().padEnd(14)} │`);
  });
  
  console.log("└────────────┴────────────┴──────────────┴────────────────┘");
  
  console.log("\n\nOPTIMAL STRATEGY:");
  console.log("1. For maximum efficiency: Swap exactly 10,000 wSonic");
  console.log("2. For maximum win chance: Swap ≥10,000 wSonic and provide sufficient LP");
  console.log("3. The LP boost system introduces a long-term incentive for liquidity provision");
}

// Run the simulation
runSimulation(); 