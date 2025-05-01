// Jackpot Distribution Simulation
// This script simulates how the jackpot evolves over multiple rounds with partial distribution

// Constants for simulation
const PRECISION = 1e18;
const DEFAULT_D = 100 * PRECISION;
const DEFAULT_N = 10 * PRECISION;
const MIN_MAIN_PRIZE = 70 * PRECISION / 100; // 70%
const MAX_MAIN_PRIZE = 95 * PRECISION / 100; // 95%
const DISTRIBUTION_PERCENTAGE = 69 * PRECISION / 100; // 69%

// Simplified approximation of the Hermès formula for testing
function calculateHermesValue(x, d, n) {
  if (x === 0) return 0;
  
  // Simplification for JavaScript testing
  const x4 = x * x * x * x;
  const dTerm = Math.pow(d, n + 2);
  const nTerm = Math.pow(n, n + 1);
  
  const component1 = Math.pow(x4 + dTerm / (nTerm * x), 1/3);
  const component2 = (x * x) / (3 * component1);
  
  return component1 - component2;
}

// Calculate jackpot distribution
function calculateJackpotDistribution(jackpotSize, participantCount, params = {}) {
  const d = params.d || DEFAULT_D / PRECISION;
  const n = params.n || DEFAULT_N / PRECISION;
  const minMainPrize = params.minMainPrize || MIN_MAIN_PRIZE / PRECISION;
  const maxMainPrize = params.maxMainPrize || MAX_MAIN_PRIZE / PRECISION;
  
  // Calculate participant factor (encourages more secondary prizes as participation increases)
  let participantFactor = 0;
  if (participantCount > 10) {
    participantFactor = Math.min(0.3, (participantCount * 3) / 1000);
  }
  
  // Calculate Hermès value
  const hermesValue = calculateHermesValue(jackpotSize, d, n);
  const normalizedValue = hermesValue / (jackpotSize + hermesValue);
  
  // Calculate main prize percentage (between minMainPrize and maxMainPrize)
  let mainPrize = minMainPrize + normalizedValue * (maxMainPrize - minMainPrize);
  
  // Adjust based on participant factor
  mainPrize = mainPrize * (1 - participantFactor);
  
  // Ensure main prize is within bounds
  mainPrize = Math.max(minMainPrize, Math.min(maxMainPrize, mainPrize));
  
  // Calculate secondary prizes
  const secondaryPrize = (1 - mainPrize) * 0.8;
  
  // Participation rewards get the remainder
  const participationRewards = 1 - mainPrize - secondaryPrize;
  
  return {
    mainPrize,
    secondaryPrize,
    participationRewards,
    hermesValue,
    normalizedValue,
    participantFactor
  };
}

// Simulate jackpot evolution over multiple rounds
function simulateJackpotEvolution(
  initialJackpot, 
  rounds, 
  participantsByRound, 
  additionalFundsPerRound = 0,
  distributionPercentage = DISTRIBUTION_PERCENTAGE / PRECISION
) {
  let totalJackpot = initialJackpot;
  let undistributedJackpot = initialJackpot;
  const results = [];
  
  for (let round = 1; round <= rounds; round++) {
    // Add new funds to jackpot
    totalJackpot += additionalFundsPerRound;
    undistributedJackpot += additionalFundsPerRound;
    
    // Calculate how much to distribute this round (e.g. 69%)
    const amountToDistribute = undistributedJackpot * distributionPercentage;
    
    // Get participant count for this round
    const participantCount = participantsByRound[round] || participantsByRound[participantsByRound.length - 1];
    
    // Calculate distribution using Hermès formula
    const distribution = calculateJackpotDistribution(amountToDistribute, participantCount);
    
    // Calculate actual prize amounts
    const mainPrizeAmount = amountToDistribute * distribution.mainPrize;
    const secondaryPrizePool = amountToDistribute * distribution.secondaryPrize;
    const participationPool = amountToDistribute * distribution.participationRewards;
    
    // Update undistributed jackpot for next round
    const remainingJackpot = undistributedJackpot - amountToDistribute;
    undistributedJackpot = remainingJackpot;
    
    // Store results for this round
    results.push({
      round,
      participantCount,
      totalJackpot,
      undistributedJackpotBefore: undistributedJackpot + amountToDistribute,
      amountToDistribute,
      mainPrizeAmount,
      secondaryPrizePool,
      participationPool,
      undistributedJackpotAfter: undistributedJackpot,
      mainPrizePercentage: distribution.mainPrize,
      secondaryPrizePercentage: distribution.secondaryPrize,
      participationRewardsPercentage: distribution.participationRewards
    });
  }
  
  return results;
}

// Helper function to format numbers for display
function formatNumber(num) {
  return Math.round(num).toLocaleString();
}

// Helper function to format percentages
function formatPercentage(decimal) {
  return (decimal * 100).toFixed(2) + '%';
}

// Run simulations
console.log("=== JACKPOT DISTRIBUTION SIMULATION ===\n");

// Simulation 1: Standard jackpot evolution over 10 rounds
console.log("SIMULATION 1: STANDARD JACKPOT EVOLUTION (10 ROUNDS)");
console.log("Initial Jackpot: 100,000 tokens, 69% distribution rate, 10k additional tokens per round");
console.log("-------------------------------------------------------------------");

const simulation1 = simulateJackpotEvolution(
  100000, // initial jackpot 
  10,     // rounds
  [0, 50, 75, 100, 150, 200, 250, 300, 350, 400, 450], // participants by round
  10000   // additional funds per round
);

