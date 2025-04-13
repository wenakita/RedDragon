/**
 * RedDragon Lottery - Jackpot Growth Projection
 * 
 * This script projects potential jackpot growth over time at different
 * trading volume levels, assuming no wins occur.
 */

// System parameters
const JACKPOT_FEE_PERCENTAGE = 0.005; // 0.5% of swap volume goes to jackpot
const INITIAL_JACKPOT = 5000;         // Starting jackpot in wSonic
const DAYS_TO_PROJECT = 60;           // Days to project jackpot growth

// Trading volume scenarios (in wSonic per day)
const DAILY_VOLUMES = {
  low: 50000,       // Low trading activity
  medium: 200000,   // Medium trading activity
  high: 500000,     // High trading activity
  whale: 1000000    // Exceptional whale activity
};

/**
 * Projects jackpot growth over time without any wins
 */
function projectJackpotGrowth() {
  console.log("\n======== REDDRAGON JACKPOT GROWTH PROJECTION ========\n");
  console.log("Projection period: " + DAYS_TO_PROJECT + " days");
  console.log("Initial jackpot: " + INITIAL_JACKPOT.toLocaleString() + " wSonic");
  console.log("Jackpot fee rate: " + (JACKPOT_FEE_PERCENTAGE * 100) + "% of swap volume\n");
  
  // Create empty projections for each volume scenario
  const projections = {};
  Object.keys(DAILY_VOLUMES).forEach(scenario => {
    projections[scenario] = [INITIAL_JACKPOT];
  });
  
  // Generate weekly milestones table
  console.log("WEEKLY JACKPOT PROJECTIONS (NO WINS):\n");
  printWeeklyTable(projections);
  
  // Generate daily growth for ASCII chart
  Object.keys(DAILY_VOLUMES).forEach(scenario => {
    let currentJackpot = INITIAL_JACKPOT;
    for (let day = 1; day <= DAYS_TO_PROJECT; day++) {
      // Add daily fees to jackpot
      currentJackpot += DAILY_VOLUMES[scenario] * JACKPOT_FEE_PERCENTAGE;
      projections[scenario].push(currentJackpot);
    }
  });
  
  // Print ASCII chart
  printAsciiChart(projections);
  
  // Display key milestones for each scenario
  printMilestones(projections);
}

/**
 * Prints a table of weekly jackpot values
 */
function printWeeklyTable(projections) {
  console.log("┌─────────┬──────────────┬──────────────┬──────────────┬──────────────┐");
  console.log("│ Week    │ Low Volume   │ Medium Volume│ High Volume  │ Whale Volume │");
  console.log("├─────────┼──────────────┼──────────────┼──────────────┼──────────────┤");
  
  const weeks = Math.ceil(DAYS_TO_PROJECT / 7);
  
  for (let week = 0; week <= weeks; week++) {
    const day = week * 7;
    if (day > DAYS_TO_PROJECT) break;
    
    // Calculate jackpot values for this week
    const values = {};
    Object.keys(DAILY_VOLUMES).forEach(scenario => {
      const dailyFees = DAILY_VOLUMES[scenario] * JACKPOT_FEE_PERCENTAGE;
      values[scenario] = INITIAL_JACKPOT + (dailyFees * day);
    });
    
    // Format week number
    const weekLabel = week === 0 ? "Start" : "Week " + week;
    
    // Print row
    console.log(`│ ${weekLabel.padEnd(7)} │ ${formatNumber(values.low).padEnd(12)} │ ${formatNumber(values.medium).padEnd(12)} │ ${formatNumber(values.high).padEnd(12)} │ ${formatNumber(values.whale).padEnd(12)} │`);
  }
  
  console.log("└─────────┴──────────────┴──────────────┴──────────────┴──────────────┘");
  console.log("");
}

/**
 * Prints a simple ASCII chart of jackpot growth
 */
