// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IDragonLPBooster
 * @dev Interface for the DragonLPBooster contract that calculates boosts for LP providers
 */
interface IDragonLPBooster {
    /**
     * @dev Calculate boost for a user based on their LP position
     * @param user Address of the user
     * @return boost The calculated boost in basis points (e.g., 100 = 1%)
     */
    function calculateBoost(address user) external view returns (uint256);
} 