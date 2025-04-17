// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

/**
 * @title Ive69LPFeeDistributor Interface
 * @dev Interface for the ve69LP Fee Distributor contract
 */
interface Ive69LPFeeDistributor {
    // Events
    event RewardsAdded(uint256 indexed epoch, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 indexed epoch, uint256 amount);
    event EpochAdvanced(uint256 indexed epoch, uint256 totalVotingPower);
    event FeesReceived(uint256 totalAmount);
    
    // Views
    function currentEpoch() external view returns (uint256);
    function epochStartTime() external view returns (uint256);
    function EPOCH_DURATION() external view returns (uint256);
    function epochRewards(uint256 epoch) external view returns (uint256);
    function epochTotalVotingPower(uint256 epoch) external view returns (uint256);
    function userEpochClaimed(address user, uint256 epoch) external view returns (bool);
    
    // Functions
    function addRewards(uint256 _amount) external;
    function receiveRewards(uint256 _amount) external;
    function checkAdvanceEpoch() external;
    function claimRewards(uint256 _epoch) external;
    
    function getCurrentEpochInfo() external view returns (
        uint256 _currentEpoch, 
        uint256 _epochStartTime, 
        uint256 _timeUntilNextEpoch
    );
} 