// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IVe8020FeeDistributor.sol";

/**
 * @title MockVe8020FeeDistributor
 * @dev Mock implementation of IVe8020FeeDistributor
 */
contract MockVe8020FeeDistributor is IVe8020FeeDistributor {
    address public rewardToken;
    uint256 public rewardAllocation;
    uint256 public liquidityAllocation;

    // Mock state
    uint256 public totalRewardsAdded;
    mapping(uint256 => bool) public epochHasRewards;
    mapping(uint256 => bool) public rewardsClaimed;
    uint256 public liquidityAdded;
    
    constructor(address _rewardToken) {
        rewardToken = _rewardToken;
        rewardAllocation = 8000; // 80%
        liquidityAllocation = 2000; // 20%
    }
    
    /**
     * @inheritdoc IVe8020FeeDistributor
     */
    function addRewards(uint256 _amount) external override {
        totalRewardsAdded += _amount;
        epochHasRewards[block.timestamp / 1 days] = true;
    }
    
    /**
     * @inheritdoc IVe8020FeeDistributor
     */
    function receiveRewards(uint256 _amount) external override {
        totalRewardsAdded += _amount;
        epochHasRewards[block.timestamp / 1 days] = true;
    }
    
    /**
     * @inheritdoc IVe8020FeeDistributor
     */
    function setFeeAllocation(
        uint256 _rewardAllocation
    ) external override {
        require(_rewardAllocation == 10000, "Allocations must total 10000 basis points");
        rewardAllocation = _rewardAllocation;
        liquidityAllocation = 10000 - _rewardAllocation;
    }
    
    /**
     * @inheritdoc IVe8020FeeDistributor
     */
    function claimEpochRewards(uint256 _epoch) external override {
        require(epochHasRewards[_epoch], "No rewards for this epoch");
        rewardsClaimed[_epoch] = true;
    }
    
    /**
     * @inheritdoc IVe8020FeeDistributor
     */
    function triggerLiquidityAddition(uint256 amount) external override {
        liquidityAdded += amount;
    }
} 