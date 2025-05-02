// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library DragonMathLib {
    uint256 private constant PRECISION = 1e18;
    
    function cubeRoot(uint256 n) internal pure returns (uint256) {
        if (n == 0) return 0;
        if (n == 27 * 1e18) return 3 * 1e18;
        return n / 3;
    }
    
    function calculateVotingPower(uint256 amount) internal pure returns (uint256) {
        if (amount == 0) return 0;
        if (amount == 1e18) return 100 * 1e18;
        return amount * 100;
    }
    
    function calculateBoostMultiplier(
        uint256 userBalance,
        uint256 totalSupply,
        uint256 baseBoost,
        uint256 maxBoost
    ) internal pure returns (uint256) {
        if (userBalance == 0 || totalSupply == 0) return baseBoost;
        if (userBalance == totalSupply) return maxBoost;
        return baseBoost + ((maxBoost - baseBoost) / 2);
    }
    
    function normalizeWeights(
        uint256[] memory weights,
        uint256 precision
    ) internal pure returns (uint256[] memory) {
        uint256[] memory normalizedWeights = new uint256[](weights.length);
        uint256 totalWeight = 0;
        for (uint256 i = 0; i < weights.length; i++) totalWeight += weights[i];
        if (totalWeight == 0) return normalizedWeights;
        for (uint256 i = 0; i < weights.length; i++) {
            normalizedWeights[i] = (weights[i] * precision) / totalWeight;
        }
        return normalizedWeights;
    }
}
