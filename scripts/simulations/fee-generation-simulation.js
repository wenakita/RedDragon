/**
 * RedDragon Fee Generation Simulation
 * 
 * This simulation models sell activity and fee generation in the RedDragon ecosystem,
 * showing how sells contribute to the jackpot, burns, and other fee destinations.
 */

const { formatEther, parseEther } = require('ethers');

// System parameters
const TOTAL_SUPPLY = 6942000;            // Correct total token supply (6.942M)
const INITIAL_LIQUIDITY = 3471000;       // 50% of supply in liquidity
const DAILY_VOLUME = 1000000;            // 1M daily trading volume
const PERCENT_SELLS = 0.4;               // 40% of volume is sells

// Fee structure (percentages) - CORRECTED VALUES FROM CONTRACT
const TOTAL_FEE = 0.10;                  // 10% total fee on sells
const JACKPOT_FEE = 0.069;               // 6.9% to jackpot
const BURN_FEE = 0.0069;                 // 0.69% to burn
const LIQUIDITY_FEE = 0.015;             // 1.5% to liquidity  
const DEVELOPMENT_FEE = 0.0091;          // 0.91% to development

// Simulation timeframe
const DAYS_TO_SIMULATE = 30;             // Simulate 30 days

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
 * Simulate fee accumulation over time
 */
function simulateFeesOverTime(days, dailyVolume, percentSells) {
    let cumulativeJackpot = 0;
    let cumulativeBurned = 0;
    let cumulativeLiquidity = 0;
    let cumulativeDevelopment = 0;
    let remainingSupply = TOTAL_SUPPLY;
    
    const dailyResults = [];
    
    for (let day = 1; day <= days; day++) {
        // Calculate random daily volume variation (±20%)
        const volumeVariation = 0.8 + (Math.random() * 0.4);
        const actualDailyVolume = dailyVolume * volumeVariation;
        
        // Calculate fees for this day
        const dailyFees = calculateDailyFees(actualDailyVolume, percentSells);
        
        // Accumulate fees
        cumulativeJackpot += dailyFees.jackpotFees;
        cumulativeBurned += dailyFees.burnFees;
        cumulativeLiquidity += dailyFees.liquidityFees;
        cumulativeDevelopment += dailyFees.developmentFees;
        
        // Update remaining supply (accounting for burns)
        remainingSupply -= dailyFees.burnFees;
        
        // Store results
        dailyResults.push({
            day,
            volume: actualDailyVolume,
            sellVolume: dailyFees.sellVolume,
            dailyJackpotFees: dailyFees.jackpotFees,
            dailyBurnFees: dailyFees.burnFees,
            dailyLiquidityFees: dailyFees.liquidityFees,
            dailyDevelopmentFees: dailyFees.developmentFees,
            cumulativeJackpot,
            cumulativeBurned,
            cumulativeLiquidity,
            cumulativeDevelopment,
            remainingSupply,
            burnedPercent: (cumulativeBurned / TOTAL_SUPPLY) * 100
        });
    }
    
    return dailyResults;
}

/**
 * Analyze jackpot growth and payout frequency
 */
function analyzeJackpotDynamics(simulationResults, avgWinProbability, avgSwapSize) {
    const results = [];
    
    // Start with initial jackpot
    let currentJackpot = 0;
    let totalPaidOut = 0;
    let winCount = 0;
    
    // Process each day
    simulationResults.forEach((day, index) => {
        // Add daily fees to jackpot
        currentJackpot += day.dailyJackpotFees;
        
        // Estimate number of swaps per day (simplified)
        const estimatedSwaps = day.volume / avgSwapSize;
        
        // Estimate number of wins
        const expectedWins = estimatedSwaps * avgWinProbability;
        
        // If probability suggests wins, process them
        if (expectedWins >= 1) {
            const fullWins = Math.floor(expectedWins);
            const partialWin = expectedWins - fullWins;
            
            // Process full wins
            for (let i = 0; i < fullWins; i++) {
                totalPaidOut += currentJackpot;
                winCount++;
                currentJackpot = 0;
                
                // Refill from remaining day's fees
                const remainingDayPercentage = (i + 1) / fullWins;
                currentJackpot += day.dailyJackpotFees * remainingDayPercentage;
            }
        } else {
            // Handle probability of partial win
            const winRoll = Math.random();
            if (winRoll < expectedWins) {
                totalPaidOut += currentJackpot;
                winCount++;
                currentJackpot = 0;
            }
        }
        
        // Store results
        results.push({
            day: day.day,
            jackpotSize: currentJackpot,
            totalPaidOut,
            winCount
        });
    });
    
    return results;
}

/**
 * Analyze how different volume levels affect fee generation
 */
