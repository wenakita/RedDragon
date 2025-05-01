// Fully Adaptive Jackpot and Fee Distribution Simulation
// This script simulates the combined effects of both adaptive jackpot distribution
// and unbounded fee allocation in various market scenarios

const PRECISION = 1e18;
const DAY = 86400; // Seconds in a day

// Default parameters
const DEFAULT_D = 100 * PRECISION;
const DEFAULT_N = 10 * PRECISION;
const BURN_FEE = 69; // 0.69% (scaled by 1e4)
const TOTAL_FEE = 1000; // 10% (scaled by 1e4)

// Simulation state
let jackpotSize = 0;
let undistributedJackpot = 0;
let cumulativeVolume = 0;
let dailyVolume = 0;
let lastWinTime = 0;
let currentRound = 1;
let participantCount = 0;

// Distribution parameters
let baseDistributionPercentage = 0.69 * PRECISION; // 69%
let minDistributionPercentage = 0.59 * PRECISION;  // 59%
let maxDistributionPercentage = 0.79 * PRECISION;  // 79%

// Adaptive weights
let participantWeightFactor = 0.3 * PRECISION;    // 30%
let timeSinceLastWinFactor = 0.3 * PRECISION;     // 30%
let jackpotSizeFactor = 0.4 * PRECISION;          // 40%

// Initialize round data
const roundData = [];

// Simplified approximation of the Hermès formula for testing
function calculateHermesValue(x, d = DEFAULT_D / PRECISION, n = DEFAULT_N / PRECISION) {
  if (x === 0) return 0;
  
  // Simplification for JavaScript testing
  const x4 = x * x * x * x;
  const dTerm = Math.pow(d, n + 2);
  const nTerm = Math.pow(n, n + 1);
  
  const component1 = Math.pow(x4 + dTerm / (nTerm * x), 1/3);
  const component2 = (x * x) / (3 * component1);
  
  return component1 - component2;
}

// Calculate adaptive fee allocation based on Hermès formula
function calculateAdaptiveFees(jackpotSize, dailyVolume) {
  // Calculate allocatable fee
  const allocatableFee = TOTAL_FEE - BURN_FEE;
  
  // Normalize values for formula stability
  const normalizedJackpot = jackpotSize > 0 ? jackpotSize / 1e6 + 1 : 1;
  const normalizedVolume = dailyVolume / 1e6 + 1;
  const volumeJackpotRatio = normalizedVolume * PRECISION / normalizedJackpot;
  
  // Calculate Hermès value
  const hermesValue = calculateHermesValue(normalizedJackpot);
  const normalizedValue = hermesValue * PRECISION / (normalizedJackpot + hermesValue);
  
  // Calculate unbounded jackpot fee ratio from Hermès value
  let jackpotFeeRatio = PRECISION - normalizedValue / 2;
  
  // Adjust based on market conditions
  if (volumeJackpotRatio > PRECISION) {
    // Volume is higher than jackpot, increase jackpot allocation
    const volumeAdjustment = volumeJackpotRatio * 0.05;
    jackpotFeeRatio += volumeAdjustment;
  } else if (normalizedJackpot > 10) {
    // Very large jackpot, reduce jackpot allocation
    const largeJackpotAdjustment = Math.log10(normalizedJackpot) * 0.05 * PRECISION;
    if (jackpotFeeRatio > largeJackpotAdjustment) {
      jackpotFeeRatio -= largeJackpotAdjustment;
    }
  }
  
  // Ensure jackpotFeeRatio doesn't exceed PRECISION
  if (jackpotFeeRatio > PRECISION) {
    jackpotFeeRatio = PRECISION;
  }
  
  // Calculate actual fee percentages
  const jackpotFee = allocatableFee * jackpotFeeRatio / PRECISION;
  const liquidityFee = allocatableFee - jackpotFee;
  
  return {
    jackpotFee: jackpotFee / 1e4,      // Convert to percentage
    liquidityFee: liquidityFee / 1e4,   // Convert to percentage
    burnFee: BURN_FEE / 1e4             // Convert to percentage
  };
}

