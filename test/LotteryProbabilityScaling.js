const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Lottery Probability Scaling Test", function () {
  // Simulate the win probability calculation logic with TRUE LINEAR SCALING
  // Unlike the previous implementation that scaled the threshold linearly,
  // this version scales the actual probability linearly
  function calculateWinProbability(swapAmount) {
    // Convert to wei (18 decimals) for realistic testing
    const amountInWei = ethers.utils.parseEther(swapAmount.toString());
    
    // Define the probability range
    const minProbability = 0.0004; // 0.0004% at $1
    const maxProbability = 4.0;    // 4% at $10,000
    
    // Calculate win probability based on amount (linear interpolation)
    let winProbabilityPercentage;
    
    if (amountInWei.lte(ethers.utils.parseEther("1"))) {
      // $1 or less: 0.0004%
      winProbabilityPercentage = minProbability;
    } else if (amountInWei.gte(ethers.utils.parseEther("10000"))) {
      // $10,000 or more: 4%
      winProbabilityPercentage = maxProbability;
    } else {
      // Linear interpolation between $1 and $10,000
      const minAmount = 1;
      const maxAmount = 10000;
      const swapAmountNum = parseFloat(swapAmount);
      
      // Calculate normalized position in the range [0,1]
      const normalizedPosition = (swapAmountNum - minAmount) / (maxAmount - minAmount);
      
      // Linear interpolation of probability
      winProbabilityPercentage = minProbability + normalizedPosition * (maxProbability - minProbability);
    }
    
    // Convert probability to threshold
    // If probability is X%, then threshold is (100/X)
    const threshold = Math.round(100 / winProbabilityPercentage);
    
    return { 
      threshold: threshold,
      probability: winProbabilityPercentage
    };
  }

  it("Should provide 0.0004% chance for $1 swap", function() {
    const { probability, threshold } = calculateWinProbability(1);
    expect(probability).to.be.closeTo(0.0004, 0.00005);
    expect(threshold).to.be.closeTo(250000, 100); // 1 in 250,000
  });

  it("Should provide 4% chance for $10,000 swap", function() {
    const { probability, threshold } = calculateWinProbability(10000);
    expect(probability).to.be.closeTo(4.0, 0.05);
    expect(threshold).to.be.closeTo(25, 1); // 1 in 25
  });

  it("Should scale probability linearly between $1 and $10,000", function() {
    // Test at 10% of the way from $1 to $10,000 ($1,000)
    const result1000 = calculateWinProbability(1000);
    // Should be 10% of the way from 0.0004% to 4%
    const expectedProbability1000 = 0.0004 + 0.1 * (4.0 - 0.0004);
    expect(result1000.probability).to.be.closeTo(expectedProbability1000, 0.001);
    
    // Test at 50% of the way ($5,000)
    const result5000 = calculateWinProbability(5000);
    // Should be 50% of the way from 0.0004% to 4%
    const expectedProbability5000 = 0.0004 + 0.5 * (4.0 - 0.0004);
    expect(result5000.probability).to.be.closeTo(expectedProbability5000, 0.01);
    
    // Test at 75% of the way ($7,500)
    const result7500 = calculateWinProbability(7500);
    // Should be 75% of the way from 0.0004% to 4%
    const expectedProbability7500 = 0.0004 + 0.75 * (4.0 - 0.0004);
    expect(result7500.probability).to.be.closeTo(expectedProbability7500, 0.01);
  });

  it("Should handle small amounts correctly", function() {
    // Test $0.1 
    const resultSmall = calculateWinProbability(0.1);
    expect(resultSmall.probability).to.be.closeTo(0.0004, 0.00005);
  });

  it("Should handle large amounts correctly", function() {
    // Test $50,000 (should cap at 4%)
    const resultLarge = calculateWinProbability(50000);
    expect(resultLarge.probability).to.be.closeTo(4.0, 0.05);
  });

  it("Should print values at various points for verification", function() {
    const testAmounts = [1, 10, 100, 500, 1000, 2500, 5000, 7500, 9000, 9500, 9900, 9990, 10000];
    
    console.log("\nLinear win probability scaling test results:");
    console.log("------------------------------------");
    console.log("Amount ($) | Threshold | Win Probability (%)");
    console.log("------------------------------------");
    
    for (const amount of testAmounts) {
      const { threshold, probability } = calculateWinProbability(amount);
      console.log(`$${amount.toString().padEnd(9)} | ${threshold.toString().padEnd(9)} | ${probability.toFixed(6)}%`);
    }
    
    // This test always passes, it's just for informational output
    expect(true).to.be.true;
  });
}); 