// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/Ive8020FeeDistributor.sol";

/**
 * @title MockVe8020FeeDistributor
 * @dev Mock implementation of Ive8020FeeDistributor
 */
contract MockVe8020FeeDistributor is Ive8020FeeDistributor {
    address public wrappedSonic;

    // Mock state
    uint256 public totalRewardsAdded;
    mapping(uint256 => bool) public epochHasRewards;
    mapping(uint256 => bool) public rewardsClaimed;
    
    constructor(address _wrappedSonic) {
        wrappedSonic = _wrappedSonic;
    }
    
    /**
     * @inheritdoc Ive8020FeeDistributor
     */
    function addRewards(uint256 amount) external override {
        totalRewardsAdded += amount;
        epochHasRewards[block.timestamp / 1 days] = true;
        emit RewardsAdded(amount);
    }
    
    /**
     * @inheritdoc Ive8020FeeDistributor
     */
    function claimRewards(uint256 epoch) external override {
        require(epochHasRewards[epoch], "No rewards for this epoch");
        rewardsClaimed[epoch] = true;
        emit RewardsClaimed(msg.sender, epoch, 0);
    }
    
    /**
     * @inheritdoc Ive8020FeeDistributor
     */
    function getUserRewards(address user, uint256 epoch) external view override returns (uint256) {
        return 0;
    }
} 