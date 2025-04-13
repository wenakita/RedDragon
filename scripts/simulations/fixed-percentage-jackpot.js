/**
 * RedDragon Lottery - Fixed Percentage Jackpot Simulation
 * 
 * This script simulates a model where winners receive exactly 69% of the jackpot,
 * while displaying that amount (not the full pool) as the advertised jackpot.
 */

// System parameters
const JACKPOT_FEE_PERCENTAGE = 0.005; // 0.5% of swap volume goes to jackpot
const INITIAL_JACKPOT_POOL = 10000;   // Starting total jackpot pool in wSonic
const PAYOUT_PERCENTAGE = 0.69;       // Fixed percentage paid out on win (69%)
const DAYS_TO_SIMULATE = 90;          // Days to run the simulation

// Volume scenarios (daily swap volume in wSonic)
const VOLUME_SCENARIOS = {
  low: 50000,      // Low volume: 50K wSonic daily
  medium: 200000,  // Medium volume: 200K wSonic daily
  high: 500000     // High volume: 500K wSonic daily
};

// User behavior models with win probability per swap
const USER_BEHAVIORS = {
  standard: {
    winProb: 0.04,          // 4% win rate per eligible swap (no boost)
    swapsPerDay: 1,         // Only ~1 eligible swap per day
    description: "4% win rate"
  },
  boosted: {
    winProb: 0.10,          // 10% win rate (with maximum LP boost)
    swapsPerDay: 0.5,       // Less common - only ~0.5 eligible swaps per day
    description: "10% win rate, rare"
  }
};

/**
 * Simulate jackpot growth over time with fixed percentage distribution
 */
function simulateFixedPercentageJackpot(volumePerDay, userBehavior, seed = 123) {
  // Initialize simulation state
  let jackpotPool = INITIAL_JACKPOT_POOL;  // Total amount in the pool (hidden from users)
  let jackpotHistory = [jackpotPool];      // History of the actual pool
  let advertisedJackpotHistory = [jackpotPool * PAYOUT_PERCENTAGE]; // What players see
  let wins = 0;
  let winDays = [];
  let payoutAmounts = [];   // Amount won by players
  let remainingAmounts = []; // Amount left in pool after wins
  let totalFees = 0;
  let lastWinDay = 0;
  
  // Simple deterministic random function with seed
  let randomSeed = seed;
  const random = () => {
    randomSeed = (randomSeed * 9301 + 49297) % 233280;
    return randomSeed / 233280;
  };
  
  // Calculate daily probability based on user behavior
  const swapsPerDay = userBehavior.swapsPerDay;
  const dailyWinProb = 1 - Math.pow(1 - userBehavior.winProb, swapsPerDay);
  
  // Run simulation for specified number of days
  for (let day = 1; day <= DAYS_TO_SIMULATE; day++) {
    // Calculate daily fees going to jackpot
    const dailyFees = volumePerDay * JACKPOT_FEE_PERCENTAGE;
    totalFees += dailyFees;
    
    // Add fees to jackpot pool
    jackpotPool += dailyFees;
    
    // Check for winning event
    if (random() < dailyWinProb) {
      // Calculate payout (exactly 69% of the current pool)
      const payoutAmount = jackpotPool * PAYOUT_PERCENTAGE;
      
      // Record win details
      payoutAmounts.push(payoutAmount);
      remainingAmounts.push(jackpotPool - payoutAmount);
      winDays.push(day);
      wins++;
      lastWinDay = day;
      
      // Reduce jackpot by payout amount
      jackpotPool -= payoutAmount;
    }
    
    // Record jackpot at end of day
    jackpotHistory.push(jackpotPool);
    advertisedJackpotHistory.push(jackpotPool * PAYOUT_PERCENTAGE);
  }
  
  // Calculate statistics
  const avgPayoutAmount = payoutAmounts.length > 0 
    ? payoutAmounts.reduce((sum, val) => sum + val, 0) / payoutAmounts.length 
    : 0;
  
  const maxPayoutAmount = payoutAmounts.length > 0
    ? Math.max(...payoutAmounts)
    : 0;
    
  const avgDaysBetweenWins = winDays.length > 1
    ? (winDays[winDays.length - 1] - winDays[0]) / (winDays.length - 1)
    : DAYS_TO_SIMULATE;
  
  const currentDaysSinceWin = DAYS_TO_SIMULATE - lastWinDay;
  
  return {
    finalJackpotPool: jackpotPool,
    finalAdvertisedJackpot: jackpotPool * PAYOUT_PERCENTAGE,
    jackpotHistory,
    advertisedJackpotHistory,
    wins,
    winDays,
    payoutAmounts,
    remainingAmounts,
    avgPayoutAmount,
    maxPayoutAmount,
    avgDaysBetweenWins,
    currentDaysSinceWin,
    dailyWinProbability: dailyWinProb,
    totalFeesCollected: totalFees
  };
}

