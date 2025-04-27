// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Ive69LPBoost
 * @dev Interface for calculating boost multipliers based on ve69LP holdings
 * and entering jackpot with boosted values
 */
interface Ive69LPBoost {
    /**
     * @dev Calculates a boost multiplier based on user's ve69LP balance
     * @param user Address of the user
     * @return Boost multiplier (in 10000 precision, where 10000 = 100%)
     */
    function calculateBoost(address user) external view returns (uint256);
    
    /**
     * @dev Calculates boost and emits an event (non-view version)
     * @param user Address of the user
     * @return Boost multiplier (in 10000 precision, where 10000 = 100%)
     */
    function getBoostWithEvent(address user) external returns (uint256);
    
    /**
     * @dev Enter jackpot with a boosted amount based on ve69LP holdings
     * @param user Address of the user
     * @param amount Base amount to boost
     * @return Boosted amount used for jackpot entry
     */
    function enterJackpotWithBoost(address user, uint256 amount) external returns (uint256);
} 