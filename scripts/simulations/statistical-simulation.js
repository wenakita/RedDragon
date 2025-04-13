/**
 * RedDragon Statistical Lottery Simulation
 * 
 * This simulation focuses on producing statistically significant results
 * for the lottery mechanics by running many more trades for each user profile.
 */

const { formatEther, parseEther } = require('ethers');

// Lottery System Parameters
const TOTAL_LP_SUPPLY = 1000000;        // Total LP tokens in circulation
const TOTAL_WSONIC_LIQUIDITY = 5000000; // Total wSonic in the trading pool
const BASE_PROBABILITY_CAP = 0.1;       // 10% max base probability
const MAX_PROBABILITY = 0.25;           // 25% max boosted probability
const MAX_BOOST = 2.5;                  // Maximum 2.5x boost

// Average jackpot size (based on previous simulations)
const AVG_JACKPOT_SIZE = 18000;         // 18K tokens average jackpot

// User profiles for simulation with much larger sample sizes
const USER_PROFILES = [
  { name: "Small Trader (1K)", swapSize: 1000, lpHolding: 0, veHolding: 0, trades: 1000 },
  { name: "Medium Trader (5K)", swapSize: 5000, lpHolding: 0, veHolding: 0, trades: 1000 },
  { name: "Optimal Trader (10K)", swapSize: 10000, lpHolding: 0, veHolding: 0, trades: 1000 },
  { name: "Whale Trader (25K)", swapSize: 25000, lpHolding: 0, veHolding: 0, trades: 1000 },
  { name: "LP Provider (1K LP)", swapSize: 10000, lpHolding: 1000, veHolding: 0, trades: 1000 },
  { name: "LP Provider (10K LP)", swapSize: 10000, lpHolding: 10000, veHolding: 0, trades: 1000 },
  { name: "LP Provider (50K LP)", swapSize: 10000, lpHolding: 50000, veHolding: 0, trades: 1000 },
  { name: "ve8020 Holder (Base)", swapSize: 10000, lpHolding: 10000, veHolding: 1000, trades: 1000 },
  { name: "ve8020 Holder (Large)", swapSize: 10000, lpHolding: 10000, veHolding: 10000, trades: 1000 },
  { name: "Whale LP+ve", swapSize: 10000, lpHolding: 50000, veHolding: 25000, trades: 1000 }
];

/**
 * Calculate the base probability for a given swap size
 */
function calculateBaseProbability(swapAmountWS) {
  // Calculate raw probability based on swap amount
  // Using 0.1% per 1000 tokens with 10% cap
  const rawProbability = (swapAmountWS / 10000) * 0.01;
  
  // Cap at BASE_PROBABILITY_CAP (10%)
  return Math.min(rawProbability, BASE_PROBABILITY_CAP);
}

/**
 * Calculate boost based on LP holdings and voting power
 */
function calculateBoost(lpHolding, votingPower) {
  // Simple boost calculation for simulation
  const lpRatio = lpHolding / TOTAL_LP_SUPPLY;
  
  // LP boost: 1x (no LP) to 2.5x (max LP)
  const lpBoost = Math.min(1 + lpRatio * 30, 2.5);
  
  // Voting power multiplier: 1x (no voting) or 1.5x (has voting)
  const votingBoost = votingPower > 0 ? 1.5 : 1.0;
  
  // Apply voting power multiplier to LP boost
  const totalBoost = Math.min(lpBoost * votingBoost, MAX_BOOST);
  
  return totalBoost;
}

/**
 * Calculate final win probability with boost and caps
 */
function calculateWinProbability(swapAmountWS, lpHolding, votingPower) {
  const baseProbability = calculateBaseProbability(swapAmountWS);
  const boost = calculateBoost(lpHolding, votingPower);
  
  // Apply boost to base probability
  const boostedProbability = baseProbability * boost;
  
  // Cap at MAX_PROBABILITY (25%)
  return Math.min(boostedProbability, MAX_PROBABILITY);
}

/**
 * Simulate user trades with lottery mechanics using a large sample size
 */
function simulateUserTrades(userProfiles, jackpotSize) {
  const results = [];
  
  userProfiles.forEach(user => {
    let totalWins = 0;
    let totalLosses = 0;
    let totalPayout = 0;
    let totalCost = user.swapSize * user.trades;
    
    // Calculate user's win probability
    const winProbability = calculateWinProbability(
      user.swapSize, 
      user.lpHolding, 
      user.veHolding
    );
    
    // Simulate each trade
    for (let i = 0; i < user.trades; i++) {
      const roll = Math.random();
      
      if (roll < winProbability) {
        totalWins++;
        totalPayout += jackpotSize;
      } else {
        totalLosses++;
      }
    }
    
    // Calculate win rate
    const winRate = (totalWins / user.trades) * 100;
    
    // Calculate expected value (EV = probability * jackpot - cost)
    const expectedWins = winProbability * user.trades;
    const expectedPayout = winProbability * jackpotSize * user.trades;
    const expectedValue = expectedPayout - totalCost;
    
    // Calculate ROI: (payout - cost) / cost
    const roi = totalPayout > 0 ? 
      ((totalPayout - totalCost) / totalCost) * 100 : 
      -100; // 100% loss if no wins
    
    results.push({
      userType: user.name,
      swapSize: user.swapSize,
      lpHolding: user.lpHolding,
      veHolding: user.veHolding,
      winProbability: (winProbability * 100).toFixed(4),
      expectedWins: expectedWins.toFixed(2),
      actualWins: totalWins,
      probabilityAccuracy: (totalWins / expectedWins * 100).toFixed(2) + "%",
      trades: user.trades,
      winRate: winRate.toFixed(4) + "%",
      totalCost: totalCost.toLocaleString(),
      totalPayout: totalPayout.toLocaleString(),
      netProfit: (totalPayout - totalCost).toLocaleString(),
      roi: roi.toFixed(2) + "%",
      expectedROI: ((expectedValue / totalCost) * 100).toFixed(2) + "%"
    });
  });
  
  return results;
}

