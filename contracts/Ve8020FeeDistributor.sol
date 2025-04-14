// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./ve8020.sol";

/**
 * @title Ve8020FeeDistributor
 * @dev Contract that distributes transaction fees to ve(80/20) holders
 * proportional to their voting power. Users must claim their rewards manually.
 * Now distributes wS (wrapped Sonic) tokens as rewards instead of DRAGON.
 */
contract Ve8020FeeDistributor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Core state variables
    ve8020 public veToken;
    IERC20 public wrappedSonic; // wS (Wrapped Sonic) Token - used for rewards
    
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
    event FeesReceived(uint256 totalAmount);
    event EmergencyWithdrawal(address indexed to, uint256 amount, address token);
    
    /**
     * @dev Constructor
     * @param _veToken Address of the ve8020 token
     * @param _wrappedSonic Address of the wrapped Sonic token (used for rewards)
     */
    constructor(
        address _veToken, 
        address _wrappedSonic
    ) {
        require(_veToken != address(0), "ve8020 address cannot be zero");
        require(_wrappedSonic != address(0), "WrappedSonic address cannot be zero");
        
        veToken = ve8020(_veToken);
        wrappedSonic = IERC20(_wrappedSonic);
        
        // Initialize first epoch
        epochStartTime = block.timestamp;
        currentEpoch = 0;
        
        // Take initial snapshot of total voting power
        epochTotalVotingPower[currentEpoch] = veToken.totalVotingPower();
    }
    
    /**
     * @dev Add rewards and process fee distribution
     * @param _amount Amount of rewards to add
     */
    function addRewards(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        
        // Check if epoch needs to be advanced
        checkAdvanceEpoch();
        
        // Transfer wS tokens from caller to this contract
        wrappedSonic.safeTransferFrom(msg.sender, address(this), _amount);
        
        // Update rewards for current epoch
        epochRewards[currentEpoch] += _amount;
        emit RewardsAdded(currentEpoch, _amount);
        
        emit FeesReceived(_amount);
    }
    
    /**
     * @dev Receive rewards directly (e.g., from the token contract)
     * @param _amount Amount of rewards received
     */
    function receiveRewards(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        
        // Check if epoch needs to be advanced
        checkAdvanceEpoch();
        
        // Update rewards for current epoch
        epochRewards[currentEpoch] += _amount;
        emit RewardsAdded(currentEpoch, _amount);
        
        emit FeesReceived(_amount);
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
     * @dev Claims rewards for a specific epoch
     * @param _epoch Epoch number to claim rewards for
     */
    function claimRewards(uint256 _epoch) external nonReentrant {
        require(_epoch < currentEpoch, "Cannot claim for current or future epoch");
        require(!userEpochClaimed[msg.sender][_epoch], "Already claimed for this epoch");
        require(epochRewards[_epoch] > 0, "No rewards for this epoch");
        
        uint256 userVotingPower = veToken.balanceOf(msg.sender);
        require(userVotingPower > 0, "No voting power in epoch");
        
        uint256 totalVotingPower = epochTotalVotingPower[_epoch];
        uint256 rewardAmount = (epochRewards[_epoch] * userVotingPower) / totalVotingPower;
        
        require(rewardAmount > 0, "No rewards to claim");
        
        userEpochClaimed[msg.sender][_epoch] = true;
        wrappedSonic.safeTransfer(msg.sender, rewardAmount);
        
        emit RewardsClaimed(msg.sender, _epoch, rewardAmount);
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
    
    /**
     * @dev Emergency withdrawal in case of issues
     * Only callable by owner
     */
    function emergencyWithdraw(address to, address token, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot withdraw to zero address");
        require(token != address(0), "Token address cannot be zero");
        
        IERC20 tokenContract = IERC20(token);
        uint256 balance = tokenContract.balanceOf(address(this));
        uint256 withdrawAmount = amount > 0 && amount <= balance ? amount : balance;
        
        tokenContract.safeTransfer(to, withdrawAmount);
        emit EmergencyWithdrawal(to, withdrawAmount, token);
    }
} 