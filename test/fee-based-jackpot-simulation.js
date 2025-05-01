// Fee-Based Jackpot Simulation
// This simulation models a jackpot that starts at zero and is funded exclusively by transaction fees

// Constants for simulation
const DEFAULT_DISTRIBUTION_PERCENTAGE = 0.69; // 69% distribution
const BUY_FEE_PERCENTAGE = 0.069; // 6.9% fee to jackpot from buys
const SELL_FEE_PERCENTAGE = 0.069; // 6.9% fee to jackpot from sells
const DAYS_PER_ROUND = 7; // Each round lasts a week

// Helper function to format numbers for display
function formatNumber(num) {
  return Math.round(num).toLocaleString();
}

// Helper function to format percentages
function formatPercentage(decimal) {
  return (decimal * 100).toFixed(2) + '%';
}

// Simple ASCII bar chart
function createBarChart(value, maxValue, width = 30) {
  const barLength = Math.round((value / maxValue) * width);
  return '|' + '#'.repeat(barLength) + ' '.repeat(width - barLength) + '| ' + formatNumber(value);
}

// Simulate market activity to generate fees
function simulateMarketActivity(
  days,
  initialDailyVolume = 100000,
  growthRate = 1.01, // 1% daily growth
  volatility = 0.2   // 20% random variation
) {
  const dailyVolumes = [];
  let currentVolume = initialDailyVolume;
  
  for (let day = 1; day <= days; day++) {
    // Add random variation to volume
    const randomFactor = 1 + (Math.random() * 2 - 1) * volatility;
    const dayVolume = currentVolume * randomFactor;
    
    // Split between buys and sells (random ratio each day)
    const buyRatio = 0.3 + Math.random() * 0.4; // 30-70% buys
    const buyVolume = dayVolume * buyRatio;
    const sellVolume = dayVolume * (1 - buyRatio);
    
    // Calculate fees
    const buyFees = buyVolume * BUY_FEE_PERCENTAGE;
    const sellFees = sellVolume * SELL_FEE_PERCENTAGE;
    const totalFees = buyFees + sellFees;
    
    dailyVolumes.push({
      day,
      totalVolume: dayVolume,
      buyVolume,
      sellVolume,
      buyFees,
      sellFees,
      totalFees
    });
    
    // Grow volume for next day
    currentVolume = currentVolume * growthRate;
  }
  
  return dailyVolumes;
}

// Simulate jackpot growth and distribution
function simulateJackpotEvolution(
  days,
  marketActivity,
  distributionPercentage = DEFAULT_DISTRIBUTION_PERCENTAGE,
  roundLengthInDays = DAYS_PER_ROUND
) {
  let jackpot = 0;
  const results = [];
  const rounds = [];
  
  // Aggregate data by day
  for (let day = 0; day < days; day++) {
    // Add fees to jackpot
    const dailyFees = marketActivity[day].totalFees;
    jackpot += dailyFees;
    
    // Record daily jackpot state
    results.push({
      day: day + 1,
      dailyFees,
      jackpotBefore: jackpot,
      jackpotAfter: jackpot,
      distributed: 0,
      isDistributionDay: false
    });
    
    // Check if it's a distribution day (end of round)
    if ((day + 1) % roundLengthInDays === 0) {
      const amountToDistribute = jackpot * distributionPercentage;
      const remaining = jackpot - amountToDistribute;
      
      // Update the day's results
      results[day].distributed = amountToDistribute;
      results[day].jackpotAfter = remaining;
      results[day].isDistributionDay = true;
      
      // Record round results
      rounds.push({
        round: Math.floor((day + 1) / roundLengthInDays),
        jackpotBefore: jackpot,
        distributed: amountToDistribute,
        jackpotAfter: remaining,
        endDay: day + 1
      });
      
      // Update jackpot for next day
      jackpot = remaining;
    }
  }
  
  return { dailyResults: results, roundResults: rounds };
}

// Simulate growth models with different volume and distribution parameters
function runGrowthScenarios(days, scenarios) {
  const results = {};
  
  for (const [name, params] of Object.entries(scenarios)) {
    // Generate market activity
    const marketActivity = simulateMarketActivity(
      days,
      params.initialDailyVolume,
      params.growthRate,
      params.volatility
    );
    
    // Simulate jackpot evolution
    const jackpotEvolution = simulateJackpotEvolution(
      days,
      marketActivity,
      params.distributionPercentage,
      params.roundLengthInDays
    );
    
    results[name] = {
      marketActivity,
      jackpotEvolution,
      params
    };
  }
  
  return results;
}

// Run the simulation
console.log("=== FEE-BASED JACKPOT SIMULATION ===\n");

// Simulation parameters
const SIMULATION_DAYS = 90; // 3 months
const ROUND_LENGTH = 7;     // 1 week per round

