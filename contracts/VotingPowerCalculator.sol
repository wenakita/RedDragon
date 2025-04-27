// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VotingPowerCalculator
 * @dev Library for calculating voting power multipliers using cube root scaling
 * This creates a non-linear relationship between voting power and boost
 */
library VotingPowerCalculator {
    // Constants for precision and calculations
    uint256 private constant PRECISION = 10000;
    uint256 private constant PRECISION_SQRT = 100; // sqrt(PRECISION)
    uint256 private constant CUBE_ROOT_ITERATIONS = 8;

    /**
     * @dev Calculate boost multiplier based on voting power using cube root scaling
     * @param userVotingPower User's voting power
     * @param maxVotingPower Maximum voting power across all users
     * @param baseMultiplier Base multiplier (e.g., 10000 for 1x)
     * @param maxMultiplier Maximum multiplier (e.g., 25000 for 2.5x)
     * @return Boost multiplier (in PRECISION units)
     */
    function calculateBoostMultiplier(
        uint256 userVotingPower,
        uint256 maxVotingPower,
        uint256 baseMultiplier,
        uint256 maxMultiplier
    ) public pure returns (uint256) {
        // No voting power means base multiplier
        if (userVotingPower == 0 || maxVotingPower == 0) {
            return baseMultiplier;
        }
        
        // Cap userVotingPower at maxVotingPower for safety
        if (userVotingPower > maxVotingPower) {
            userVotingPower = maxVotingPower;
        }
        
        // Calculate maximum possible boost - pre-calculate for gas efficiency
        uint256 maxBoost = maxMultiplier - baseMultiplier;
        
        // Normalize voting power to PRECISION scale
        uint256 normalizedVP = (userVotingPower * PRECISION) / maxVotingPower;
        
        // Apply cube root scaling
        uint256 cubeRootNormalizedVP = _cubeRoot(normalizedVP);
        
        // Calculate boost percentage using cube root scaling
        uint256 boostPercentage = (cubeRootNormalizedVP * PRECISION) / PRECISION_SQRT;
        if (boostPercentage > PRECISION) {
            boostPercentage = PRECISION; // Cap at 100%
        }
        
        // Apply boost percentage to max boost
        uint256 boost = (maxBoost * boostPercentage) / PRECISION;
        
        // Return base multiplier plus the calculated boost
        return baseMultiplier + boost;
    }
    
    /**
     * @dev Calculate the cube root of a number using Newton's method
     * @param value The value to calculate the cube root of
     * @return The cube root of the value (in PRECISION units)
     */
    function _cubeRoot(uint256 value) private pure returns (uint256) {
        if (value == 0) return 0;
        if (value == PRECISION) return PRECISION_SQRT;
        
        // Initial guess - a good starting point improves convergence
        uint256 x = PRECISION;
        
        // Newton's method: x = x - (x^3 - value) / (3 * x^2)
        for (uint256 i = 0; i < CUBE_ROOT_ITERATIONS; i++) {
            // Calculate x^3
            uint256 x3 = (((x * x) / PRECISION) * x) / PRECISION;
            
            // If x^3 is already close enough to value, return x
            if (x3 <= value + 10 && x3 >= value - 10) {
                return x;
            }
            
            // Calculate (x^3 - value) / (3 * x^2)
            uint256 numerator;
            if (x3 > value) {
                numerator = x3 - value;
            } else {
                numerator = value - x3;
                // If x^3 < value, we need to increase x in the next step
                if (x3 < value) {
                    x = x + (numerator * PRECISION) / (3 * ((x * x) / PRECISION));
                    continue;
                }
            }
            
            uint256 denominator = 3 * ((x * x) / PRECISION);
            
            // Update x for next iteration
            if (denominator == 0) break;
            
            uint256 delta = (numerator * PRECISION) / denominator;
            if (delta >= x) {
                x = x / 2; // Avoid overshooting
            } else {
                x = x - delta;
            }
        }
        
        return x;
    }
} 