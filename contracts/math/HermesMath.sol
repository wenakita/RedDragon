// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title HermesMath
 * @dev Mathematical library implementing the Hermès formula for dynamic jackpot distribution
 */
library HermesMath {
    using SafeMath for uint256;
    
    // Constants for fixed-point arithmetic
    uint256 private constant PRECISION = 1e18;
    uint256 private constant SQRT_PRECISION = 1e9;
    
    /**
     * @notice Calculate jackpot distribution using the Hermès formula
     * @param x Current jackpot size (scaled by 1e18)
     * @param d Protocol constant D (governance parameter)
     * @param n Protocol constant N (governance parameter)
     * @return Distribution value according to Hermès formula
     */
    function calculateHermesValue(uint256 x, uint256 d, uint256 n) internal pure returns (uint256) {
        // Handle edge cases
        if (x == 0) return 0;
        
        // Step 1: Calculate the component under the cube root
        // For numerical stability, we'll implement a simplified approximation
        uint256 component1 = approximateComponent1(x, d, n);
        
        // Step 2: Calculate the cube root
        uint256 cubeRoot = approximateCubeRoot(component1);
        
        // Step 3: Calculate the second component
        uint256 component2 = approximateComponent2(x, cubeRoot);
        
        // Return the result (ensuring no underflow)
        if (component2 >= cubeRoot) return 0;
        return cubeRoot.sub(component2);
    }
    
    /**
     * @notice Calculate the distribution percentages for jackpot tiers
     * @param jackpotSize Current jackpot size (in wS tokens)
     * @param totalParticipants Number of lottery participants
     * @param params Additional parameters (can include d and n values)
     * @return mainPrize Percentage for main winner (scaled by 1e18)
     * @return secondaryPrize Percentage for secondary winners (scaled by 1e18)
     * @return participationRewards Percentage for participation rewards (scaled by 1e18)
     */
    function calculateJackpotDistribution(
        uint256 jackpotSize,
        uint256 totalParticipants,
        uint256[4] memory params
    ) external pure returns (
        uint256 mainPrize,
        uint256 secondaryPrize,
        uint256 participationRewards
    ) {
        // Extract parameters
        uint256 d = params[0] == 0 ? 100 * PRECISION : params[0]; // Default d = 100
        uint256 n = params[1] == 0 ? 10 * PRECISION : params[1];  // Default n = 10
        uint256 minMainPrize = params[2] == 0 ? 70 * PRECISION / 100 : params[2]; // Minimum 70% for main prize
        uint256 maxMainPrize = params[3] == 0 ? 95 * PRECISION / 100 : params[3]; // Maximum 95% for main prize
        
        // Apply scaling factor based on total participants
        // This encourages more secondary prizes as participation increases
        uint256 participantFactor = calculateParticipantFactor(totalParticipants);
        
        // Calculate normalized Hermès value (0 to 1 scale)
        uint256 x = jackpotSize;
        uint256 hermesValue = calculateHermesValue(x, d, n);
        uint256 normalizedValue = hermesValue.mul(PRECISION).div(x.add(hermesValue));
        
        // Calculate main prize percentage (between minMainPrize and maxMainPrize)
        mainPrize = minMainPrize.add(
            normalizedValue.mul(maxMainPrize.sub(minMainPrize)).div(PRECISION)
        );
        
        // Adjust based on participant factor
        mainPrize = mainPrize.mul(PRECISION.sub(participantFactor)).div(PRECISION);
        
        // Ensure main prize is within bounds
        if (mainPrize < minMainPrize) mainPrize = minMainPrize;
        if (mainPrize > maxMainPrize) mainPrize = maxMainPrize;
        
        // Calculate secondary prizes (larger when more participants)
        secondaryPrize = PRECISION.sub(mainPrize).mul(80).div(100);
        
        // Participation rewards get the remainder
        participationRewards = PRECISION.sub(mainPrize).sub(secondaryPrize);
        
        return (mainPrize, secondaryPrize, participationRewards);
    }
    
    /**
     * @notice Calculate factor based on number of participants
     * @param participants Number of lottery participants
     * @return factor Scaling factor for distribution (0 to 0.3)
     */
    function calculateParticipantFactor(uint256 participants) internal pure returns (uint256) {
        if (participants <= 10) return 0;
        
        // Logarithmic scaling with participant count
        // More participants = higher factor = more secondary prizes
        uint256 factor = participants.mul(3).div(100);
        
        // Cap at 30%
        if (factor > 3 * PRECISION / 10) return 3 * PRECISION / 10;
        return factor.mul(PRECISION).div(100);
    }
    
    /**
     * @notice Approximate the first component of the Hermès formula
     * @dev Simplified approximation for gas efficiency
     */
    function approximateComponent1(uint256 x, uint256 d, uint256 n) internal pure returns (uint256) {
        // For reasonable approximation within gas limits:
        // We're using a simplified version that captures the essence of the formula
        uint256 x4 = x.mul(x).mul(x).mul(x);
        uint256 dTermExp = n.add(2);
        uint256 dTerm = d;
        
        // Simplified exponentiation
        for (uint256 i = 1; i < dTermExp && i < 10; i++) {
            dTerm = dTerm.mul(d).div(PRECISION);
        }
        
        // Combine terms with appropriate scaling
        return x4.add(dTerm.div(n.mul(n)));
    }
    
    /**
     * @notice Approximate the second component of the Hermès formula
     */
    function approximateComponent2(uint256 x, uint256 cubeRoot) internal pure returns (uint256) {
        if (cubeRoot == 0) return 0;
        
        uint256 x2 = x.mul(x).div(PRECISION);
        return x2.mul(PRECISION).div(cubeRoot.mul(3));
    }
    
    /**
     * @notice Calculate cube root using Newton's method
     * @param _value Value to calculate cube root of
     * @return result Approximated cube root
     */
    function approximateCubeRoot(uint256 _value) internal pure returns (uint256) {
        if (_value == 0) return 0;
        if (_value == PRECISION) return PRECISION;
        
        // Start with a reasonable guess
        uint256 x = _value;
        uint256 y = _value;
        
        // Newton's method iteration (limited to avoid gas issues)
        for (uint256 i = 0; i < 8; i++) {
            // y = (2*x + _value/x^2)/3
            uint256 x2 = x.mul(x).div(PRECISION);
            if (x2 == 0) break;
            
            uint256 term1 = x.mul(2);
            uint256 term2 = _value.mul(PRECISION).div(x2).div(x);
            
            y = term1.add(term2).div(3);
            
            // Check for convergence
            if (y >= x) {
                if (y.sub(x) < PRECISION / 1000) break;
            } else {
                if (x.sub(y) < PRECISION / 1000) break;
            }
            
            x = y;
        }
        
        return x;
    }
    
    /**
     * @notice Calculate square root using Babylonian method
     * @param x Value to calculate square root of
     * @return y The square root
     */
    function sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        
        // Use OpenZeppelin's SafeMath for safe arithmetic
        uint256 z = x.add(1).div(2);
        y = x;
        
        while (z < y) {
            y = z;
            z = x.div(z).add(z).div(2);
        }
    }
} 