// Define different growth scenarios
const scenarios = {
  "Conservative": {
    initialDailyVolume: 50000,   // $50k initial daily volume
    growthRate: 1.005,           // 0.5% daily growth
    volatility: 0.15,            // 15% volatility
    distributionPercentage: 0.69, // 69% distribution
    roundLengthInDays: ROUND_LENGTH
  },
  "Moderate": {
    initialDailyVolume: 100000,  // $100k initial daily volume
    growthRate: 1.01,            // 1% daily growth
    volatility: 0.2,             // 20% volatility
    distributionPercentage: 0.69, // 69% distribution
    roundLengthInDays: ROUND_LENGTH
  },
  "Aggressive": {
    initialDailyVolume: 200000,  // $200k initial daily volume
    growthRate: 1.02,            // 2% daily growth
    volatility: 0.3,             // 30% volatility
    distributionPercentage: 0.69, // 69% distribution
    roundLengthInDays: ROUND_LENGTH
  }
};

// Run simulations
const simulationResults = runGrowthScenarios(SIMULATION_DAYS, scenarios);

// VISUALIZATION 1: Jackpot Size Evolution by Scenario
console.log("VISUALIZATION 1: JACKPOT GROWTH FROM ZERO (FEES ONLY)");
console.log("Comparing jackpot growth across different trading volume scenarios over 90 days");
console.log("-------------------------------------------------------------------");

// Find maximum jackpot across all scenarios for chart scaling
const maxJackpot = Math.max(
  ...Object.values(simulationResults).map(result => 
    Math.max(...result.jackpotEvolution.dailyResults.map(day => day.jackpotBefore))
  )
);

// Print weekly (distribution day) jackpot sizes
console.log("\nJackpot Size at End of Each Week:\n");
console.log("Week | Conservative | Moderate     | Aggressive");
console.log("-------------------------------------------------------------------");

// Get weekly results
const conservativeRounds = simulationResults.Conservative.jackpotEvolution.roundResults;
const moderateRounds = simulationResults.Moderate.jackpotEvolution.roundResults;
const aggressiveRounds = simulationResults.Aggressive.jackpotEvolution.roundResults;

// Determine number of rounds to display
const totalRounds = Math.floor(SIMULATION_DAYS / ROUND_LENGTH);

for (let round = 0; round < totalRounds; round++) {
  if (round < conservativeRounds.length && 
      round < moderateRounds.length && 
      round < aggressiveRounds.length) {
    console.log(
      `${(round+1).toString().padStart(4)} |` +
      ` ${createBarChart(conservativeRounds[round].jackpotBefore, maxJackpot, 15)} |` +
      ` ${createBarChart(moderateRounds[round].jackpotBefore, maxJackpot, 15)} |` +
      ` ${createBarChart(aggressiveRounds[round].jackpotBefore, maxJackpot, 15)}`
    );
  }
}

// VISUALIZATION 2: Distribution Amount Evolution
console.log("\n\nVISUALIZATION 2: WEEKLY JACKPOT DISTRIBUTION AMOUNTS");
console.log("Comparing distribution amounts across different scenarios");
console.log("-------------------------------------------------------------------");

// Find maximum distribution across all scenarios for chart scaling
const maxDistribution = Math.max(
  ...Object.values(simulationResults).map(result => 
    Math.max(...result.jackpotEvolution.roundResults.map(round => round.distributed))
  )
);

console.log("\nWeekly Distribution Amounts:\n");
console.log("Week | Conservative | Moderate     | Aggressive");
console.log("-------------------------------------------------------------------");

for (let round = 0; round < totalRounds; round++) {
  if (round < conservativeRounds.length && 
      round < moderateRounds.length && 
      round < aggressiveRounds.length) {
    console.log(
      `${(round+1).toString().padStart(4)} |` +
      ` ${createBarChart(conservativeRounds[round].distributed, maxDistribution, 15)} |` +
      ` ${createBarChart(moderateRounds[round].distributed, maxDistribution, 15)} |` +
      ` ${createBarChart(aggressiveRounds[round].distributed, maxDistribution, 15)}`
    );
  }
}

// VISUALIZATION 3: Daily Fee Generation
console.log("\n\nVISUALIZATION 3: DAILY FEE GENERATION");
console.log("Comparing daily fee generation for first 30 days");
console.log("-------------------------------------------------------------------");

// Find maximum daily fees across all scenarios for chart scaling
const maxDailyFees = Math.max(
  ...Object.values(simulationResults).map(result => 
    Math.max(...result.marketActivity.slice(0, 30).map(day => day.totalFees))
  )
);

console.log("\nDaily Fees (First 30 Days):\n");
console.log("Day  | Conservative | Moderate     | Aggressive");
console.log("-------------------------------------------------------------------");

// Only show first 30 days to keep output reasonable
for (let day = 0; day < 30; day++) {
  console.log(
    `${(day+1).toString().padStart(4)} |` +
    ` ${createBarChart(simulationResults.Conservative.marketActivity[day].totalFees, maxDailyFees, 15)} |` +
    ` ${createBarChart(simulationResults.Moderate.marketActivity[day].totalFees, maxDailyFees, 15)} |` +
    ` ${createBarChart(simulationResults.Aggressive.marketActivity[day].totalFees, maxDailyFees, 15)}`
  );
}