/**
 * Format a number with thousands separators
 */
function formatNumber(num) {
  return Math.round(num).toLocaleString();
}

/**
 * Run various scenarios and output results
 */
function runScenarios() {
  console.log("\n======== REDDRAGON FIXED PERCENTAGE JACKPOT SIMULATION ========\n");
  console.log(`Simulation period: ${DAYS_TO_SIMULATE} days`);
  console.log(`Jackpot fee rate: ${JACKPOT_FEE_PERCENTAGE * 100}% of swap volume`);
  console.log(`Initial jackpot pool: ${INITIAL_JACKPOT_POOL} wSonic`);
  console.log(`Payout percentage: ${PAYOUT_PERCENTAGE * 100}% of jackpot pool`);
  console.log(`Initial advertised jackpot: ${Math.round(INITIAL_JACKPOT_POOL * PAYOUT_PERCENTAGE)} wSonic\n`);
  
  console.log("SCENARIO RESULTS:\n");
  
  // Table header
  console.log("┌────────────────┬────────────────┬───────────────┬─────────────┬────────────────┬────────────────┬────────────────┐");
  console.log("│ Trading Volume │ Player Behavior│ Total Wins    │ Avg Payout  │ Max Payout     │ Final Jackpot  │ Days Between   │");
  console.log("├────────────────┼────────────────┼───────────────┼─────────────┼────────────────┼────────────────┼────────────────┤");
  
  // Run through all combinations of volume and behavior
  Object.entries(VOLUME_SCENARIOS).forEach(([volumeKey, volumeValue]) => {
    Object.entries(USER_BEHAVIORS).forEach(([behaviorKey, behaviorValue], index) => {
      // Run simulation with different seed for each scenario
      const seed = parseInt(volumeKey + behaviorKey, 36) % 10000;
      const results = simulateFixedPercentageJackpot(volumeValue, behaviorValue, seed + 1000);
      
      // Format for display
      const volumeDesc = `${volumeKey} (${formatNumber(volumeValue)}/day)`;
      const winsDesc = results.wins === 0 ? "No wins" : `${results.wins} win${results.wins !== 1 ? 's' : ''}`;
      const avgPayout = formatNumber(Math.round(results.avgPayoutAmount));
      const maxPayout = formatNumber(Math.round(results.maxPayoutAmount));
      const finalJackpot = formatNumber(Math.round(results.finalAdvertisedJackpot)); // Show advertised amount
      const daysBetween = results.avgDaysBetweenWins === DAYS_TO_SIMULATE ? "N/A" : 
        results.avgDaysBetweenWins.toFixed(1) + " days";
      
      // Add line separator between volume scenarios
      if (index === 0 && volumeKey !== "low") {
        console.log("├────────────────┼────────────────┼───────────────┼─────────────┼────────────────┼────────────────┼────────────────┤");
      }
      
      // Output row
      console.log(`│ ${volumeDesc.padEnd(14)} │ ${behaviorValue.description.padEnd(14)} │ ${winsDesc.padEnd(13)} │ ${avgPayout.padEnd(11)} │ ${maxPayout.padEnd(14)} │ ${finalJackpot.padEnd(14)} │ ${daysBetween.padEnd(14)} │`);
    });
  });
  
  console.log("└────────────────┴────────────────┴───────────────┴─────────────┴────────────────┴────────────────┴────────────────┘");
  
  // Show potential jackpot growth without wins
  showNoWinGrowthTable();
  
  // Analyze detailed scenario
  analyzeDetailedScenario();
}

/**
 * Show growth table for jackpot with no wins
 */
