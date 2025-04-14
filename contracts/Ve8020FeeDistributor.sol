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
 * proportional to their voting power, and provides liquidity.
 * Distributions happen automatically at the end of each weekly epoch.
 */
contract Ve8020FeeDistributor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Core state variables
    ve8020 public veToken;
    IERC20 public rewardToken; // DRAGON token
    IERC20 public wrappedSonic; // sSonic Wrapper Token
    
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
    
    // Fee allocation percentages (basis points, 100% = 10000)
    uint256 public rewardAllocation = 8000; // 80% to ve8020 holders
    uint256 public liquidityAllocation = 2000; // 20% to liquidity

    // Liquidity configuration
    address public lpRouter;
    mapping(uint256 => uint256) public epochLiquidityAdded;
    uint256 public totalLiquidityAdded;
    
    // Automatic distribution data
    mapping(address => mapping(uint256 => uint256)) public userEpochRewards;
    mapping(uint256 => address[]) public epochParticipants;
    
    // Track active token holders
    address[] public activeHolders;
    mapping(address => bool) public isActiveHolder;
    
    // Events - Distribution Events
    event RewardsAdded(uint256 indexed epoch, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 indexed epoch, uint256 amount);
    event RewardsAutomaticallyDistributed(uint256 indexed epoch, uint256 totalAmount, uint256 recipientCount);
    event EpochAdvanced(uint256 indexed epoch, uint256 totalVotingPower);
    event FeesReceived(uint256 totalAmount);
    event AllocationUpdated(uint256 rewardAllocation);
    event HolderAdded(address indexed holder);
    event HolderRemoved(address indexed holder);
    
    // Events - Liquidity Events
    event LiquidityAdded(uint256 amount);
    event LiquidityRouterSet(address indexed router);
    
    // Events - Shared Events
    event EmergencyWithdrawal(address indexed to, uint256 amount, address token);
    
    /**
     * @dev Constructor
     * @param _veToken Address of the ve8020 token
     * @param _rewardToken Address of the reward token (DRAGON)
     * @param _wrappedSonic Address of the wrapped Sonic token
     */
    constructor(
        address _veToken, 
        address _rewardToken,
        address _wrappedSonic
    ) {
        require(_veToken != address(0), "ve8020 address cannot be zero");
        require(_rewardToken != address(0), "Reward token address cannot be zero");
        require(_wrappedSonic != address(0), "WrappedSonic address cannot be zero");
        
        veToken = ve8020(_veToken);
        rewardToken = IERC20(_rewardToken);
        wrappedSonic = IERC20(_wrappedSonic);
        
        // Initialize first epoch
        epochStartTime = block.timestamp;
        currentEpoch = 0;
        
        // Take initial snapshot of total voting power
        epochTotalVotingPower[currentEpoch] = veToken.totalVotingPower();
    }
    
    /**
     * @dev Sets the allocation percentages for fees
     * @param _rewardAllocation Percentage for ve8020 rewards (basis points)
     * @param _liquidityAllocation Percentage for liquidity (basis points)
     */
    function setFeeAllocation(
        uint256 _rewardAllocation,
        uint256 _liquidityAllocation
    ) external onlyOwner {
        require(_rewardAllocation + _liquidityAllocation == 10000, "Must be 10000 basis points (100%)");
        
        rewardAllocation = _rewardAllocation;
        liquidityAllocation = _liquidityAllocation;
        
        emit AllocationUpdated(rewardAllocation);
    }
    
    /**
     * @dev Sets the LP router address
     * @param _router Address of the LP router
     */
    function setLpRouter(address _router) external onlyOwner {
        require(_router != address(0), "Router address cannot be zero");
        lpRouter = _router;
        emit LiquidityRouterSet(_router);
    }
    
    /**
     * @dev Register an address as an active holder
     * @param _holder Address to register
     */
    function registerHolder(address _holder) external {
        require(_holder != address(0), "Cannot register zero address");
        
        // Only allow registration if the address has voting power
        uint256 votingPower = veToken.balanceOf(_holder);
        require(votingPower > 0, "Address has no voting power");
        
        if (!isActiveHolder[_holder]) {
            activeHolders.push(_holder);
            isActiveHolder[_holder] = true;
            emit HolderAdded(_holder);
        }
    }
    
    /**
     * @dev Remove an address from active holders
     * @param _holder Address to remove
     */
    function removeHolder(address _holder) external onlyOwner {
        require(isActiveHolder[_holder], "Address is not an active holder");
        
        // Find index of holder in the array
        uint256 holderIndex = 0;
        bool found = false;
        
        for (uint256 i = 0; i < activeHolders.length; i++) {
            if (activeHolders[i] == _holder) {
                holderIndex = i;
                found = true;
                break;
            }
        }
        
        require(found, "Holder not found in active holders");
        
        // Swap with the last element and remove the last element
        activeHolders[holderIndex] = activeHolders[activeHolders.length - 1];
        activeHolders.pop();
        isActiveHolder[_holder] = false;
        emit HolderRemoved(_holder);
    }
    
    /**
     * @dev Get the number of active holders
     * @return Count of active holders
     */
    function activeHolderCount() external view returns (uint256) {
        return activeHolders.length;
    }
    
    /**
     * @dev Get holder at specific index
     * @param _index Index in the active holders array
     * @return Address of holder at that index
     */
    function holderAt(uint256 _index) external view returns (address) {
        require(_index < activeHolders.length, "Index out of bounds");
        return activeHolders[_index];
    }
    
    /**
     * @dev Add rewards and process fee distribution
     * @param _amount Amount of rewards to add
     */
    function addRewards(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        
        // Check if epoch needs to be advanced
        checkAdvanceEpoch();
        
        // Transfer reward tokens from caller to this contract
        rewardToken.safeTransferFrom(msg.sender, address(this), _amount);
        
        // Process fee distribution according to allocation
        uint256 rewardAmount = (_amount * rewardAllocation) / 10000;
        uint256 liquidityAmount = (_amount * liquidityAllocation) / 10000;
        
        // Update rewards for current epoch
        epochRewards[currentEpoch] += rewardAmount;
        emit RewardsAdded(currentEpoch, rewardAmount);
        
        // Process liquidity allocation if enabled
        if (liquidityAmount > 0 && lpRouter != address(0)) {
            _addLiquidity(liquidityAmount);
        }
        
        emit FeesReceived(_amount);
    }
    
    /**
     * @dev Internal function to add liquidity
     * @param _amount Amount to add to liquidity
     */
    function _addLiquidity(uint256 _amount) internal {
        // Transfer tokens to LP router
        rewardToken.safeTransfer(lpRouter, _amount);
        
        // Update liquidity stats
        epochLiquidityAdded[currentEpoch] += _amount;
        totalLiquidityAdded += _amount;
        
        emit LiquidityAdded(_amount);
    }
    
    /**
     * @dev Receive rewards directly (e.g., from the token contract)
     * @param _amount Amount of rewards received
     */
    function receiveRewards(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        
        // Check if epoch needs to be advanced
        checkAdvanceEpoch();
        
        // Process fee distribution according to allocation
        uint256 rewardAmount = (_amount * rewardAllocation) / 10000;
        uint256 liquidityAmount = (_amount * liquidityAllocation) / 10000;
        
        // Update rewards for current epoch
        epochRewards[currentEpoch] += rewardAmount;
        emit RewardsAdded(currentEpoch, rewardAmount);
        
        // Process liquidity allocation if enabled
        if (liquidityAmount > 0 && lpRouter != address(0)) {
            _addLiquidity(liquidityAmount);
        }
        
        emit FeesReceived(_amount);
    }
    
    /**
     * @dev Check if epoch needs to be advanced and do so if needed
     */
    function checkAdvanceEpoch() public {
        // If epoch duration has passed, advance to next epoch
        while (block.timestamp >= epochStartTime + EPOCH_DURATION) {
            // Process automatic distribution for the completed epoch
            _processAutomaticDistribution(currentEpoch);
            
            // Advance to next epoch
            currentEpoch += 1;
            epochStartTime += EPOCH_DURATION;
            
            // Take snapshot of total voting power for the new epoch
            epochTotalVotingPower[currentEpoch] = veToken.totalVotingPower();
            
            emit EpochAdvanced(currentEpoch, epochTotalVotingPower[currentEpoch]);
        }
    }
    
    /**
     * @dev Process automatic distribution for a completed epoch
     * @param _epoch The epoch to process
     */
    function _processAutomaticDistribution(uint256 _epoch) internal {
        uint256 totalRewards = epochRewards[_epoch];
        if (totalRewards == 0) return; // No rewards to distribute
        
        uint256 totalVotingPower = epochTotalVotingPower[_epoch];
        if (totalVotingPower == 0) return; // No one to distribute to
        
        uint256 distributedAmount = 0;
        uint256 recipientCount = 0;
        
        // More efficient holder processing
        uint256 holderCount = activeHolders.length;
        uint256 maxBatchSize = 100; // Process in smaller batches to avoid gas limits
        
        for (uint256 i = 0; i < holderCount && i < maxBatchSize; i++) {
            address holder = activeHolders[i];
            uint256 votingPower = veToken.balanceOf(holder);
            
            if (votingPower == 0) continue;
            
            uint256 reward = (totalRewards * votingPower) / totalVotingPower;
            if (reward == 0) continue;
            
            // Update the distributed rewards and mark as claimed
            userEpochClaimed[holder][_epoch] = true;
            userEpochRewards[holder][_epoch] = reward;
            epochParticipants[_epoch].push(holder);
            
            // Transfer rewards directly to the holder
            rewardToken.safeTransfer(holder, reward);
            
            distributedAmount += reward;
            recipientCount++;
            
            emit RewardsClaimed(holder, _epoch, reward);
        }
        
        // Handle any remaining undistributed rewards
        if (distributedAmount < totalRewards) {
            uint256 remaining = totalRewards - distributedAmount;
            // Add remaining to next epoch rather than losing them
            epochRewards[_epoch + 1] += remaining;
            emit RewardsAdded(_epoch + 1, remaining);
        }
        
        emit RewardsAutomaticallyDistributed(_epoch, distributedAmount, recipientCount);
    }
    
    /**
     * @dev Get array of active ve8020 holders
     * @return Active holders array
     */
    function getActiveHolders() external view returns (address[] memory) {
        return activeHolders;
    }
    
    /**
     * @dev Manually trigger the reward distribution process
     * @param _epoch Epoch to process
     */
    function triggerDistribution(uint256 _epoch) external onlyOwner {
        require(_epoch < currentEpoch, "Epoch not finalized yet");
        _processAutomaticDistribution(_epoch);
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
     * @dev Get information about rewards for a user in a specific epoch
     * @param _user User address
     * @param _epoch Epoch number
     * @return claimed Whether rewards were claimed
     * @return rewardAmount Amount of rewards received
     */
    function getUserEpochRewardInfo(address _user, uint256 _epoch) external view returns (
        bool claimed,
        uint256 rewardAmount
    ) {
        claimed = userEpochClaimed[_user][_epoch];
        rewardAmount = userEpochRewards[_user][_epoch];
    }
    
    /**
     * @dev Get participants for a specific epoch
     * @param _epoch Epoch number
     * @return Array of participant addresses
     */
    function getEpochParticipants(uint256 _epoch) external view returns (address[] memory) {
        return epochParticipants[_epoch];
    }
    
    /**
     * @dev Emergency withdrawal in case of issues
     * Only callable by owner
     */
    function emergencyWithdraw(address token, address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot withdraw to zero address");
        require(token != address(0), "Token address cannot be zero");
        
        IERC20 tokenContract = IERC20(token);
        uint256 balance = tokenContract.balanceOf(address(this));
        uint256 withdrawAmount = amount > 0 && amount <= balance ? amount : balance;
        
        tokenContract.safeTransfer(to, withdrawAmount);
        emit EmergencyWithdrawal(to, withdrawAmount, token);
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
     * @dev Manually trigger the reward distribution process for a specific batch of holders
     * @param _epoch Epoch to process
     * @param _startIndex Start index for holder processing
     * @param _endIndex End index for holder processing (exclusive)
     */
    function triggerDistributionBatch(uint256 _epoch, uint256 _startIndex, uint256 _endIndex) external onlyOwner {
        require(_epoch < currentEpoch, "Epoch not finalized yet");
        require(_startIndex < _endIndex, "Invalid index range");
        
        uint256 totalRewards = epochRewards[_epoch];
        if (totalRewards == 0) return; // No rewards to distribute
        
        uint256 totalVotingPower = epochTotalVotingPower[_epoch];
        if (totalVotingPower == 0) return; // No one to distribute to
        
        uint256 holderCount = activeHolders.length;
        require(_endIndex <= holderCount, "End index out of bounds");
        
        uint256 distributedAmount = 0;
        uint256 recipientCount = 0;
        
        for (uint256 i = _startIndex; i < _endIndex; i++) {
            address holder = activeHolders[i];
            if (userEpochClaimed[holder][_epoch]) continue; // Skip if already claimed
            
            uint256 votingPower = veToken.balanceOf(holder);
            if (votingPower == 0) continue;
            
            uint256 reward = (totalRewards * votingPower) / totalVotingPower;
            if (reward == 0) continue;
            
            // Update the distributed rewards and mark as claimed
            userEpochClaimed[holder][_epoch] = true;
            userEpochRewards[holder][_epoch] = reward;
            epochParticipants[_epoch].push(holder);
            
            // Transfer rewards directly to the holder
            rewardToken.safeTransfer(holder, reward);
            
            distributedAmount += reward;
            recipientCount++;
            
            emit RewardsClaimed(holder, _epoch, reward);
        }
        
        emit RewardsAutomaticallyDistributed(_epoch, distributedAmount, recipientCount);
    }
    
    /**
     * @dev Clear epoch participant data to save storage
     * @param _epoch Epoch to clear data for
     * @notice This can be called after a certain period to free up storage
     */
    function clearEpochParticipants(uint256 _epoch) external onlyOwner {
        require(_epoch < currentEpoch - 4, "Cannot clear recent epochs"); // Keep at least 4 epochs of history
        
        delete epochParticipants[_epoch];
    }
} 