// Calculate adaptive distribution percentage
function calculateDistributionPercentage(undistributedJackpot, participantCount, currentTime) {
  // If no jackpot or no participants, return the base percentage
  if (undistributedJackpot === 0 || undistributedJackpot < 0 || participantCount === 0) {
    return baseDistributionPercentage / PRECISION;
  }
  
  // Calculate participant factor
  const participantFactor = participantCount > 100 ? 
                          PRECISION : 
                          participantCount * PRECISION / 100;
  
  // Calculate time factor
  let timeFactor = 0;
  if (lastWinTime > 0) {
    const timeSinceLastWin = currentTime - lastWinTime;
    const maxTime = 30 * DAY; // 30 days
    timeFactor = timeSinceLastWin >= maxTime ? 
                PRECISION : 
                timeSinceLastWin * PRECISION / maxTime;
  }
  
  // Calculate jackpot size factor
  const targetJackpotSize = 1_000_000; // Example: 1 million tokens
  const sizeFactor = undistributedJackpot >= targetJackpotSize ? 
                    PRECISION : 
                    undistributedJackpot * PRECISION / targetJackpotSize;
  
  // Combine factors using weights
  const combinedFactor = (participantFactor * participantWeightFactor + 
                        timeFactor * timeSinceLastWinFactor + 
                        sizeFactor * jackpotSizeFactor) / PRECISION;
  
  // Apply Hermès formula for smooth scaling
  const smoothedFactor = calculateHermesValue(combinedFactor / PRECISION) * PRECISION;
  
  // Calculate adaptive percentage between min and max
  const range = maxDistributionPercentage - minDistributionPercentage;
  let adaptivePercentage = minDistributionPercentage + (smoothedFactor * range / PRECISION);
  
  // Ensure it's within bounds (59% to 79%)
  adaptivePercentage = Math.min(maxDistributionPercentage, Math.max(minDistributionPercentage, adaptivePercentage));
  
  // Return as normal percentage (not scaled by PRECISION)
  return adaptivePercentage / PRECISION;
}

// Process a daily trading volume and update the jackpot
function processTrading(volumeUSD, day, participantGrowth = 0) {
  // Update participant count
  participantCount = Math.min(100, Math.max(0, participantCount + participantGrowth));
  
  // Ensure undistributedJackpot is valid
  if (isNaN(undistributedJackpot) || undistributedJackpot < 0) {
    undistributedJackpot = 0;
  }
  
  // Calculate fees using the adaptive method
  const { jackpotFee, liquidityFee } = calculateAdaptiveFees(undistributedJackpot, volumeUSD);
  
  // Calculate jackpot contribution
  const jackpotContribution = volumeUSD * jackpotFee;
  
  // Update jackpot
  jackpotSize += jackpotContribution;
  undistributedJackpot += jackpotContribution;
  
  // Update volume metrics
  dailyVolume = volumeUSD;
  cumulativeVolume += volumeUSD;
  
  // Store data for reporting
  return {
    day,
    volumeUSD,
    jackpotSize,
    undistributedJackpot,
    participants: participantCount,
    jackpotFeePercent: jackpotFee * 100,
    liquidityFeePercent: liquidityFee * 100,
    jackpotContribution
  };
}

// Process a lottery win and distribute the jackpot
function processWin(day, currentTime) {
  // Ensure undistributedJackpot is valid
  if (isNaN(undistributedJackpot) || undistributedJackpot <= 0) {
    // Reset to a small value if invalid
    undistributedJackpot = 0;
    return null;
  }
  
  // Calculate adaptive distribution percentage
  const distributionPercentage = calculateDistributionPercentage(
    undistributedJackpot, 
    participantCount,
    currentTime
  );
  
  // Ensure distribution percentage is valid
  if (isNaN(distributionPercentage) || distributionPercentage <= 0 || distributionPercentage > 1.0) {
    console.log("Warning: Invalid distribution percentage calculated. Using base percentage.");
    // Use base distribution as fallback
    const fallbackPercentage = baseDistributionPercentage / PRECISION;
    const fallbackAmount = undistributedJackpot * fallbackPercentage;
    
    if (isNaN(fallbackAmount) || fallbackAmount <= 0) {
      console.log("Error: Cannot calculate valid distribution amount.");
      return null;
    }
  }
  
  // Calculate amount to distribute (using either calculated or fallback percentage)
  const finalDistributionPercentage = !isNaN(distributionPercentage) && distributionPercentage > 0 && distributionPercentage <= 1.0 
    ? distributionPercentage 
    : baseDistributionPercentage / PRECISION;
    
  const amountToDistribute = undistributedJackpot * finalDistributionPercentage;
  
  // Calculate prize distribution (simplified)
  const mainPrizePercentage = 0.8; // 80% to main winner
  const secondaryPrizePercentage = 0.15; // 15% to secondary winners
  const participationRewardsPercentage = 0.05; // 5% to participation rewards
  
  // Calculate actual prize amounts
  const mainPrizeAmount = amountToDistribute * mainPrizePercentage;
  const secondaryPrizePool = amountToDistribute * secondaryPrizePercentage;
  const participationPool = amountToDistribute * participationRewardsPercentage;
  
  // Ensure we don't distribute more than we have
  const actualAmountToDistribute = Math.min(amountToDistribute, undistributedJackpot);
  
  // Update undistributed jackpot
  const remainingJackpot = Math.max(0, undistributedJackpot - actualAmountToDistribute);
  undistributedJackpot = remainingJackpot;
  
  // Update state
  lastWinTime = currentTime;
  currentRound++;
  
  // Store round data
  const roundResult = {
    round: currentRound - 1,
    day,
    distributionPercentage: finalDistributionPercentage * 100,
    amountToDistribute: actualAmountToDistribute,
    mainPrizeAmount,
    secondaryPrizePool,
    participationPool,
    remainingJackpot,
    participants: participantCount
  };
  
  roundData.push(roundResult);
  return roundResult;
}

