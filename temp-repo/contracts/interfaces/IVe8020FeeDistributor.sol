// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IVe8020FeeDistributor
 * @dev Interface for combined Ve8020FeeDistributor that handles rewards, liquidity and development
 */
interface IVe8020FeeDistributor {
    /**
     * @dev Add rewards for the current epoch and distribute between ve8020 holders, liquidity, and development
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
     * @param _liquidityAllocation Percentage for liquidity (basis points)
     * @param _developmentAllocation Percentage for development (basis points)
     */
    function setFeeAllocation(
        uint256 _rewardAllocation,
        uint256 _liquidityAllocation,
        uint256 _developmentAllocation
    ) external;
    
    /**
     * @dev Claim rewards for a specific epoch
     * @param _epoch Epoch to claim rewards for
     */
    function claimEpochRewards(uint256 _epoch) external;
    
    /**
     * @dev Creates a new development budget allocation
     * @param purpose Description of the budget purpose
     * @param amount Amount allocated for this budget
     * @param budgetOwner Address allowed to spend from this budget
     */
    function createBudget(string memory purpose, uint256 amount, address budgetOwner) external returns (uint256);
    
    /**
     * @dev Allows a budget owner to spend from their budget
     * @param budgetId ID of the budget to spend from
     * @param to Address to send tokens to
     * @param amount Amount to spend
     */
    function spendFromBudget(uint256 budgetId, address to, uint256 amount) external;
    
    /**
     * @dev Manually trigger liquidity addition
     * @param amount Amount to use for liquidity
     */
    function triggerLiquidityAddition(uint256 amount) external;
} 