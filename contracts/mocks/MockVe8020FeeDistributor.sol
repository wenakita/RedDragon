// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IVe8020FeeDistributor.sol";

/**
 * @title MockVe8020FeeDistributor
 * @dev Mock implementation of IVe8020FeeDistributor
 */
contract MockVe8020FeeDistributor is IVe8020FeeDistributor {
    address public wrappedSonic;

    // Mock state
    uint256 public totalRewardsAdded;
    mapping(uint256 => bool) public epochHasRewards;
    mapping(uint256 => bool) public rewardsClaimed;
    
    constructor(address _wrappedSonic) {
        wrappedSonic = _wrappedSonic;
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
    function claimRewards(uint256 _epoch) external override {
        require(epochHasRewards[_epoch], "No rewards for this epoch");
        rewardsClaimed[_epoch] = true;
    }
} 