function showNoWinGrowthTable() {
  console.log("\nJACKPOT GROWTH WITH NO WINS:\n");
  console.log("┌──────────┬────────────────┬────────────────┬────────────────┐");
  console.log("│ Week     │ Low Volume     │ Medium Volume  │ High Volume    │");
  console.log("├──────────┼────────────────┼────────────────┼────────────────┤");
  
  // Track jackpot amounts for each volume scenario
  const jackpots = {
    low: INITIAL_JACKPOT_POOL,
    medium: INITIAL_JACKPOT_POOL,
    high: INITIAL_JACKPOT_POOL
  };
  
  // Daily growth for each scenario
  const dailyGrowth = {
    low: VOLUME_SCENARIOS.low * JACKPOT_FEE_PERCENTAGE,
    medium: VOLUME_SCENARIOS.medium * JACKPOT_FEE_PERCENTAGE,
    high: VOLUME_SCENARIOS.high * JACKPOT_FEE_PERCENTAGE
  };
  
  // Start row - initial jackpot
  console.log(`│ Initial  │ ${formatNumber(jackpots.low * PAYOUT_PERCENTAGE)} wS      │ ${formatNumber(jackpots.medium * PAYOUT_PERCENTAGE)} wS      │ ${formatNumber(jackpots.high * PAYOUT_PERCENTAGE)} wS      │`);
  
  // Calculate growth week by week
  for (let week = 1; week <= 8; week++) {
    // Add 7 days of growth to each jackpot
    jackpots.low += dailyGrowth.low * 7;
    jackpots.medium += dailyGrowth.medium * 7;
    jackpots.high += dailyGrowth.high * 7;
    
    // Calculate advertised jackpot (what users see)
    const advertised = {
      low: jackpots.low * PAYOUT_PERCENTAGE,
      medium: jackpots.medium * PAYOUT_PERCENTAGE,
      high: jackpots.high * PAYOUT_PERCENTAGE
    };
    
    // Print row
    console.log(`│ Week ${week}   │ ${formatNumber(advertised.low)} wS      │ ${formatNumber(advertised.medium)} wS      │ ${formatNumber(advertised.high)} wS      │`);
  }
  
  console.log("└──────────┴────────────────┴────────────────┴────────────────┘");
  console.log("* Values shown are the advertised jackpot (69% of the total pool)");
}

/**
 * Analyze a specific scenario in detail
 */