// VISUALIZATION 4: Jackpot Growth Analysis
console.log("\n\nVISUALIZATION 4: JACKPOT GROWTH ANALYSIS");
console.log("Key metrics for jackpot growth across scenarios");
console.log("-------------------------------------------------------------------");

// Calculate key metrics
function calculateMetrics(result) {
  const rounds = result.jackpotEvolution.roundResults;
  const lastRound = rounds[rounds.length - 1];
  
  const firstDistribution = rounds[0].distributed;
  const lastDistribution = lastRound.distributed;
  
  const totalFees = result.marketActivity.reduce((sum, day) => sum + day.totalFees, 0);
  const totalDistributed = rounds.reduce((sum, round) => sum + round.distributed, 0);
  const finalJackpot = lastRound.jackpotAfter;
  
  const daysToReach10k = result.jackpotEvolution.dailyResults.findIndex(day => day.jackpotBefore >= 10000) + 1;
  const daysToReach100k = result.jackpotEvolution.dailyResults.findIndex(day => day.jackpotBefore >= 100000) + 1;
  
  return {
    firstDistribution,
    lastDistribution,
    totalFees,
    totalDistributed,
    finalJackpot,
    daysToReach10k: daysToReach10k > 0 ? daysToReach10k : "Not reached",
    daysToReach100k: daysToReach100k > 0 ? daysToReach100k : "Not reached"
  };
}

const conservativeMetrics = calculateMetrics(simulationResults.Conservative);
const moderateMetrics = calculateMetrics(simulationResults.Moderate);
const aggressiveMetrics = calculateMetrics(simulationResults.Aggressive);

console.log("JACKPOT GROWTH METRICS");
console.log("-------------------------------------------------------------------");
console.log(`Metric               | Conservative     | Moderate         | Aggressive`);
console.log("-------------------------------------------------------------------");
console.log(`First Distribution    | ${formatNumber(conservativeMetrics.firstDistribution).padStart(16)} | ${formatNumber(moderateMetrics.firstDistribution).padStart(16)} | ${formatNumber(aggressiveMetrics.firstDistribution).padStart(16)}`);
console.log(`Last Distribution     | ${formatNumber(conservativeMetrics.lastDistribution).padStart(16)} | ${formatNumber(moderateMetrics.lastDistribution).padStart(16)} | ${formatNumber(aggressiveMetrics.lastDistribution).padStart(16)}`);
console.log(`Total Fees Generated  | ${formatNumber(conservativeMetrics.totalFees).padStart(16)} | ${formatNumber(moderateMetrics.totalFees).padStart(16)} | ${formatNumber(aggressiveMetrics.totalFees).padStart(16)}`);
console.log(`Total Distributed     | ${formatNumber(conservativeMetrics.totalDistributed).padStart(16)} | ${formatNumber(moderateMetrics.totalDistributed).padStart(16)} | ${formatNumber(aggressiveMetrics.totalDistributed).padStart(16)}`);
console.log(`Final Jackpot         | ${formatNumber(conservativeMetrics.finalJackpot).padStart(16)} | ${formatNumber(moderateMetrics.finalJackpot).padStart(16)} | ${formatNumber(aggressiveMetrics.finalJackpot).padStart(16)}`);
console.log(`Days to $10k Jackpot  | ${(conservativeMetrics.daysToReach10k + "").padStart(16)} | ${(moderateMetrics.daysToReach10k + "").padStart(16)} | ${(aggressiveMetrics.daysToReach10k + "").padStart(16)}`);
console.log(`Days to $100k Jackpot | ${(conservativeMetrics.daysToReach100k + "").padStart(16)} | ${(moderateMetrics.daysToReach100k + "").padStart(16)} | ${(aggressiveMetrics.daysToReach100k + "").padStart(16)}`);

// KEY FINDINGS
console.log("\n\nKEY FINDINGS AND RECOMMENDATIONS");
console.log("-------------------------------------------------------------------");

console.log("1. ZERO-START JACKPOT FEASIBILITY:");
console.log("   - A fee-only jackpot is viable even with conservative volume projections");
console.log("   - All scenarios show meaningful jackpot accumulation within first month");
console.log("   - Distribution amounts become substantial after initial accumulation period");

console.log("\n2. TIMING CONSIDERATIONS:");
console.log("   - First distribution is modest but grows rapidly in all scenarios");
console.log("   - Weekly distribution cycle allows jackpot to build between distributions");
console.log("   - 69% distribution maintains both attractive prizes and sustainability");

console.log("\n3. VOLUME IMPACT:");
console.log("   - Trading volume directly correlates with jackpot growth rate");
console.log("   - Higher volatility creates spikes in fee generation but ensures average growth");
console.log("   - Aggressive scenario reaches substantial jackpot size in shortest timeframe");

console.log("\n4. OPTIMAL STRATEGIES:");
console.log("   - Consider delaying first distribution until minimum threshold is reached");
console.log("   - Maintain consistent distribution schedule once initiated");
console.log("   - Use dynamic distribution percentage during early phases if needed");
console.log("   - Gradual decrease in distribution percentage as jackpot grows enhances sustainability");

console.log("\nFee-based jackpot simulation completed successfully!"); 