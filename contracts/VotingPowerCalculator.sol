// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

/**
 * @title VotingPowerCalculator
 * @dev Library for calculating voting power and boost multipliers
 * Uses cubic root normalization to provide a more equitable distribution
 */
library VotingPowerCalculator {
    /**
     * @dev Calculate cube root (implementation specific to our precision needs)
     * @param n The number to find the cube root of
     * @return The cube root of n, with precision
     */
    function cubeRoot(uint256 n) internal pure returns (uint256) {
        if (n == 0) return 0;
        
        uint256 x = n;
        uint256 y = (x + x / 3) / 2; // Initial guess
        
        // Approximate using Newton's method
        while (y < x) {
            x = y;
            y = (2 * x + n / (x * x)) / 3;
        }
        
        return x;
    }
    
    /**
     * @dev Calculate voting power using cube root normalization
     * @param amount The amount of tokens
     * @return votingPower The calculated voting power
     */
    function calculateVotingPower(uint256 amount) internal pure returns (uint256 votingPower) {
        if (amount == 0) return 0;
        
        // Use cube root for more equitable voting power distribution
        return cubeRoot(amount * 1e18) * 100;
    }
    
    /**
     * @dev Calculate boost multiplier based on user's share with cubic root normalization
     * @param userBalance User's token balance
     * @param totalSupply Total token supply
     * @param baseBoost Base boost value (e.g., 10000 = 100%)
     * @param maxBoost Maximum boost value (e.g., 25000 = 250%)
     * @return multiplier The calculated boost multiplier
     */
    function calculateBoostMultiplier(
        uint256 userBalance,
        uint256 totalSupply,
        uint256 baseBoost,
        uint256 maxBoost
    ) internal pure returns (uint256 multiplier) {
        if (userBalance == 0 || totalSupply == 0) {
            return baseBoost; // Default to base boost if no balance
        }
        
        // Calculate user's share using cube root for compression
        uint256 userVotingPower = calculateVotingPower(userBalance);
        uint256 totalVotingPower = calculateVotingPower(totalSupply);
        
        // Calculate compressed share percentage with high precision
        uint256 compressedSharePct = (userVotingPower * 1e18) / totalVotingPower;
        
        // Calculate boost within range from base to max
        uint256 boostRange = maxBoost - baseBoost;
        uint256 additionalBoost = (boostRange * compressedSharePct) / 1e18;
        
        // Ensure we don't exceed maxBoost
        uint256 calculatedBoost = baseBoost + additionalBoost;
        return calculatedBoost > maxBoost ? maxBoost : calculatedBoost;
    }
} 