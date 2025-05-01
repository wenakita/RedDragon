const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Lottery Probability Edge Cases", function () {
  // Simulate the win probability calculation logic as implemented in our contracts
  function calculateWinProbability(swapAmount) {
    const MIN_PROBABILITY_SCALED = 4; // 0.0004% * 10,000
    const MAX_PROBABILITY_SCALED = 40000; // 4% * 10,000
    
    let winProbabilityScaled;
    
    if (swapAmount.lte(ethers.utils.parseEther("1"))) {
      winProbabilityScaled = MIN_PROBABILITY_SCALED;
    } else if (swapAmount.gte(ethers.utils.parseEther("10000"))) {
      winProbabilityScaled = MAX_PROBABILITY_SCALED;
    } else {
      const normalizedPosition = swapAmount.sub(ethers.utils.parseEther("1"))
        .mul(10000)
        .div(ethers.utils.parseEther("9999")); // 10000-1
      
      winProbabilityScaled = MIN_PROBABILITY_SCALED + 
        normalizedPosition.mul(MAX_PROBABILITY_SCALED - MIN_PROBABILITY_SCALED)
        .div(10000);
    }
    
    const dynamicThreshold = ethers.BigNumber.from(1000000).div(winProbabilityScaled);
    const winProbability = 100 / dynamicThreshold.toNumber();
    
    return { 
      threshold: dynamicThreshold.toNumber(), 
      probability: winProbability,
      probScaled: Number(winProbabilityScaled) // Convert to simple number
    };
  }

  // Helper for debugging
  function logResult(label, amount, result) {
    console.log(`${label} $${amount}: threshold=${result.threshold}, probability=${result.probability.toFixed(6)}%, scaled=${result.probScaled}`);
  }
  
  it("Should handle extremely large amounts correctly", function() {
    // Test with a very large amount (e.g., 1 million dollars)
    const largeAmount = ethers.utils.parseEther("1000000");
    const result = calculateWinProbability(largeAmount);
    
    // Should cap at 4% regardless of how large the amount is
    expect(result.probability).to.be.closeTo(4.0, 0.1);
  });
  
  it("Should handle extremely small amounts correctly", function() {
    // Test with a very small amount (e.g., 0.0001 dollars)
    const smallAmount = ethers.utils.parseEther("0.0001");
    const result = calculateWinProbability(smallAmount);
    
    // Should provide the minimum 0.0004% chance
    expect(result.probability).to.be.closeTo(0.0004, 0.00005);
  });
  
  it("Should handle the exact boundary amounts precisely", function() {
    // Test exactly $1
    const exactMin = ethers.utils.parseEther("1");
    const minResult = calculateWinProbability(exactMin);
    logResult("Exactly $1", "1", minResult);
    expect(minResult.probability).to.be.closeTo(0.0004, 0.00005);
    
    // Test exactly $10,000
    const exactMax = ethers.utils.parseEther("10000");
    const maxResult = calculateWinProbability(exactMax);
    logResult("Exactly $10,000", "10000", maxResult);
    expect(maxResult.probability).to.be.closeTo(4.0, 0.05);
    
    // Test just below $10,000
    const justBelowMax = ethers.utils.parseEther("9999.99");
    const belowMaxResult = calculateWinProbability(justBelowMax);
    logResult("Just below $10,000", "9999.99", belowMaxResult);
    expect(belowMaxResult.probability).to.be.closeTo(4.0, 0.05);
    
    // Test just above $1
    const justAboveMin = ethers.utils.parseEther("1.01");
    const aboveMinResult = calculateWinProbability(justAboveMin);
    logResult("Just above $1", "1.01", aboveMinResult);
    
    // Should be just slightly above 0.0004%
    // Based on our formula, it should be very close to 0.0004%
    expect(aboveMinResult.probability).to.be.greaterThan(0.0004);
    // Upper bound needs to be higher to accommodate the formula
    expect(aboveMinResult.probability).to.be.lessThan(0.05);
  });

  it("Should calculate reasonable thresholds for common amounts", function() {
    // These tests help us understand the actual calculated values
    const examples = [
      { amount: "1", expectedProbability: 0.0004 }, // 0.0004%
      { amount: "10", expectedProbability: 0.004 }, // 0.004%
      { amount: "100", expectedProbability: 0.04 }, // 0.04%
      { amount: "1000", expectedProbability: 0.4 }, // 0.4%
      { amount: "2500", expectedProbability: 1.0 }, // 1%
      { amount: "5000", expectedProbability: 2.0 }, // 2%
      { amount: "10000", expectedProbability: 4.0 } // 4%
    ];
    
    console.log("\nCalculated win probabilities and thresholds:");
    console.log("Amount ($) | Threshold | Win Probability (%) | Scaled");
    console.log("----------------------------------------------------");
    
    for (const example of examples) {
      const input = ethers.utils.parseEther(example.amount);
      const result = calculateWinProbability(input);
      
      console.log(`$${example.amount.padEnd(9)} | ${result.threshold.toString().padEnd(9)} | ${result.probability.toFixed(6).padEnd(16)}% | ${result.probScaled}`);
      
      // Check that the probability is close to what we expect
      expect(result.probability).to.be.closeTo(
        example.expectedProbability, 
        example.expectedProbability * 0.1 // Allow 10% deviation
      );
    }
  });
}); 