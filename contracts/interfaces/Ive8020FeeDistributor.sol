// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Ive8020FeeDistributor
 * @dev Interface for ve8020FeeDistributor that distributes wS tokens to ve8020 holders
 */
interface Ive8020FeeDistributor {
    // Events
    event RewardsAdded(uint256 amount);
    event RewardsClaimed(address indexed user, uint256 indexed epoch, uint256 amount);
    
    /**
     * @dev Add rewards for the current epoch
     * @param _amount Amount of rewards to add
     */
    function addRewards(uint256 _amount) external;
    
    /**
     * @dev Claims rewards for a specific epoch
     * @param _epoch Epoch to claim rewards for
     */
    function claimRewards(uint256 _epoch) external;
    
    /**
     * @dev Gets the rewards available for a user for a specific epoch
     * @param user User address
     * @param epoch Epoch to check rewards for
     * @return Amount of rewards available
     */
    function getUserRewards(address user, uint256 epoch) external view returns (uint256);
} 