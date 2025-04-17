// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/Ive69LPFeeDistributor.sol";

/**
 * @title MockVe69LPFeeDistributor
 * @dev Mock implementation of ve69LPFeeDistributor for testing
 */
contract MockVe69LPFeeDistributor is Ownable, Ive69LPFeeDistributor {
    IERC20 public rewardToken;
    uint256 public override currentEpoch = 0;
    uint256 public override epochStartTime;
    
    mapping(uint256 => uint256) public override epochRewards;
    mapping(uint256 => uint256) public override epochTotalVotingPower;
    mapping(address => mapping(uint256 => bool)) public override userEpochClaimed;
    
    constructor(address _rewardToken) {
        rewardToken = IERC20(_rewardToken);
        epochStartTime = block.timestamp;
    }
    
    function EPOCH_DURATION() external pure override returns (uint256) {
        return 7 * 86400; // 1 week
    }
    
    // Add rewards function
    function addRewards(uint256 _amount) external override {
        // No need to transfer tokens in mock
        epochRewards[currentEpoch] += _amount;
        emit RewardsAdded(currentEpoch, _amount);
        emit FeesReceived(_amount);
    }
    
    // Receive rewards function (for direct payments)
    function receiveRewards(uint256 _amount) external override {
        // No need to transfer tokens in mock
        epochRewards[currentEpoch] += _amount;
        emit RewardsAdded(currentEpoch, _amount);
        emit FeesReceived(_amount);
    }
    
    function checkAdvanceEpoch() public override {
        currentEpoch += 1;
        epochStartTime = block.timestamp;
        epochTotalVotingPower[currentEpoch] = 1000e18; // Mock value
        emit EpochAdvanced(currentEpoch, epochTotalVotingPower[currentEpoch]);
    }
    
    function claimRewards(uint256 _epoch) external override {
        emit RewardsClaimed(msg.sender, _epoch, 100e18); // Mock claimed amount
    }
    
    function getCurrentEpochInfo() external view override returns (
        uint256 _currentEpoch, 
        uint256 _epochStartTime, 
        uint256 _timeUntilNextEpoch
    ) {
        return (currentEpoch, epochStartTime, 0);
    }
} 