// Run a full simulation
function runFullSimulation(days = 180, scenarioName = "Default", options = {}) {
  console.log(`Starting simulation for ${days} days - Scenario: ${scenarioName}`);
  console.log("--------------------------------------------------");
  
  // Apply scenario options
  if (options.participantWeightFactor !== undefined) {
    participantWeightFactor = options.participantWeightFactor * PRECISION;
  }
  if (options.timeSinceLastWinFactor !== undefined) {
    timeSinceLastWinFactor = options.timeSinceLastWinFactor * PRECISION;
  }
  if (options.jackpotSizeFactor !== undefined) {
    jackpotSizeFactor = options.jackpotSizeFactor * PRECISION;
  }
  if (options.minDistPercentage !== undefined) {
    minDistributionPercentage = options.minDistPercentage * PRECISION;
  }
  if (options.maxDistPercentage !== undefined) {
    maxDistributionPercentage = options.maxDistPercentage * PRECISION;
  }
  
  // Reset state for clean simulation
  jackpotSize = 0;
  undistributedJackpot = 0;
  cumulativeVolume = 0;
  dailyVolume = 0;
  lastWinTime = 0;
  currentRound = 1;
  participantCount = 0;
  
  // Clear round data
  roundData.length = 0;
  
  const simulationResults = [];
  let currentTime = 0;
  
  // Initialize with 20 participants
  participantCount = 20;
  
  // Log verbosely only if requested
  const verbose = options.verbose !== false;
  
  // Simulate each day
  for (let day = 1; day <= days; day++) {
    // Update current time
    currentTime = day * DAY;
    
    // Generate a random trading volume (between $50k-$200k)
    const baseVolume = 50000 + Math.random() * 150000;
    
    // Apply some trends and patterns
    let trendMultiplier = 1.0;
    
    // Weekly pattern (weekend boost)
    const dayOfWeek = day % 7;
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      trendMultiplier *= 1.5; // Weekend boost
    }
    
    // Monthly pattern (payday boost around day 1, 15, 30)
    const dayOfMonth = day % 30;
    if (dayOfMonth <= 2 || (dayOfMonth >= 14 && dayOfMonth <= 16) || dayOfMonth >= 28) {
      trendMultiplier *= 1.3; // Payday boost
    }
    
    // Apply jackpot size influence on volume
    // Bigger jackpots attract more trading
    if (undistributedJackpot > 100000) {
      trendMultiplier *= 1 + (Math.min(undistributedJackpot, 1000000) / 1000000);
    }
    
    // Calculate final volume
    const volumeUSD = baseVolume * trendMultiplier;
    
    // Calculate participant growth (depends on jackpot size and recency of last win)
    let participantGrowth = 0;
    if (undistributedJackpot > 10000) {
      // Base growth from jackpot attractiveness
      participantGrowth += Math.floor(Math.log10(undistributedJackpot) - 3);
      
      // Bonus growth if no recent win
      if (lastWinTime > 0 && (currentTime - lastWinTime) > 10 * DAY) {
        participantGrowth += 1;
      }
      
      // Random variation
      participantGrowth += Math.floor(Math.random() * 3) - 1;
    } else {
      // Small jackpots may lose participants
      participantGrowth = Math.floor(Math.random() * 3) - 2;
    }
    
    // Process daily trading
    const tradingResult = processTrading(volumeUSD, day, participantGrowth);
    simulationResults.push(tradingResult);
    
    // Determine if a win should occur
    let winOccurred = false;
    
    // Higher chance of win if jackpot is large or long time since last win
    let winProbability = 0.03; // Base 3% daily chance
    
    if (undistributedJackpot > 100000) {
      winProbability += 0.02; // +2% if jackpot > $100k
    }
    
    if (lastWinTime > 0 && (currentTime - lastWinTime) > 15 * DAY) {
      winProbability += 0.05; // +5% if no win for 15+ days
    }
    
    if (Math.random() < winProbability) {
      winOccurred = true;
      const winResult = processWin(day, currentTime);
      
      if (winResult && verbose) {
        console.log(`Day ${day}: JACKPOT WIN! Round ${winResult.round}`);
        console.log(`  Distribution: ${winResult.distributionPercentage.toFixed(2)}%`);
        console.log(`  Main Prize: $${Math.floor(winResult.mainPrizeAmount)}`);
        console.log(`  Secondary Prizes: $${Math.floor(winResult.secondaryPrizePool)}`);
        console.log(`  Participation Rewards: $${Math.floor(winResult.participationPool)}`);
        console.log(`  Remaining Jackpot: $${Math.floor(winResult.remainingJackpot)}`);
        console.log(`  Participants: ${winResult.participants}`);
        console.log("--------------------------------------------------");
      }
    }
    
    // Print periodic updates
    if (verbose && day % 30 === 0 && !winOccurred) {
      console.log(`Day ${day} Update:`);
      console.log(`  Jackpot Size: $${Math.floor(jackpotSize)}`);
      console.log(`  Undistributed Jackpot: $${Math.floor(undistributedJackpot)}`);
      console.log(`  Daily Volume: $${Math.floor(volumeUSD)}`);
      console.log(`  Participants: ${participantCount}`);
      console.log(`  Jackpot Fee: ${tradingResult.jackpotFeePercent.toFixed(2)}%`);
      console.log(`  Liquidity Fee: ${tradingResult.liquidityFeePercent.toFixed(2)}%`);
      console.log("--------------------------------------------------");
    }
  }
  
  // Calculate statistics
  const jackpotFees = simulationResults.map(r => r.jackpotFeePercent);
  const minJackpotFee = Math.min(...jackpotFees).toFixed(2);
  const maxJackpotFee = Math.max(...jackpotFees).toFixed(2);
  const avgJackpotFee = (jackpotFees.reduce((a, b) => a + b, 0) / jackpotFees.length).toFixed(2);
  
  // Distribution statistics
  let distStats = { min: 'N/A', max: 'N/A', avg: 'N/A' };
  if (roundData.length > 0) {
    const distributions = roundData.map(r => r.distributionPercentage);
    distStats = {
      min: Math.min(...distributions).toFixed(2),
      max: Math.max(...distributions).toFixed(2),
      avg: (distributions.reduce((a, b) => a + b, 0) / distributions.length).toFixed(2)
    };
  }
  
  // Calculate prize stats
  let prizeStats = { min: 'N/A', max: 'N/A', avg: 'N/A', total: 0 };
  if (roundData.length > 0) {
    const prizes = roundData.map(r => r.mainPrizeAmount);
    prizeStats = {
      min: Math.floor(Math.min(...prizes)),
      max: Math.floor(Math.max(...prizes)),
      avg: Math.floor(prizes.reduce((a, b) => a + b, 0) / prizes.length),
      total: Math.floor(prizes.reduce((a, b) => a + b, 0))
    };
  }
  
  // Final summary
  if (verbose) {
    console.log(`\nSIMULATION SUMMARY - ${scenarioName}`);
    console.log("--------------------------------------------------");
    console.log(`Total Days: ${days}`);
    console.log(`Total Trading Volume: $${Math.floor(cumulativeVolume)}`);
    console.log(`Final Jackpot Size: $${Math.floor(jackpotSize)}`);
    console.log(`Undistributed Jackpot: $${Math.floor(undistributedJackpot)}`);
    console.log(`Number of Wins: ${roundData.length}`);
    console.log(`Jackpot Fee Range: ${minJackpotFee}% - ${maxJackpotFee}% (avg: ${avgJackpotFee}%)`);
    if (roundData.length > 0) {
      console.log(`Distribution Range: ${distStats.min}% - ${distStats.max}% (avg: ${distStats.avg}%)`);
      console.log(`Main Prize Range: $${prizeStats.min} - $${prizeStats.max} (avg: $${prizeStats.avg})`);
    }
  }
  
  return {
    scenarioName,
    configs: {
      participantWeight: (participantWeightFactor / PRECISION).toFixed(2),
      timeWeight: (timeSinceLastWinFactor / PRECISION).toFixed(2),
      jackpotSizeWeight: (jackpotSizeFactor / PRECISION).toFixed(2),
      minDist: (minDistributionPercentage / PRECISION).toFixed(2),
      maxDist: (maxDistributionPercentage / PRECISION).toFixed(2)
    },
    results: {
      days,
      totalVolume: Math.floor(cumulativeVolume),
      finalJackpotSize: Math.floor(jackpotSize),
      undistributedJackpot: Math.floor(undistributedJackpot),
      numberOfWins: roundData.length,
      feeStats: {
        min: minJackpotFee,
        max: maxJackpotFee,
        avg: avgJackpotFee
      },
      distStats,
      prizeStats
    },
    dailyResults: simulationResults,
    winResults: roundData
  };
}