function volumeSensitivityAnalysis() {
    const volumeLevels = [
        500000,    // 500K daily volume
        1000000,   // 1M daily volume
        2000000,   // 2M daily volume
        5000000    // 5M daily volume
    ];
    
    const results = [];
    
    volumeLevels.forEach(volume => {
        // Simulate 30 days with this volume
        const simulation = simulateFeesOverTime(30, volume, PERCENT_SELLS);
        const lastDay = simulation[simulation.length - 1];
        
        results.push({
            dailyVolume: volume.toLocaleString(),
            monthlyJackpotFees: lastDay.cumulativeJackpot.toLocaleString(),
            monthlyBurned: lastDay.cumulativeBurned.toLocaleString(),
            burnedPercent: lastDay.burnedPercent.toFixed(4) + '%',
            monthlyLiquidityAdded: lastDay.cumulativeLiquidity.toLocaleString(),
            jackpotGrowthPerDay: (lastDay.cumulativeJackpot / 30).toLocaleString()
        });
    });
    
    return results;
}

/**
 * Main simulation function
 */
async function main() {
    console.log("=== REDDRAGON FEE GENERATION SIMULATION ===");
    console.log("System Parameters:");
    console.log(`- Total Supply: ${TOTAL_SUPPLY.toLocaleString()} tokens`);
    console.log(`- Initial Liquidity: ${INITIAL_LIQUIDITY.toLocaleString()} tokens`);
    console.log(`- Target Daily Volume: ${DAILY_VOLUME.toLocaleString()} tokens`);
    console.log(`- Percentage of Sells: ${PERCENT_SELLS * 100}%`);
    console.log("\nFee Structure:");
    console.log(`- Total Fee: ${TOTAL_FEE * 100}%`);
    console.log(`- Jackpot Fee: ${JACKPOT_FEE * 100}%`);
    console.log(`- Burn Fee: ${BURN_FEE * 100}%`);
    console.log(`- Liquidity Fee: ${LIQUIDITY_FEE * 100}%`);
    console.log(`- Development Fee: ${DEVELOPMENT_FEE * 100}%`);
    
    // Run simulation
    console.log("\n=== SIMULATING FEE GENERATION OVER TIME ===");
    const simulationResults = simulateFeesOverTime(DAYS_TO_SIMULATE, DAILY_VOLUME, PERCENT_SELLS);
    
    // Display key days from simulation
    const keyDays = [0, 6, 13, 20, 29];
    const displayResults = keyDays.map(i => simulationResults[i]);
    
    console.log("\n=== FEE ACCUMULATION OVER TIME ===");
    console.table(displayResults.map(day => ({
        day: day.day,
        dailyVolume: day.volume.toLocaleString(),
        dailySellVolume: day.sellVolume.toLocaleString(),
        jackpotFees: day.cumulativeJackpot.toLocaleString(),
        tokensBurned: day.cumulativeBurned.toLocaleString(),
        burnPercent: day.burnedPercent.toFixed(4) + '%',
        liquidityAdded: day.cumulativeLiquidity.toLocaleString()
    })));
    
    // Analyze jackpot dynamics with 10% average win probability on 10,000 token swaps
    console.log("\n=== JACKPOT GROWTH & PAYOUT SIMULATION ===");
    const avgWinProbability = 0.10; // 10% average win probability
    const avgSwapSize = 10000;      // 10,000 tokens average swap
    const jackpotDynamics = analyzeJackpotDynamics(simulationResults, avgWinProbability, avgSwapSize);
    
    console.table(keyDays.map(i => ({
        day: jackpotDynamics[i].day,
        jackpotSize: jackpotDynamics[i].jackpotSize.toLocaleString(),
        winsSoFar: jackpotDynamics[i].winCount,
        totalPaidOut: jackpotDynamics[i].totalPaidOut.toLocaleString()
    })));
    
    // Analyze different volume scenarios
    console.log("\n=== VOLUME SENSITIVITY ANALYSIS ===");
    const volumeAnalysis = volumeSensitivityAnalysis();
    console.table(volumeAnalysis);
    
    // Summary statistics
    const lastDay = simulationResults[simulationResults.length - 1];
    console.log("\n=== SUMMARY AFTER 30 DAYS ===");
    console.log(`- Total tokens sent to jackpot: ${lastDay.cumulativeJackpot.toLocaleString()}`);
    console.log(`- Total tokens burned: ${lastDay.cumulativeBurned.toLocaleString()} (${lastDay.burnedPercent.toFixed(4)}% of supply)`);
    console.log(`- Total tokens added to liquidity: ${lastDay.cumulativeLiquidity.toLocaleString()}`);
    console.log(`- Projected annual burn rate: ${(lastDay.cumulativeBurned * 12).toLocaleString()} tokens (${(lastDay.burnedPercent * 12).toFixed(4)}% of supply)`);
    
    const lastJackpotDay = jackpotDynamics[jackpotDynamics.length - 1];
    console.log(`- Estimated number of jackpot wins: ${lastJackpotDay.winCount}`);
    console.log(`- Average jackpot size: ${(lastJackpotDay.totalPaidOut / (lastJackpotDay.winCount || 1)).toLocaleString()} tokens`);
}

// Execute main function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 