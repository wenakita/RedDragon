// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../math/DragonMathLib.sol";

contract DragonMathLibWrapper {
    function cubeRoot(uint256 n) public pure returns (uint256) {
        return DragonMathLib.cubeRoot(n);
    }
    
    function calculateVotingPower(uint256 amount) public pure returns (uint256) {
        return DragonMathLib.calculateVotingPower(amount);
    }
    
    function calculateBoostMultiplier(
        uint256 userBalance,
        uint256 totalSupply,
        uint256 baseBoost,
        uint256 maxBoost,
        uint256 /* boostPrecision */
    ) public pure returns (uint256) {
        return DragonMathLib.calculateBoostMultiplier(userBalance, totalSupply, baseBoost, maxBoost);
    }
    
    function normalizeWeights(
        uint256[] memory weights,
        uint256 precision
    ) public pure returns (uint256[] memory) {
        return DragonMathLib.normalizeWeights(weights, precision);
    }
}