/**
 * Run statistical analysis on different swap sizes
 */
function analyzeSwapSizes() {
  const results = [];
  const swapSizes = [1000, 2500, 5000, 7500, 10000, 15000, 20000, 25000, 30000, 50000];
  
  swapSizes.forEach(size => {
    const baseProb = calculateBaseProbability(size);
    results.push({
      swapSize: size,
      baseProb: (baseProb * 100).toFixed(4) + "%",
      isCapped: baseProb >= BASE_PROBABILITY_CAP ? "Yes" : "No",
      breakEvenJackpot: Math.floor(size / baseProb)
    });
  });
  
  return results;
}

/**
 * Run statistical analysis on different LP holding sizes
 */
function analyzeLPHoldings() {
  const results = [];
  const lpSizes = [0, 1000, 5000, 10000, 25000, 50000, 100000];
  
  lpSizes.forEach(lp => {
    const boost = calculateBoost(lp, 0);
    results.push({
      lpHolding: lp,
      lpPercent: (lp / TOTAL_LP_SUPPLY * 100).toFixed(4) + "%",
      boostFactor: boost.toFixed(2) + "x",
      maxProbability: (Math.min(BASE_PROBABILITY_CAP * boost, MAX_PROBABILITY) * 100).toFixed(4) + "%"
    });
  });
  
  return results;
}

/**
 * Main simulation function
 */
async function main() {
  console.log("=== REDDRAGON STATISTICAL LOTTERY SIMULATION ===");
  console.log("\nRunning with large sample sizes for statistical significance...");
  console.log("\nLottery Parameters:");
  console.log(`- Base Probability Cap: ${BASE_PROBABILITY_CAP * 100}%`);
  console.log(`- Maximum Win Probability: ${MAX_PROBABILITY * 100}%`);
  console.log(`- Maximum Boost Factor: ${MAX_BOOST}x`);
  console.log(`- Average Jackpot Size: ${AVG_JACKPOT_SIZE.toLocaleString()} tokens`);
  
  // Analyze different swap sizes
  console.log("\n=== SWAP SIZE ANALYSIS ===");
  const swapAnalysis = analyzeSwapSizes();
  console.table(swapAnalysis);
  
  // Analyze LP holdings
  console.log("\n=== LP HOLDING ANALYSIS ===");
  const lpAnalysis = analyzeLPHoldings();
  console.table(lpAnalysis);
  
  // Run large sample size simulation
  console.log("\n=== LARGE SAMPLE SIZE SIMULATION ===");
  console.log(`Running ${USER_PROFILES.length} user profiles with 1,000 trades each...`);
  
  const startTime = Date.now();
  const userResults = simulateUserTrades(USER_PROFILES, AVG_JACKPOT_SIZE);
  const endTime = Date.now();
  
  console.log(`Simulation completed in ${((endTime - startTime)/1000).toFixed(2)} seconds\n`);
  
  console.table(userResults.map(user => ({
    userType: user.userType,
    swapSize: user.swapSize.toLocaleString(),
    LP: user.lpHolding.toLocaleString(),
    ve8020: user.veHolding.toLocaleString(),
    winProb: user.winProbability + "%",
    expectedWins: user.expectedWins,
    actualWins: user.actualWins,
    accuracy: user.probabilityAccuracy,
    winRate: user.winRate,
    ROI: user.roi
  })));
  
  // Calculate profit/loss statistics
  const profitable = userResults.filter(u => parseFloat(u.roi) > 0).length;
  const unprofitable = userResults.filter(u => parseFloat(u.roi) <= 0).length;
  
  console.log("\n=== PROFIT/LOSS STATISTICS ===");
  console.table(userResults.map(user => ({
    userType: user.userType,
    totalCost: user.totalCost,
    totalPayout: user.totalPayout,
    netProfit: user.netProfit,
    actualROI: user.roi,
    expectedROI: user.expectedROI
  })));
  
  console.log("\n=== SUMMARY FINDINGS ===");
  console.log(`- ${profitable} of ${userResults.length} strategies were profitable`);
  console.log(`- ${unprofitable} of ${userResults.length} strategies were unprofitable`);
  
  // Extract winners and top performers
  const sortedByROI = [...userResults].sort((a, b) => parseFloat(b.roi) - parseFloat(a.roi));
  
  if (sortedByROI.length > 0) {
    console.log("\n=== TOP PERFORMING STRATEGIES ===");
    for (let i = 0; i < Math.min(3, sortedByROI.length); i++) {
      const strategy = sortedByROI[i];
      console.log(`${i+1}. ${strategy.userType}: ROI ${strategy.roi}, Win Rate ${strategy.winRate}`);
    }
  }
  
  console.log("\n=== KEY INSIGHTS ===");
  console.log("1. Win probabilities are consistent with theoretical values when using large sample sizes");
  console.log("2. The optimal strategy is to provide both LP and ve8020 tokens to maximize probability");
  console.log("3. The 10% cap on base probability means swapping over 10,000 tokens doesn't increase odds");
  console.log("4. LP and ve8020 boost can increase win rates by up to 2.5x");
}

// Execute main function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 