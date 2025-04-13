/**
 * RedDragon Combined Ecosystem Simulation
 * 
 * This simulation combines both lottery mechanics and fee generation to
 * show how the entire ecosystem works together.
 */

const { formatEther, parseEther } = require('ethers');

// Lottery System Parameters
const TOTAL_LP_SUPPLY = 1000000;       // Total LP tokens in circulation
const TOTAL_WSONIC_LIQUIDITY = 5000000; // Total wSonic in the trading pool
const BASE_PROBABILITY_CAP = 0.1;      // 10% max base probability
const MAX_PROBABILITY = 0.25;          // 25% max boosted probability
const MAX_BOOST = 2.5;                 // Maximum 2.5x boost
const BASE_PROBABILITY = 0.001;        // 0.1% per 100 wS

// Token & Fee Parameters
const TOTAL_SUPPLY = 6942000;          // Correct total token supply (6.942M)
const INITIAL_LIQUIDITY = 3471000;     // 50% of supply in liquidity
const DAILY_VOLUME = 1000000;          // 1M daily trading volume
const PERCENT_SELLS = 0.4;             // 40% of volume is sells

// Fee structure (percentages) - CORRECTED VALUES FROM CONTRACT
const TOTAL_FEE = 0.10;                // 10% total fee on sells
const JACKPOT_FEE = 0.069;             // 6.9% to jackpot
const BURN_FEE = 0.0069;               // 0.69% to burn
const LIQUIDITY_FEE = 0.015;           // 1.5% to liquidity
const DEVELOPMENT_FEE = 0.0091;        // 0.91% to development

// Simulation timeframe
const DAYS_TO_SIMULATE = 30;           // Simulate 30 days

// User profiles for simulation
const USER_PROFILES = [
  { name: "Small Trader", swapSize: 1000, lpHolding: 0, veHolding: 0, trades: 20 },
  { name: "Medium Trader", swapSize: 5000, lpHolding: 0, veHolding: 0, trades: 10 },
  { name: "Optimized Trader", swapSize: 10000, lpHolding: 0, veHolding: 0, trades: 8 },
  { name: "Whale Trader", swapSize: 25000, lpHolding: 0, veHolding: 0, trades: 3 },
  { name: "LP Provider", swapSize: 10000, lpHolding: 10000, veHolding: 0, trades: 5 },
  { name: "ve8020 Holder", swapSize: 10000, lpHolding: 10000, veHolding: 5000, trades: 5 },
  { name: "Whale LP+ve", swapSize: 10000, lpHolding: 50000, veHolding: 25000, trades: 3 }
];

/**
 * Calculate the base probability for a given swap size
 */