console.log("Round | Participants | Jackpot Total | Distributed | Main Prize | Secondary | Participation | Remaining");
console.log("-------------------------------------------------------------------");

simulation1.forEach(round => {
  console.log(
    `${round.round.toString().padStart(5)}` +
    ` | ${round.participantCount.toString().padStart(12)}` +
    ` | ${formatNumber(round.totalJackpot).padStart(13)}` +
    ` | ${formatNumber(round.amountToDistribute).padStart(11)}` +
    ` | ${formatNumber(round.mainPrizeAmount).padStart(10)}` +
    ` | ${formatNumber(round.secondaryPrizePool).padStart(9)}` +
    ` | ${formatNumber(round.participationPool).padStart(13)}` +
    ` | ${formatNumber(round.undistributedJackpotAfter).padStart(9)}`
  );
});

// Simulation 2: Starting jackpot comparison
console.log("\n\nSIMULATION 2: IMPACT OF DISTRIBUTION PERCENTAGE");
console.log("Comparing 69% distribution with 100% distribution over 5 rounds");
console.log("-------------------------------------------------------------------");

// With 69% distribution
const with69Percent = simulateJackpotEvolution(
  100000, // initial jackpot 
  5,      // rounds
  [0, 100, 100, 100, 100, 100], // participants by round
  5000    // additional funds per round
);

// With 100% distribution (traditional model)
const with100Percent = simulateJackpotEvolution(
  100000, // initial jackpot 
  5,      // rounds
  [0, 100, 100, 100, 100, 100], // participants by round
  5000,   // additional funds per round
  1.0     // 100% distribution
);

console.log("Round | 69% Distribution |  Jackpot After  | 100% Distribution | Jackpot After");
console.log("-------------------------------------------------------------------");

for (let i = 0; i < 5; i++) {
  console.log(
    `${(i+1).toString().padStart(5)}` +
    ` | ${formatNumber(with69Percent[i].amountToDistribute).padStart(16)}` +
    ` | ${formatNumber(with69Percent[i].undistributedJackpotAfter).padStart(15)}` +
    ` | ${formatNumber(with100Percent[i].amountToDistribute).padStart(17)}` +
    ` | ${formatNumber(with100Percent[i].undistributedJackpotAfter).padStart(12)}`
  );
}

// Simulation 3: Impact of growing participation
console.log("\n\nSIMULATION 3: IMPACT OF GROWING PARTICIPATION");
console.log("Simulating exponential growth in participants over 10 rounds");
console.log("-------------------------------------------------------------------");

// Generate exponentially growing participant counts
const exponentialGrowth = Array(11).fill(0).map((_, i) => i === 0 ? 0 : Math.floor(10 * Math.pow(1.7, i)));

const growthSimulation = simulateJackpotEvolution(
  100000, // initial jackpot 
  10,     // rounds
  exponentialGrowth,
  10000   // additional funds per round
);

console.log("Round | Participants | Main Prize % | Secondary % | Participation % | Total Prize");
console.log("-------------------------------------------------------------------");

growthSimulation.forEach(round => {
  console.log(
    `${round.round.toString().padStart(5)}` +
    ` | ${round.participantCount.toString().padStart(12)}` +
    ` | ${formatPercentage(round.mainPrizePercentage).padStart(11)}` +
    ` | ${formatPercentage(round.secondaryPrizePercentage).padStart(11)}` +
    ` | ${formatPercentage(round.participationRewardsPercentage).padStart(15)}` +
    ` | ${formatNumber(round.amountToDistribute).padStart(11)}`
  );
});

// Simulation 4: Seasonal pattern with 3 big jackpots per year
console.log("\n\nSIMULATION 4: SEASONAL JACKPOT PATTERN");
console.log("Simulating a full year with 3 major seasonal jackpots");
console.log("-------------------------------------------------------------------");

// Regular and seasonal additional funds
const seasonalFunds = [
  5000, 5000, 5000, 20000, // Q1 with a season end
  5000, 5000, 5000, 20000, // Q2 with a season end
  5000, 5000, 5000, 20000  // Q3 with a season end
];

// Regular and seasonal participant counts
const seasonalParticipants = [
  0, 100, 150, 200, 300, // Regular + Q1 finale
  150, 200, 250, 400,    // Regular + Q2 finale
  200, 250, 300, 500     // Regular + Q3 finale
];

const seasonalSimulation = simulateJackpotEvolution(
  50000, // initial jackpot 
  12,    // rounds (months in a year)
  seasonalParticipants,
  undefined, // use the array of seasonal funds
  0.69
);

console.log("Month | Participants | New Funding | Prize Pool | Main Prize | Jackpot After");
console.log("-------------------------------------------------------------------");

seasonalFunds.forEach((funds, i) => {
  if (i < seasonalSimulation.length) {
    const round = seasonalSimulation[i];
    const isSeasonal = (i + 1) % 4 === 0; // Every 4th month is seasonal
    
    console.log(
      `${(i+1).toString().padStart(5)}` +
      ` | ${round.participantCount.toString().padStart(12)}` +
      ` | ${formatNumber(funds).padStart(11)}` +
      ` | ${formatNumber(round.amountToDistribute).padStart(10)}` +
      ` | ${formatNumber(round.mainPrizeAmount).padStart(10)}` +
      ` | ${formatNumber(round.undistributedJackpotAfter).padStart(13)}` +
      (isSeasonal ? ' (Seasonal)' : '')
    );
  }
});

console.log("\n\nJackpot distribution simulation completed successfully!"); 