// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IVe8020FeeDistributor
 * @dev Interface for Ve8020FeeDistributor that handles rewards and liquidity
 */
interface IVe8020FeeDistributor {
    /**
     * @dev Add rewards for the current epoch and distribute between ve8020 holders and liquidity
     * @param _amount Amount of rewards to add
     */
    function addRewards(uint256 _amount) external;
    
    /**
     * @dev Receive rewards directly (e.g., from the token contract)
     * @param _amount Amount of rewards received
     */
    function receiveRewards(uint256 _amount) external;
    
    /**
     * @dev Set the allocation percentages for different purposes
     * @param _rewardAllocation Percentage for ve8020 rewards (basis points)
     */
    function setFeeAllocation(
        uint256 _rewardAllocation
    ) external;
    
    /**
     * @dev Claim rewards for a specific epoch
     * @param _epoch Epoch to claim rewards for
     */
    function claimEpochRewards(uint256 _epoch) external;
    
    /**
     * @dev Manually trigger liquidity addition
     * @param amount Amount to use for liquidity
     */
    function triggerLiquidityAddition(uint256 amount) external;
} 