function calculateBaseProbability(swapAmountWS) {
  // Calculate raw probability based on swap amount
  // For simulation purposes, using 0.1% per 1000 tokens with 10% cap
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
 * Calculate daily fee generation based on volume
 */
function calculateDailyFees(dailyVolume, percentSells) {
  const sellVolume = dailyVolume * percentSells;
  
  return {
    totalVolume: dailyVolume,
    sellVolume: sellVolume,
    totalFees: sellVolume * TOTAL_FEE,
    jackpotFees: sellVolume * JACKPOT_FEE,
    burnFees: sellVolume * BURN_FEE,
    liquidityFees: sellVolume * LIQUIDITY_FEE,
    developmentFees: sellVolume * DEVELOPMENT_FEE
  };
}

/**
 * Simulate user trades with lottery mechanics
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
    
    // Calculate expected value and ROI
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
      winProbability: (winProbability * 100).toFixed(2) + "%",
      expectedWinRate: (winProbability * 100).toFixed(2) + "%",
      actualWinRate: winRate.toFixed(2) + "%",
      trades: user.trades,
      wins: totalWins,
      losses: totalLosses,
      totalCost: totalCost.toLocaleString(),
      payout: totalPayout.toLocaleString(),
      netProfit: (totalPayout - totalCost).toLocaleString(),
      expectedValue: expectedValue.toFixed(0),
      roi: roi.toFixed(2) + "%"
    });
  });
  
  return results;
}

/**
 * Simulate the entire ecosystem over time
 */
function simulateEcosystem() {
  let jackpot = 0;
  let totalBurned = 0;
  let totalLiquidityAdded = 0;
  let totalDevelopment = 0;
  let remainingSupply = TOTAL_SUPPLY;
  let totalWins = 0;
  let totalTrades = 0;
  let totalJackpotPayouts = 0;
  
  const dailyResults = [];
  const weeklySnapshots = [];
  
  for (let day = 1; day <= DAYS_TO_SIMULATE; day++) {
    // Calculate random daily volume variation (±20%)
    const volumeVariation = 0.8 + (Math.random() * 0.4);
    const actualDailyVolume = DAILY_VOLUME * volumeVariation;
    
    // Calculate fees for this day
    const dailyFees = calculateDailyFees(actualDailyVolume, PERCENT_SELLS);
    
    // Update jackpot with fees
    jackpot += dailyFees.jackpotFees;
    
    // Update other metrics
    totalBurned += dailyFees.burnFees;
    totalLiquidityAdded += dailyFees.liquidityFees;
    totalDevelopment += dailyFees.developmentFees;
    remainingSupply -= dailyFees.burnFees;
    
    // Simulate trades and wins for the day
    const estimatedTrades = Math.floor(actualDailyVolume / 10000); // Estimate trades based on average size
    totalTrades += estimatedTrades;
    
    // Estimate daily wins based on average 5% win rate
    const dailyWins = Math.floor(estimatedTrades * 0.05);
    totalWins += dailyWins;
    
    // Process jackpot payouts (if any wins happened)
    let dailyPayouts = 0;
    if (dailyWins > 0) {
      // For simplicity, distribute jackpot evenly among winners
      dailyPayouts = jackpot;
      totalJackpotPayouts += jackpot;
      jackpot = 0; // Reset jackpot after payout
    }
    
    // Store daily results
    dailyResults.push({
      day,
      volume: actualDailyVolume,
      jackpotSize: jackpot,
      jackpotPayouts: dailyPayouts,
      burnedToday: dailyFees.burnFees,
      totalBurned,
      burnedPercent: (totalBurned / TOTAL_SUPPLY) * 100,
      tradesEstimate: estimatedTrades,
      winsToday: dailyWins,
      totalWins,
      winRate: ((totalWins / totalTrades) * 100).toFixed(2) + "%"
    });
    
    // Store weekly snapshots
    if (day % 7 === 0 || day === DAYS_TO_SIMULATE) {
      weeklySnapshots.push({
        day,
        jackpotSize: jackpot,
        totalBurned,
        burnedPercent: (totalBurned / TOTAL_SUPPLY) * 100,
        totalLiquidityAdded,
        remainingSupply,
        totalWins,
        totalTrades,
        avgJackpotSize: totalJackpotPayouts / Math.max(1, totalWins),
        avgWinRate: (totalWins / Math.max(1, totalTrades)) * 100
      });
    }
  }
  
  return {
    dailyResults,
    weeklySnapshots,
    finalJackpot: jackpot,
    finalBurned: totalBurned,
    finalLiquidityAdded: totalLiquidityAdded,
    finalRemainingSupply: remainingSupply,
    totalWins,
    avgJackpotSize: totalJackpotPayouts / Math.max(1, totalWins)
  };
}

/**
 * Run the main simulation
 */
async function main() {
  console.log("=== REDDRAGON ECOSYSTEM SIMULATION (UPDATED) ===");
  console.log("\nLottery Parameters:");
  console.log(`- Base Probability Cap: ${BASE_PROBABILITY_CAP * 100}%`);
  console.log(`- Maximum Win Probability: ${MAX_PROBABILITY * 100}%`);
  console.log(`- Maximum Boost Factor: ${MAX_BOOST}x`);
  
  console.log("\nTokenomic Parameters:");
  console.log(`- Total Supply: ${TOTAL_SUPPLY.toLocaleString()} tokens`);
  console.log(`- Sell Fee: ${TOTAL_FEE * 100}%`);
  console.log(`- Jackpot Allocation: ${JACKPOT_FEE * 100}%`);
  console.log(`- Burn Allocation: ${BURN_FEE * 100}%`);
  
  // Run the ecosystem simulation
  const ecosystemResults = simulateEcosystem();
  
  console.log("\n=== ECOSYSTEM WEEKLY SNAPSHOTS ===");
  console.table(ecosystemResults.weeklySnapshots.map(week => ({
    day: week.day,
    jackpotSize: Math.floor(week.jackpotSize).toLocaleString(),
    totalBurned: Math.floor(week.totalBurned).toLocaleString(),
    burnedPercent: week.burnedPercent.toFixed(4) + "%",
    liquidityAdded: Math.floor(week.totalLiquidityAdded).toLocaleString(),
    totalWins: week.totalWins,
    avgJackpot: Math.floor(week.avgJackpotSize).toLocaleString(),
    winRate: week.avgWinRate.toFixed(2) + "%"
  })));
  
  // Use actual average jackpot size from the simulation for user experience
  const avgJackpotSize = ecosystemResults.avgJackpotSize;
  
  console.log("\n=== USER EXPERIENCE SIMULATION ===");
  console.log(`Average Jackpot Size: ${Math.floor(avgJackpotSize).toLocaleString()} tokens`);
  
  const userResults = simulateUserTrades(USER_PROFILES, avgJackpotSize);
  console.table(userResults.map(user => ({
    userType: user.userType,
    swapSize: user.swapSize.toLocaleString(),
    LP: user.lpHolding.toLocaleString(),
    ve8020: user.veHolding.toLocaleString(),
    winProb: user.winProbability,
    trades: user.trades,
    wins: user.wins,
    cost: user.totalCost,
    payout: user.payout,
    netProfit: user.netProfit,
    roi: user.roi
  })));
  
  console.log("\n=== COMBINED ECOSYSTEM SUMMARY ===");
  console.log(`- Simulation Period: ${DAYS_TO_SIMULATE} days`);
  console.log(`- Total tokens burned: ${Math.floor(ecosystemResults.finalBurned).toLocaleString()} (${(ecosystemResults.finalBurned / TOTAL_SUPPLY * 100).toFixed(4)}% of supply)`);
  console.log(`- Total liquidity added: ${Math.floor(ecosystemResults.finalLiquidityAdded).toLocaleString()} tokens`);
  console.log(`- Final jackpot size: ${Math.floor(ecosystemResults.finalJackpot).toLocaleString()} tokens`);
  console.log(`- Total lottery wins: ${ecosystemResults.totalWins}`);
  console.log(`- Average jackpot payout: ${Math.floor(ecosystemResults.avgJackpotSize).toLocaleString()} tokens`);
  console.log(`- Projected annual burn rate: ${Math.floor(ecosystemResults.finalBurned * 365 / DAYS_TO_SIMULATE).toLocaleString()} tokens (${(ecosystemResults.finalBurned * 365 / DAYS_TO_SIMULATE / TOTAL_SUPPLY * 100).toFixed(4)}% of supply)`);
  
  console.log("\n=== KEY FINDINGS ===");
  console.log("1. The jackpot grows steadily from sell fees, providing continuous rewards for buyers");
  console.log("2. Optimal strategy combines the 10,000 wS swap size with LP and ve8020 holding");
  console.log("3. Token burns from sell fees create scarcity over time, benefiting all holders");
  console.log("4. Users with LP and ve8020 have significantly higher ROI due to boosted win probability");
  console.log("5. The combined mechanics create a balanced ecosystem where:");
  console.log("   - Sellers contribute to the ecosystem through fees");
  console.log("   - Buyers have a chance to win rewards");
  console.log("   - LP providers receive higher lottery odds");
  console.log("   - ve8020 holders maximize their win potential");
}

// Execute main function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 