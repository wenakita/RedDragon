// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../contracts/math/DragonMathLib.sol";

/**
 * @title DragonMathLibWrapper
 * @dev Wrapper contract to expose DragonMathLib's internal functions for testing
 */
contract DragonMathLibWrapper {
    // Expose the internal functions from DragonMathLib
    
    function cubeRoot(uint256 n) public pure returns (uint256) {
        return DragonMathLib.cubeRoot(n);
    }
    
    function calculateVotingPower(uint256 amount) public pure returns (uint256) {
        return DragonMathLib.calculateVotingPower(amount);
    }
    
    function calculateTimedVotingPower(
        uint256 amount,
        uint256 unlockTime,
        uint256 currentTime,
        uint256 maxLockTime
    ) public pure returns (uint256) {
        return DragonMathLib.calculateTimedVotingPower(amount, unlockTime, currentTime, maxLockTime);
    }
    
    function calculateBoostMultiplier(
        uint256 userBalance,
        uint256 totalSupply,
        uint256 baseBoost,
        uint256 maxBoost,
        uint256 boostPrecision
    ) public pure returns (uint256) {
        // Ignoring the boostPrecision parameter as it's no longer used in the library
        return DragonMathLib.calculateBoostMultiplier(userBalance, totalSupply, baseBoost, maxBoost);
    }
    
    function calculateWeightedAverage(
        uint256[] memory values,
        uint256[] memory weights,
        uint256 precision
    ) public pure returns (uint256) {
        return DragonMathLib.calculateWeightedAverage(values, weights, precision);
    }
    
    function normalizeWeights(
        uint256[] memory weights,
        uint256 precision
    ) public pure returns (uint256[] memory) {
        return DragonMathLib.normalizeWeights(weights, precision);
    }
} 