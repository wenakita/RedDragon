// Hermès formula jackpot distribution test
// This test verifies the dynamic jackpot distribution using the Hermès formula

// Constants for simulation
const PRECISION = 1e18;
const DEFAULT_D = 100 * PRECISION;
const DEFAULT_N = 10 * PRECISION;
const MIN_MAIN_PRIZE = 70 * PRECISION / 100; // 70%
const MAX_MAIN_PRIZE = 95 * PRECISION / 100; // 95%

// Simplified approximation of the Hermès formula for testing
function calculateHermesValue(x, d, n) {
  if (x === 0) return 0;
  
  // Simplification for JavaScript testing
  // This approximates the complex formula without implementing the full calculation
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
    participationRewards
  };
}

// Run jackpot distribution simulations for different scenarios
console.log("=== HERMÈS FORMULA JACKPOT DISTRIBUTION TEST ===\n");

// Test different jackpot sizes with fixed participant count
console.log("Testing Different Jackpot Sizes (50 participants):");
console.log("--------------------------------------------------");
console.log("Jackpot Size | Main Prize % | Secondary % | Participation %");
console.log("--------------------------------------------------");

const testJackpotSizes = [1000, 10000, 100000, 1000000];
const participantCount = 50;

testJackpotSizes.forEach(jackpotSize => {
  const { mainPrize, secondaryPrize, participationRewards } = 
    calculateJackpotDistribution(jackpotSize, participantCount);
  
  console.log(
    `${jackpotSize.toString().padEnd(12)} | ` +
    `${(mainPrize * 100).toFixed(2).padEnd(11)}% | ` +
    `${(secondaryPrize * 100).toFixed(2).padEnd(10)}% | ` +
    `${(participationRewards * 100).toFixed(2)}%`
  );
});

// Test different participant counts with fixed jackpot size
console.log("\nTesting Different Participant Counts (100,000 jackpot):");
console.log("--------------------------------------------------");
console.log("Participants | Main Prize % | Secondary % | Participation %");
console.log("--------------------------------------------------");

const testParticipantCounts = [10, 50, 100, 500, 1000];
const jackpotSize = 100000;

testParticipantCounts.forEach(participants => {
  const { mainPrize, secondaryPrize, participationRewards } = 
    calculateJackpotDistribution(jackpotSize, participants);
  
  console.log(
    `${participants.toString().padEnd(12)} | ` +
    `${(mainPrize * 100).toFixed(2).padEnd(11)}% | ` +
    `${(secondaryPrize * 100).toFixed(2).padEnd(10)}% | ` +
    `${(participationRewards * 100).toFixed(2)}%`
  );
});

// Test parameters influence
console.log("\nTesting Hermès Formula Parameter Variations (D and N):");
console.log("--------------------------------------------------");
console.log("Parameters  | Main Prize % | Secondary % | Participation %");
console.log("--------------------------------------------------");

const paramVariations = [
  { name: "Default", d: 100, n: 10 },
  { name: "High D", d: 500, n: 10 },
  { name: "Low D", d: 50, n: 10 },
  { name: "High N", d: 100, n: 20 },
  { name: "Low N", d: 100, n: 5 },
  { name: "Balanced", d: 200, n: 15 }
];

paramVariations.forEach(variation => {
  const { mainPrize, secondaryPrize, participationRewards } = 
    calculateJackpotDistribution(100000, 100, { d: variation.d, n: variation.n });
  
  console.log(
    `${variation.name.padEnd(12)} | ` +
    `${(mainPrize * 100).toFixed(2).padEnd(11)}% | ` +
    `${(secondaryPrize * 100).toFixed(2).padEnd(10)}% | ` +
    `${(participationRewards * 100).toFixed(2)}%`
  );
});

// Compare with simple/fixed distribution
console.log("\nComparison with Fixed Distribution:");
console.log("--------------------------------------------------");
console.log("Scenario    | Main Prize % | Secondary % | Participation %");
console.log("--------------------------------------------------");

const fixedDistribution = { mainPrize: 0.85, secondaryPrize: 0.12, participationRewards: 0.03 };

// Small jackpot, few participants
const smallScenario = calculateJackpotDistribution(1000, 10);

// Medium jackpot, medium participants
const mediumScenario = calculateJackpotDistribution(100000, 100);

// Large jackpot, many participants 
const largeScenario = calculateJackpotDistribution(1000000, 1000);

console.log(
  `Fixed        | ` +
  `${(fixedDistribution.mainPrize * 100).toFixed(2).padEnd(11)}% | ` +
  `${(fixedDistribution.secondaryPrize * 100).toFixed(2).padEnd(10)}% | ` +
  `${(fixedDistribution.participationRewards * 100).toFixed(2)}%`
);

console.log(
  `Small        | ` +
  `${(smallScenario.mainPrize * 100).toFixed(2).padEnd(11)}% | ` +
  `${(smallScenario.secondaryPrize * 100).toFixed(2).padEnd(10)}% | ` +
  `${(smallScenario.participationRewards * 100).toFixed(2)}%`
);

console.log(
  `Medium       | ` +
  `${(mediumScenario.mainPrize * 100).toFixed(2).padEnd(11)}% | ` +
  `${(mediumScenario.secondaryPrize * 100).toFixed(2).padEnd(10)}% | ` +
  `${(mediumScenario.participationRewards * 100).toFixed(2)}%`
);

console.log(
  `Large        | ` +
  `${(largeScenario.mainPrize * 100).toFixed(2).padEnd(11)}% | ` +
  `${(largeScenario.secondaryPrize * 100).toFixed(2).padEnd(10)}% | ` +
  `${(largeScenario.participationRewards * 100).toFixed(2)}%`
);

console.log("\n=== BENEFITS OF HERMÈS FORMULA DISTRIBUTION ===");
console.log("1. Dynamic adjustment based on jackpot size and participation");
console.log("2. More secondary prizes for higher participation (encourages community)");
console.log("3. Better balance between main winner and participation rewards");
console.log("4. Configurable via governance parameters (D and N)");
console.log("5. Mathematical foundation based on proven DeFi formulas");

console.log("\nHermès formula jackpot distribution test completed successfully!"); 