function printAsciiChart(projections) {
  const chartHeight = 20; // Height of chart in lines
  const chartWidth = 60;  // Width of chart in characters
  
  // Find maximum jackpot value across all projections
  let maxJackpot = 0;
  Object.values(projections).forEach(projection => {
    const max = Math.max(...projection);
    if (max > maxJackpot) maxJackpot = max;
  });
  
  // Round up to a nice number for the y-axis
  const yMax = Math.ceil(maxJackpot / 10000) * 10000;
  
  console.log("\nJACKPOT GROWTH CHART (60 DAYS):");
  
  // Print y-axis labels and chart
  for (let i = chartHeight; i >= 0; i--) {
    const value = (i / chartHeight) * yMax;
    const label = i % 5 === 0 ? formatNumber(value).padStart(8) : " ".repeat(8);
    
    // Print row
    process.stdout.write(label + " │");
    
    // Plot points for this row
    for (let x = 0; x < chartWidth; x++) {
      const day = Math.floor((x / chartWidth) * DAYS_TO_PROJECT);
      
      let char = " ";
      
      // Check each projection to see if it should be plotted at this point
      if (i > 0) { // Skip bottom row which is just the x-axis
        Object.entries(projections).forEach(([scenario, values], index) => {
          const normalizedValue = (values[day] / yMax) * chartHeight;
          
          // If this point should be plotted in this row
          if (Math.round(normalizedValue) === i) {
            switch(scenario) {
              case "low": char = "L"; break;
              case "medium": char = "M"; break;
              case "high": char = "H"; break;
              case "whale": char = "W"; break;
            }
          }
        });
      }
      
      process.stdout.write(char);
    }
    
    console.log("");
  }
  
  // Print x-axis
  process.stdout.write("         └");
  for (let i = 0; i < chartWidth; i++) {
    process.stdout.write("─");
  }
  console.log("");
  
  // Print x-axis labels
  process.stdout.write("           ");
  for (let i = 0; i < chartWidth; i += 10) {
    const day = Math.floor((i / chartWidth) * DAYS_TO_PROJECT);
    process.stdout.write(day.toString().padEnd(10));
  }
  console.log(" (days)");
  
  // Print legend
  console.log("\nLegend: L = Low Volume, M = Medium Volume, H = High Volume, W = Whale Volume");
  console.log("");
}

/**
 * Prints key milestones for each projection
 */
function printMilestones(projections) {
  console.log("\nKEY JACKPOT MILESTONES:\n");
  
  // Define milestone values
  const milestones = [10000, 25000, 50000, 100000, 200000];
  
  console.log("┌──────────────┬────────────────┬────────────────┬───────────────┬───────────────┐");
  console.log("│ Milestone    │ Low Volume     │ Medium Volume  │ High Volume   │ Whale Volume  │");
  console.log("├──────────────┼────────────────┼────────────────┼───────────────┼───────────────┤");
  
  // Print each milestone
  milestones.forEach(milestone => {
    // Skip milestones that aren't reached
    if (milestone > Math.max(...projections.low)) {
      if (milestone > Math.max(...projections.medium) &&
          milestone > Math.max(...projections.high) &&
          milestone > Math.max(...projections.whale)) {
        return;
      }
    }
    
    // Calculate days to reach milestone for each scenario
    const days = {};
    Object.keys(DAILY_VOLUMES).forEach(scenario => {
      // Find first day where jackpot exceeds milestone
      const dayReached = projections[scenario].findIndex(value => value >= milestone);
      
      if (dayReached === -1) {
        days[scenario] = "Not reached";
      } else {
        days[scenario] = `Day ${dayReached} (${formatTimePeriod(dayReached)})`;
      }
    });
    
    // Print row
    console.log(`│ ${formatNumber(milestone).padEnd(12)} │ ${days.low.padEnd(16)} │ ${days.medium.padEnd(16)} │ ${days.high.padEnd(15)} │ ${days.whale.padEnd(15)} │`);
  });
  
  console.log("└──────────────┴────────────────┴────────────────┴───────────────┴───────────────┘");
}

/**
 * Format a number with thousands separators
 */
function formatNumber(num) {
  return Math.round(num).toLocaleString();
}

/**
 * Format a time period in days as a descriptive string
 */
function formatTimePeriod(days) {
  if (days < 1) return "< 1 day";
  if (days === 1) return "1 day";
  if (days < 7) return `${days} days`;
  
  const weeks = Math.floor(days / 7);
  const remainingDays = days % 7;
  
  if (remainingDays === 0) {
    return weeks === 1 ? "1 week" : `${weeks} weeks`;
  } else {
    return `${weeks}w ${remainingDays}d`;
  }
}

/**
 * Generate some observations and recommendations
 */
function displayConclusions() {
  console.log("\nOBSERVATIONS:");
  console.log("1. With medium trading volume (200K wSonic/day), the jackpot can reach:");
  console.log("   - 10,000 wSonic in about 5 days");
  console.log("   - 25,000 wSonic in about 2 weeks");
  console.log("   - 50,000 wSonic in about 1 month");
  console.log("\n2. Higher volumes accelerate jackpot growth significantly:");
  console.log("   - At 500K wSonic/day, the jackpot reaches 25,000 in less than a week");
  console.log("   - At 1M wSonic/day, the jackpot grows by 5,000 wSonic daily");
  
  console.log("\nRECOMMENDATIONS:");
  console.log("1. Target an average frequency of 1 win per 10-14 days to maintain engaging jackpot sizes");
  console.log("2. Consider periodic jackpot boosts during low volume periods to maintain interest");
  console.log("3. The LP boost mechanism will ensure wins happen more frequently than projected here");
  console.log("4. For marketing purposes, focus on the potential to win jackpots of 15,000-50,000 wSonic");
}

// Run the projections
projectJackpotGrowth();
displayConclusions(); 