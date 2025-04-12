// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./ve8020.sol";

/**
 * @title Ve8020FeeDistributor
 * @dev Contract that distributes transaction fees to ve(80/20) holders
 * proportional to their voting power. This rewards long-term liquidity providers.
 */
contract Ve8020FeeDistributor is Ownable, ReentrancyGuard {
    // State variables
    ve8020 public veToken;
    IERC20 public rewardToken; // DRAGON token
    
    // Mapping of user => epoch => claimed status
    mapping(address => mapping(uint256 => bool)) public userEpochClaimed;
    
    // Total rewards for each epoch
    mapping(uint256 => uint256) public epochRewards;
    
    // Total voting power snapshot at each epoch
    mapping(uint256 => uint256) public epochTotalVotingPower;
    
    // Current epoch
    uint256 public currentEpoch;
    
    // Epoch duration (1 week by default)
    uint256 public constant EPOCH_DURATION = 7 * 86400;
    
    // Epoch start timestamp
    uint256 public epochStartTime;
    
    // Events
    event RewardsAdded(uint256 indexed epoch, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 indexed epoch, uint256 amount);
    event EpochAdvanced(uint256 indexed epoch, uint256 totalVotingPower);
    
    /**
     * @dev Constructor
     * @param _veToken Address of the ve8020 token
     * @param _rewardToken Address of the reward token (DRAGON)
     */
    constructor(address _veToken, address _rewardToken) {
        require(_veToken != address(0), "ve8020 address cannot be zero");
        require(_rewardToken != address(0), "Reward token address cannot be zero");
        
        veToken = ve8020(_veToken);
        rewardToken = IERC20(_rewardToken);
        
        // Initialize first epoch
        epochStartTime = block.timestamp;
        currentEpoch = 0;
        
        // Take initial snapshot of total voting power
        epochTotalVotingPower[currentEpoch] = veToken.totalVotingPower();
    }
    
    /**
     * @dev Add rewards for the current epoch
     * @param _amount Amount of rewards to add
     */
    function addRewards(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        
        // Check if epoch needs to be advanced
        checkAdvanceEpoch();
        
        // Transfer reward tokens from caller to this contract
        require(rewardToken.transferFrom(msg.sender, address(this), _amount), "Transfer failed");
        
        // Add rewards to current epoch
        epochRewards[currentEpoch] += _amount;
        
        emit RewardsAdded(currentEpoch, _amount);
    }
    
    /**
     * @dev Receive rewards directly (e.g., from the token contract)
     * @param _amount Amount of rewards received
     */
    function receiveRewards(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        
        // Check if epoch needs to be advanced
        checkAdvanceEpoch();
        
        // Add rewards to current epoch
        epochRewards[currentEpoch] += _amount;
        
        emit RewardsAdded(currentEpoch, _amount);
    }
    
    /**
     * @dev Check if epoch needs to be advanced and do so if needed
     */
    function checkAdvanceEpoch() public {
        // If epoch duration has passed, advance to next epoch
        while (block.timestamp >= epochStartTime + EPOCH_DURATION) {
            // Advance to next epoch
            currentEpoch += 1;
            epochStartTime += EPOCH_DURATION;
            
            // Take snapshot of total voting power for the new epoch
            epochTotalVotingPower[currentEpoch] = veToken.totalVotingPower();
            
            emit EpochAdvanced(currentEpoch, epochTotalVotingPower[currentEpoch]);
        }
    }
    
    /**
     * @dev Claim rewards for a specific epoch
     * @param _epoch Epoch to claim rewards for
     */
    function claimEpochRewards(uint256 _epoch) external nonReentrant {
        // Ensure epoch is valid
        require(_epoch < currentEpoch, "Epoch not finalized yet");
        require(!userEpochClaimed[msg.sender][_epoch], "Rewards already claimed for this epoch");
        
        // Calculate user's voting power at the epoch
        uint256 userVotingPower = getUserVotingPowerAt(msg.sender, _epoch);
        require(userVotingPower > 0, "No voting power in this epoch");
        
        // Calculate user's share of rewards
        uint256 totalVotingPower = epochTotalVotingPower[_epoch];
        uint256 epochRewardAmount = epochRewards[_epoch];
        
        uint256 userReward = (epochRewardAmount * userVotingPower) / totalVotingPower;
        require(userReward > 0, "No rewards to claim");
        
        // Mark as claimed
        userEpochClaimed[msg.sender][_epoch] = true;
        
        // Send rewards to user
        require(rewardToken.transfer(msg.sender, userReward), "Reward transfer failed");
        
        emit RewardsClaimed(msg.sender, _epoch, userReward);
    }
    
    /**
     * @dev Claim rewards for multiple epochs at once
     * @param _epochs Array of epochs to claim rewards for
     */
    function claimMultipleEpochRewards(uint256[] calldata _epochs) external nonReentrant {
        uint256 totalReward = 0;
        
        for (uint256 i = 0; i < _epochs.length; i++) {
            uint256 epoch = _epochs[i];
            
            // Ensure epoch is valid
            if (epoch >= currentEpoch || userEpochClaimed[msg.sender][epoch]) {
                continue; // Skip invalid epochs
            }
            
            // Calculate user's voting power at the epoch
            uint256 userVotingPower = getUserVotingPowerAt(msg.sender, epoch);
            if (userVotingPower == 0) {
                continue; // Skip epochs where user had no voting power
            }
            
            // Calculate user's share of rewards
            uint256 totalVotingPower = epochTotalVotingPower[epoch];
            uint256 epochRewardAmount = epochRewards[epoch];
            
            uint256 userReward = (epochRewardAmount * userVotingPower) / totalVotingPower;
            if (userReward == 0) {
                continue; // Skip epochs with no rewards
            }
            
            // Mark as claimed
            userEpochClaimed[msg.sender][epoch] = true;
            
            // Add to total reward
            totalReward += userReward;
            
            emit RewardsClaimed(msg.sender, epoch, userReward);
        }
        
        // Send total rewards to user
        require(totalReward > 0, "No rewards to claim");
        require(rewardToken.transfer(msg.sender, totalReward), "Reward transfer failed");
    }
    
    /**
     * @dev Get user's voting power at a specific epoch
     * @param _user User address
     * @param _epoch Epoch to get voting power for
     * @return User's voting power at the specified epoch
     */
    function getUserVotingPowerAt(address _user, uint256 _epoch) public view returns (uint256) {
        // For simplicity, we use current voting power
        // In a production system, this would use historical snapshots
        return veToken.balanceOf(_user);
    }
    
    /**
     * @dev Get user's claimable rewards for a specific epoch
     * @param _user User address
     * @param _epoch Epoch to get rewards for
     * @return User's claimable rewards for the specified epoch
     */
    function getUserClaimableRewards(address _user, uint256 _epoch) external view returns (uint256) {
        // Ensure epoch is valid
        if (_epoch >= currentEpoch || userEpochClaimed[_user][_epoch]) {
            return 0;
        }
        
        // Calculate user's voting power at the epoch
        uint256 userVotingPower = getUserVotingPowerAt(_user, _epoch);
        if (userVotingPower == 0) {
            return 0;
        }
        
        // Calculate user's share of rewards
        uint256 totalVotingPower = epochTotalVotingPower[_epoch];
        uint256 epochRewardAmount = epochRewards[_epoch];
        
        return (epochRewardAmount * userVotingPower) / totalVotingPower;
    }
    
    /**
     * @dev Get user's total claimable rewards across all epochs
     * @param _user User address
     * @return User's total claimable rewards
     */
    function getUserTotalClaimableRewards(address _user) external view returns (uint256) {
        uint256 totalReward = 0;
        
        for (uint256 epoch = 0; epoch < currentEpoch; epoch++) {
            if (!userEpochClaimed[_user][epoch]) {
                // Calculate user's voting power at the epoch
                uint256 userVotingPower = getUserVotingPowerAt(_user, epoch);
                if (userVotingPower > 0) {
                    // Calculate user's share of rewards
                    uint256 totalVotingPower = epochTotalVotingPower[epoch];
                    uint256 epochRewardAmount = epochRewards[epoch];
                    
                    uint256 userReward = (epochRewardAmount * userVotingPower) / totalVotingPower;
                    totalReward += userReward;
                }
            }
        }
        
        return totalReward;
    }
    
    /**
     * @dev Get current epoch information
     * @return _currentEpoch Current epoch number
     * @return _epochStartTime Start time of current epoch
     * @return _timeUntilNextEpoch Time until next epoch in seconds
     */
    function getCurrentEpochInfo() external view returns (
        uint256 _currentEpoch, 
        uint256 _epochStartTime, 
        uint256 _timeUntilNextEpoch
    ) {
        uint256 nextEpochTime = epochStartTime + EPOCH_DURATION;
        uint256 timeUntilNext = 0;
        
        if (nextEpochTime > block.timestamp) {
            timeUntilNext = nextEpochTime - block.timestamp;
        }
        
        return (currentEpoch, epochStartTime, timeUntilNext);
    }
} 