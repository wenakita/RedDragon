const { expect } = require("chai");

describe("LP Booster Curve Calculation Test", function () {
  // Test the curve boost calculation in isolation
  
  it("Should apply 0.69% boost to a user with LP tokens", function () {
    // Base probability value (e.g., 5%)
    const baseProbability = 50;
    
    // Boost percentage (0.69%)
    const boostPercentage = 69;
    const boostPrecision = 10000;
    
    // Calculate boosted probability
    const boostMultiplier = boostPrecision + boostPercentage;
    const boostedProbability = Math.floor((baseProbability * boostMultiplier) / boostPrecision);
    
    // Expected: baseProbability * (1 + 69/10000) = baseProbability * 1.0069
    const expectedBoostedProbability = Math.floor(baseProbability * 1.0069);
    
    expect(boostedProbability).to.equal(expectedBoostedProbability);
    expect(boostedProbability).to.equal(50); // Due to rounding down with integer math
  });
  
  it("Should apply 3% boost to a user with more LP tokens", function () {
    // Base probability value (e.g., 5%)
    const baseProbability = 50;
    
    // Boost percentage (3%)
    const boostPercentage = 300;
    const boostPrecision = 10000;
    
    // Calculate boosted probability
    const boostMultiplier = boostPrecision + boostPercentage;
    const boostedProbability = Math.floor((baseProbability * boostMultiplier) / boostPrecision);
    
    // Expected: baseProbability * (1 + 300/10000) = baseProbability * 1.03
    const expectedBoostedProbability = Math.floor(baseProbability * 1.03);
    
    expect(boostedProbability).to.equal(expectedBoostedProbability);
    expect(boostedProbability).to.equal(51); // 50 * 1.03 = 51.5, rounds down to 51
  });
  
  it("Should apply 5% boost to a user with many LP tokens", function () {
    // Base probability value (e.g., 5%)
    const baseProbability = 50;
    
    // Boost percentage (5%)
    const boostPercentage = 500;
    const boostPrecision = 10000;
    
    // Calculate boosted probability
    const boostMultiplier = boostPrecision + boostPercentage;
    const boostedProbability = Math.floor((baseProbability * boostMultiplier) / boostPrecision);
    
    // Expected: baseProbability * (1 + 500/10000) = baseProbability * 1.05
    const expectedBoostedProbability = Math.floor(baseProbability * 1.05);
    
    expect(boostedProbability).to.equal(expectedBoostedProbability);
    expect(boostedProbability).to.equal(52); // 50 * 1.05 = 52.5, rounds down to 52
  });
  
  it("Should apply boost correctly to different base probabilities", function () {
    const boostPercentage = 300; // 3% boost
    const boostPrecision = 10000;
    const boostMultiplier = boostPrecision + boostPercentage;
    
    // Test different base probabilities
    const testCases = [
      { base: 10, expected: Math.floor(10 * 1.03) }, // 1% probability
      { base: 30, expected: Math.floor(30 * 1.03) }, // 3% probability
      { base: 50, expected: Math.floor(50 * 1.03) }, // 5% probability
      { base: 100, expected: Math.floor(100 * 1.03) }, // 10% probability
      { base: 500, expected: Math.floor(500 * 1.03) } // 50% probability
    ];
    
    // Test each case
    for (const testCase of testCases) {
      const boostedProbability = Math.floor((testCase.base * boostMultiplier) / boostPrecision);
      expect(boostedProbability).to.equal(testCase.expected);
    }
  });
  
  it("Should cap boosted probability at maximum allowed", function () {
    // Base probability is 95%
    const baseProbability = 950;
    
    // Boost percentage (10%)
    const boostPercentage = 1000;
    const boostPrecision = 10000;
    
    // Calculate raw boosted probability
    const boostMultiplier = boostPrecision + boostPercentage;
    const rawBoostedProbability = Math.floor((baseProbability * boostMultiplier) / boostPrecision);
    
    // Expected raw boost: baseProbability * (1 + 1000/10000) = baseProbability * 1.1
    const expectedRawBoostedProbability = Math.floor(baseProbability * 1.1);
    expect(rawBoostedProbability).to.equal(expectedRawBoostedProbability);
    
    // Now apply cap (assuming MAX_PROBABILITY = 1000)
    const MAX_PROBABILITY = 1000;
    const finalProbability = Math.min(rawBoostedProbability, MAX_PROBABILITY);
    
    // The final capped probability should be MAX_PROBABILITY
    expect(finalProbability).to.equal(MAX_PROBABILITY);
  });
  
  it("Should handle tiered boost system correctly", function () {
    // Base probability value (e.g., 5%)
    const baseProbability = 50;
    
    // Define boost tiers
    const tiers = [
      { minLpAmount: 1, boostPercentage: 69 },  // 0.69% boost
      { minLpAmount: 10, boostPercentage: 150 }, // 1.5% boost
      { minLpAmount: 100, boostPercentage: 300 }, // 3% boost
      { minLpAmount: 1000, boostPercentage: 500 } // 5% boost
    ];
    
    // Test different LP balances against tiers
    const testCases = [
      { lpBalance: 0, expectedBoost: 0 }, // No LP, no boost
      { lpBalance: 5, expectedBoost: 69 }, // Tier 1
      { lpBalance: 50, expectedBoost: 150 }, // Tier 2
      { lpBalance: 500, expectedBoost: 300 }, // Tier 3
      { lpBalance: 5000, expectedBoost: 500 }  // Tier 4
    ];
    
    // Simulate tier selection logic
    function calculateTieredBoost(lpBalance) {
      // Start with no boost
      let boost = 0;
      
      // Find the highest tier the user qualifies for
      for (const tier of tiers) {
        if (lpBalance >= tier.minLpAmount) {
          boost = tier.boostPercentage;
        } else {
          break;
        }
      }
      
      return boost;
    }
    
    // Test each case
    for (const testCase of testCases) {
      const boost = calculateTieredBoost(testCase.lpBalance);
      expect(boost).to.equal(testCase.expectedBoost);
      
      // Apply the boost if there is one
      if (boost > 0) {
        const boostPrecision = 10000;
        const boostMultiplier = boostPrecision + boost;
        const boostedProbability = Math.floor((baseProbability * boostMultiplier) / boostPrecision);
        
        // Expected: baseProbability * (1 + boost/10000)
        const expectedBoostedProbability = Math.floor(baseProbability * (1 + boost/10000));
        expect(boostedProbability).to.equal(expectedBoostedProbability);
      }
    }
  });
}); 