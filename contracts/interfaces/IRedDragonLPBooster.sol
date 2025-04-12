// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRedDragonLPBooster
 * @dev Interface for the LP booster contract that provides probability boosts for LP token holders
 */
interface IRedDragonLPBooster {
    /**
     * @dev Calculate boost for a user based on their LP holdings
     * @param user Address to calculate boost for
     * @return Boost amount in lottery probability units
     */
    function calculateBoost(address user) external view returns (uint256);
    
    /**
     * @dev Get the LP token used for boost calculation
     * @return Address of the LP token
     */
    function lpToken() external view returns (address);
    
    /**
     * @dev Get minimum LP amount required for boost eligibility
     * @return Minimum LP amount
     */
    function minLpAmount() external view returns (uint256);
    
    /**
     * @dev Check if the booster uses tiered boost system
     * @return Whether tiers are used
     */
    function useTiers() external view returns (bool);
} 