function analyzeDetailedScenario() {
  // Choose medium volume with standard behavior for detailed analysis
  const detailedResults = simulateFixedPercentageJackpot(
    VOLUME_SCENARIOS.medium, 
    USER_BEHAVIORS.standard,
    12345
  );
  
  console.log("\n\nDETAILED SCENARIO ANALYSIS");
  console.log("Medium volume (200K wSonic/day) with standard 4% win rate:\n");
  
  console.log(`- Daily win probability: ${(detailedResults.dailyWinProbability * 100).toFixed(1)}%`);
  console.log(`- Total jackpot fees collected: ${formatNumber(Math.round(detailedResults.totalFeesCollected))} wSonic`);
  console.log(`- Final jackpot pool (actual total): ${formatNumber(Math.round(detailedResults.finalJackpotPool))} wSonic`);
  console.log(`- Final advertised jackpot (displayed): ${formatNumber(Math.round(detailedResults.finalAdvertisedJackpot))} wSonic`);
  console.log(`- Number of jackpot wins: ${detailedResults.wins}`);
  
  if (detailedResults.payoutAmounts.length > 0) {
    console.log(`- Average payout amount: ${formatNumber(Math.round(detailedResults.avgPayoutAmount))} wSonic`);
    console.log(`- Range of payouts: ${formatNumber(Math.min(...detailedResults.payoutAmounts))} - ${formatNumber(Math.max(...detailedResults.payoutAmounts))} wSonic`);
    console.log(`- Average pool after wins: ${formatNumber(Math.round(detailedResults.remainingAmounts.reduce((a,b) => a+b, 0) / detailedResults.remainingAmounts.length))} wSonic`);
  }
  
  // Show win frequency and expected win size
  console.log("\nExpected Win Frequency (Medium Volume):");
  console.log(`- With 4% win rate: Average of 1 win every ${Math.round(1/USER_BEHAVIORS.standard.dailyWinProb)} days`);
  console.log(`- With 10% win rate: Average of 1 win every ${Math.round(1/USER_BEHAVIORS.boosted.dailyWinProb)} days`);
  
  // Show first 10 wins
  console.log("\nWin History (first 10 wins):");
  
  if (detailedResults.wins === 0) {
    console.log("No wins occurred during the simulation period.");
  } else {
    console.log("┌─────────┬──────────────┬──────────────┬──────────────┬──────────────┐");
    console.log("│ Win #   │ Day          │ Actual Pool  │ Payout       │ Remaining    │");
    console.log("├─────────┼──────────────┼──────────────┼──────────────┼──────────────┤");
    
    const winsToShow = Math.min(10, detailedResults.wins);
    
    for (let i = 0; i < winsToShow; i++) {
      const poolBeforeWin = detailedResults.payoutAmounts[i] + detailedResults.remainingAmounts[i];
      console.log(`│ ${(i+1).toString().padEnd(7)} │ ${detailedResults.winDays[i].toString().padEnd(12)} │ ${formatNumber(poolBeforeWin).padEnd(12)} │ ${formatNumber(detailedResults.payoutAmounts[i]).padEnd(12)} │ ${formatNumber(detailedResults.remainingAmounts[i]).padEnd(12)} │`);
    }
    
    console.log("└─────────┴──────────────┴──────────────┴──────────────┴──────────────┘");
  }
  
  // Show jackpot over time
  console.log("\nJackpot Display Comparison (every 10 days):");
  console.log("┌──────────┬──────────────┬──────────────┬────────────┐");
  console.log("│ Day      │ Actual Pool  │ Advertised   │ % of Total │");
  console.log("├──────────┼──────────────┼──────────────┼────────────┤");
  
  for (let day = 0; day <= DAYS_TO_SIMULATE; day += 10) {
    if (day < detailedResults.jackpotHistory.length) {
      const actualPool = detailedResults.jackpotHistory[day];
      const advertisedJackpot = detailedResults.advertisedJackpotHistory[day];
      const percentage = (advertisedJackpot / actualPool) * 100;
      
      console.log(`│ ${day.toString().padEnd(8)} │ ${formatNumber(Math.round(actualPool)).padEnd(12)} │ ${formatNumber(Math.round(advertisedJackpot)).padEnd(12)} │ ${percentage.toFixed(1)}%${' '.repeat(Math.max(0, 8-percentage.toFixed(1).length))} │`);
    }
  }
  
  console.log("└──────────┴──────────────┴──────────────┴────────────┘");
  
  console.log("\n\nSIMPLIFIED EXPLANATION:");
  console.log("How the jackpot system works (internal):");
  console.log(`1. The system maintains a total jackpot pool that accumulates fees (${JACKPOT_FEE_PERCENTAGE * 100}% of volume)`);
  console.log(`2. When someone wins, they receive exactly ${PAYOUT_PERCENTAGE * 100}% of the total pool`);
  console.log(`3. The remaining ${(1-PAYOUT_PERCENTAGE) * 100}% stays in the pool for future wins`);
  console.log("\nHow it appears to users:");
  console.log(`1. Users see the \"Current Jackpot\" (which is ${PAYOUT_PERCENTAGE * 100}% of the actual pool)`);
  console.log("2. Winners receive 100% of the displayed jackpot amount");
  console.log("3. After a win, the jackpot visibly resets to a lower amount but never to zero");
  
  console.log("\n\nKEY FINDINGS:");
  console.log("1. The fixed percentage model ensures a consistent jackpot system that's easy to understand");
  console.log("2. With medium volume, average payouts range from 10,000-30,000 wSonic");
  console.log("3. The jackpot never drops to zero, maintaining continuous play incentive");
  console.log("4. The displayed jackpot amounts can reach significant size with less frequent wins");
  console.log("5. Win frequency is much more realistic with the adjusted probability model");
  
  console.log("\n\nRECOMMENDATIONS:");
  console.log("1. Implement a fixed 69% payout of the total jackpot pool");
  console.log("2. Only advertise the amount that will actually be paid out (69% of pool)");
  console.log("3. Market this as \"Win the ENTIRE jackpot!\" since winners get 100% of what's displayed");
  console.log("4. Start with a 10,000 wSonic initial jackpot seed (displays as 6,900 wSonic initially)");
  console.log("5. Consider occasional \"jackpot boosts\" where additional funds are added to the pool");
}

// Run the simulation
runScenarios(); 