// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

/**
 * @title IDragonLPBooster
 * @dev Interface for Dragon LP Booster contracts
 * This interface defines the function to calculate boosts based on LP holdings
 */
interface IDragonLPBooster {
    /**
     * @dev Calculate the boost for a user
     * @param user Address of the user
     * @return Boost multiplier (in basis points)
     */
    function calculateBoost(address user) external view returns (uint256);
} 