// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IVe8020FeeDistributor.sol";

/**
 * @title MockVe8020FeeDistributor
 * @dev Mock implementation of Ve8020FeeDistributor for testing
 */
contract MockVe8020FeeDistributor is IVe8020FeeDistributor {
    IERC20 public rewardToken;
    uint256 public lastRewardsAmount;
    uint256 public lastReceiveAmount;
    bool public shouldAddRewardsRevert;
    
    // Additional mock variables for the new functions
    uint256 public rewardAllocation = 7000;
    uint256 public liquidityAllocation = 1850;
    uint256 public developmentAllocation = 1150;
    uint256 public lastBudgetId = 0;
    uint256 public lastClaimEpoch;
    uint256 public lastLiquidityAmount;
    
    mapping(uint256 => bool) public budgetExists;
    
    /**
     * @dev Constructor
     * @param _rewardToken The reward token address
     */
    constructor(address _rewardToken) {
        rewardToken = IERC20(_rewardToken);
    }
    
    /**
     * @dev Mock implementation of addRewards
     * @param _amount Amount of rewards to add
     */
    function addRewards(uint256 _amount) external override {
        if (shouldAddRewardsRevert) {
            revert("addRewards reverted");
        }
        
        lastRewardsAmount = _amount;
        require(rewardToken.transferFrom(msg.sender, address(this), _amount), "Transfer failed");
    }
    
    /**
     * @dev Mock implementation of receiveRewards
     * @param _amount Amount of rewards received
     */
    function receiveRewards(uint256 _amount) external override {
        lastReceiveAmount = _amount;
    }
    
    /**
     * @dev Mock implementation of setFeeAllocation
     * @param _rewardAllocation Percentage for ve8020 rewards
     * @param _liquidityAllocation Percentage for liquidity
     * @param _developmentAllocation Percentage for development
     */
    function setFeeAllocation(
        uint256 _rewardAllocation,
        uint256 _liquidityAllocation,
        uint256 _developmentAllocation
    ) external override {
        rewardAllocation = _rewardAllocation;
        liquidityAllocation = _liquidityAllocation;
        developmentAllocation = _developmentAllocation;
    }
    
    /**
     * @dev Mock implementation of claimEpochRewards
     * @param _epoch Epoch to claim rewards for
     */
    function claimEpochRewards(uint256 _epoch) external override {
        lastClaimEpoch = _epoch;
    }
    
    /**
     * @dev Mock implementation of createBudget
     * @param purpose Description of the budget purpose
     * @param amount Amount allocated for this budget
     * @param budgetOwner Address allowed to spend from this budget
     */
    function createBudget(string memory purpose, uint256 amount, address budgetOwner) external override returns (uint256) {
        lastBudgetId++;
        budgetExists[lastBudgetId] = true;
        return lastBudgetId;
    }
    
    /**
     * @dev Mock implementation of spendFromBudget
     * @param budgetId ID of the budget to spend from
     * @param to Address to send tokens to
     * @param amount Amount to spend
     */
    function spendFromBudget(uint256 budgetId, address to, uint256 amount) external override {
        require(budgetExists[budgetId], "Budget does not exist");
        // In a real implementation, this would transfer tokens
    }
    
    /**
     * @dev Mock implementation of triggerLiquidityAddition
     * @param amount Amount to use for liquidity
     */
    function triggerLiquidityAddition(uint256 amount) external override {
        lastLiquidityAmount = amount;
    }
    
    /**
     * @dev Mock function to set whether addRewards should revert
     * @param _shouldRevert Whether addRewards should revert
     */
    function setAddRewardsRevert(bool _shouldRevert) external {
        shouldAddRewardsRevert = _shouldRevert;
    }
} 