// Run multiple simulations with different scenarios
function runMultipleScenarios() {
  console.log("RUNNING MULTIPLE SCENARIOS TO COMPARE ADAPTIVE SYSTEMS");
  console.log("====================================================");
  
  const scenarios = [
    {
      name: "Default Balanced",
      options: {
        participantWeightFactor: 0.30,
        timeSinceLastWinFactor: 0.30,
        jackpotSizeFactor: 0.40,
        minDistPercentage: 0.59,
        maxDistPercentage: 0.79,
        verbose: false
      }
    },
    {
      name: "Participant Focused",
      options: {
        participantWeightFactor: 0.60, 
        timeSinceLastWinFactor: 0.20,
        jackpotSizeFactor: 0.20,
        minDistPercentage: 0.59,
        maxDistPercentage: 0.79,
        verbose: false
      }
    },
    {
      name: "Time Focused",
      options: {
        participantWeightFactor: 0.20,
        timeSinceLastWinFactor: 0.60,
        jackpotSizeFactor: 0.20,
        minDistPercentage: 0.59,
        maxDistPercentage: 0.79,
        verbose: false
      }
    },
    {
      name: "Jackpot Size Focused",
      options: {
        participantWeightFactor: 0.20,
        timeSinceLastWinFactor: 0.20,
        jackpotSizeFactor: 0.60,
        minDistPercentage: 0.59,
        maxDistPercentage: 0.79,
        verbose: false
      }
    },
    {
      name: "Wide Distribution Range",
      options: {
        participantWeightFactor: 0.33,
        timeSinceLastWinFactor: 0.33,
        jackpotSizeFactor: 0.34,
        minDistPercentage: 0.40, // Wider range
        maxDistPercentage: 0.90, // Wider range
        verbose: false
      }
    },
    {
      name: "Fixed Distribution (69%)",
      options: {
        participantWeightFactor: 0.33,
        timeSinceLastWinFactor: 0.33,
        jackpotSizeFactor: 0.34,
        minDistPercentage: 0.69, // Same as base
        maxDistPercentage: 0.69, // Same as base (fixed)
        verbose: false
      }
    }
  ];
  
  const results = [];
  
  // Run each scenario
  for (const scenario of scenarios) {
    results.push(runFullSimulation(180, scenario.name, scenario.options));
  }
  
  // Display comparative table
  console.log("\n\nCOMPARATIVE RESULTS");
  console.log("=====================================================================================================================================");
  console.log("| Scenario           | Weights (P/T/J) | Dist Range | Avg Dist | Wins | Avg Prize    | Max Prize    | Final Jackpot | Jackpot Fee   |");
  console.log("|--------------------+----------------+------------+----------+------+--------------+--------------+---------------+---------------|");
  
  for (const result of results) {
    const { scenarioName, configs, results: r } = result;
    console.log(`| ${scenarioName.padEnd(18)} | ${configs.participantWeight}/${configs.timeWeight}/${configs.jackpotSizeWeight}      | ${configs.minDist}%-${configs.maxDist}%  | ${r.distStats.avg}%    | ${String(r.numberOfWins).padEnd(4)} | $${String(r.prizeStats.avg).padEnd(10)} | $${String(r.prizeStats.max).padEnd(10)} | $${String(r.undistributedJackpot).padEnd(11)} | ${r.feeStats.avg}%        |`);
  }
  
  console.log("=====================================================================================================================================");
  
  return results;
}

// Run the simulations
const scenarioResults = runMultipleScenarios();

// Export results if run in a Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    scenarioResults,
    calculateHermesValue,
    calculateAdaptiveFees,
    calculateDistributionPercentage
  };
} 