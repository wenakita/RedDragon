// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./ve8020.sol";
import "./interfaces/IRouter.sol";

// Interface for ShadowDEX Router
interface IRouter {
    function factory() external pure returns (address);
    function WETH() external pure returns (address);
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);
}

/**
 * @title Ve8020FeeDistributor
 * @dev Combined contract that distributes transaction fees to ve(80/20) holders
 * proportional to their voting power and manages liquidity.
 * Distributions happen automatically at the end of each weekly epoch.
 */
contract Ve8020FeeDistributor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Core state variables
    ve8020 public veToken;
    IERC20 public rewardToken; // DRAGON token
    IERC20 public wrappedSonic; // wS token
    IRouter public router;
    
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
    uint256 public minTokensToLiquidity = 1000 * 10**18; // 1000 tokens min before adding liquidity
    uint256 public autoLiquidityFrequency = 1 days; // Frequency of automated liquidity additions
    uint256 public lastLiquidityAddition;
    
    // Liquidity statistics
    uint256 public totalLiquidityAdded;
    uint256 public totalRedDragonLiquidity;
    uint256 public totalWrappedSonicLiquidity;
    
    // Automatic distribution data
    mapping(address => mapping(uint256 => uint256)) public userEpochRewards;
    mapping(uint256 => address[]) public epochParticipants;
    
    // Events - Distribution Events
    event RewardsAdded(uint256 indexed epoch, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 indexed epoch, uint256 amount);
    event RewardsAutomaticallyDistributed(uint256 indexed epoch, uint256 totalAmount, uint256 recipientCount);
    event EpochAdvanced(uint256 indexed epoch, uint256 totalVotingPower);
    event FeesReceived(uint256 totalAmount, uint256 rewardsAmount, uint256 liquidityAmount);
    event AllocationUpdated(uint256 rewardAllocation, uint256 liquidityAllocation);
    
    // Events - Liquidity Events
    event LiquidityAdded(uint256 redDragonAmount, uint256 wrappedSonicAmount, uint256 liquidityTokens);
    event RouterUpdated(address indexed newRouter);
    event MinTokensToLiquidityUpdated(uint256 newAmount);
    event AutoLiquidityFrequencyUpdated(uint256 newFrequency);
    
    // Events - Shared Events
    event EmergencyWithdrawal(address indexed to, uint256 amount, address token);
    
    /**
     * @dev Constructor
     * @param _veToken Address of the ve8020 token
     * @param _rewardToken Address of the reward token (DRAGON)
     * @param _wrappedSonic Address of the wS token
     * @param _router Address of the router for liquidity addition
     */
    constructor(
        address _veToken, 
        address _rewardToken, 
        address _wrappedSonic,
        address _router
    ) {
        require(_veToken != address(0), "ve8020 address cannot be zero");
        require(_rewardToken != address(0), "Reward token address cannot be zero");
        require(_wrappedSonic != address(0), "wS address cannot be zero");
        require(_router != address(0), "Router address cannot be zero");
        
        veToken = ve8020(_veToken);
        rewardToken = IERC20(_rewardToken);
        wrappedSonic = IERC20(_wrappedSonic);
        router = IRouter(_router);
        
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
        require(_rewardAllocation + _liquidityAllocation == 10000, "Must total 10000 basis points");
        
        rewardAllocation = _rewardAllocation;
        liquidityAllocation = _liquidityAllocation;
        
        emit AllocationUpdated(rewardAllocation, liquidityAllocation);
    }
    
    /**
     * @dev Sets the router address for liquidity
     * @param _router Address of the new router
     */
    function setRouter(address _router) external onlyOwner {
        require(_router != address(0), "Router address cannot be zero");
        router = IRouter(_router);
        emit RouterUpdated(_router);
    }
    
    /**
     * @dev Sets the minimum amount of tokens required to add liquidity
     * @param _minTokensToLiquidity Minimum amount of tokens
     */
    function setMinTokensToLiquidity(uint256 _minTokensToLiquidity) external onlyOwner {
        minTokensToLiquidity = _minTokensToLiquidity;
        emit MinTokensToLiquidityUpdated(_minTokensToLiquidity);
    }
    
    /**
     * @dev Sets the frequency for automatic liquidity additions
     * @param _frequency Frequency in seconds
     */
    function setAutoLiquidityFrequency(uint256 _frequency) external onlyOwner {
        autoLiquidityFrequency = _frequency;
        emit AutoLiquidityFrequencyUpdated(_frequency);
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
        
        // Split fees according to allocation
        uint256 rewardsAmount = (_amount * rewardAllocation) / 10000;
        uint256 liquidityAmount = _amount - rewardsAmount;
        
        // Add rewards to current epoch
        if (rewardsAmount > 0) {
            epochRewards[currentEpoch] += rewardsAmount;
            emit RewardsAdded(currentEpoch, rewardsAmount);
        }
        
        // Add liquidity if threshold met
        if (liquidityAmount >= minTokensToLiquidity && 
            (block.timestamp >= lastLiquidityAddition + autoLiquidityFrequency)) {
            _addLiquidity(liquidityAmount);
        }
        
        emit FeesReceived(_amount, rewardsAmount, liquidityAmount);
    }
    
    /**
     * @dev Receive rewards directly (e.g., from the token contract)
     * @param _amount Amount of rewards received
     */
    function receiveRewards(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        
        // Check if epoch needs to be advanced
        checkAdvanceEpoch();
        
        // Split fees according to allocation
        uint256 rewardsAmount = (_amount * rewardAllocation) / 10000;
        uint256 liquidityAmount = _amount - rewardsAmount;
        
        // Add rewards to current epoch
        if (rewardsAmount > 0) {
            epochRewards[currentEpoch] += rewardsAmount;
            emit RewardsAdded(currentEpoch, rewardsAmount);
        }
        
        // Add liquidity if threshold met
        if (liquidityAmount >= minTokensToLiquidity && 
            (block.timestamp >= lastLiquidityAddition + autoLiquidityFrequency)) {
            _addLiquidity(liquidityAmount);
        }
        
        emit FeesReceived(_amount, rewardsAmount, liquidityAmount);
    }
    
    /**
     * @dev Implementation of liquidity addition
     * Adds liquidity to the DEX using allocated tokens
     * @param tokenAmount Amount of DRAGON tokens to use for liquidity
     */
    function _addLiquidity(uint256 tokenAmount) internal {
        require(tokenAmount > 0, "No tokens to add liquidity");
        
        // Calculate how much wS to use - typical implementation would get the fair value
        // For simplicity, we'll use an equal value approach
        uint256 wrappedSonicBalance = wrappedSonic.balanceOf(address(this));
        require(wrappedSonicBalance > 0, "No wS tokens to add liquidity");
        
        // Use exact amounts for approval instead of entire balance
        rewardToken.safeApprove(address(router), 0); // Clear previous approval first
        wrappedSonic.safeApprove(address(router), 0);
        
        rewardToken.safeApprove(address(router), tokenAmount);
        wrappedSonic.safeApprove(address(router), wrappedSonicBalance);
        
        // Add liquidity to DEX pair
        try router.addLiquidity(
            address(rewardToken),
            address(wrappedSonic),
            tokenAmount,
            wrappedSonicBalance,
            0, // Accept any amount of RedDragon
            0, // Accept any amount of wS
            owner(), // Send LP tokens to owner (multisig)
            block.timestamp + 600 // 10 minute deadline
        ) returns (uint256 redDragonAdded, uint256 wrappedSonicAdded, uint256 liquidityTokens) {
            // Update statistics
            totalLiquidityAdded += liquidityTokens;
            totalRedDragonLiquidity += redDragonAdded;
            totalWrappedSonicLiquidity += wrappedSonicAdded;
            lastLiquidityAddition = block.timestamp;
            
            emit LiquidityAdded(redDragonAdded, wrappedSonicAdded, liquidityTokens);
        } catch {
            // If liquidity addition fails, at least clear approvals
            rewardToken.safeApprove(address(router), 0);
            wrappedSonic.safeApprove(address(router), 0);
            
            // Revert with meaningful error
            revert("Liquidity addition failed");
        }
        
        // Clear any remaining approval
        rewardToken.safeApprove(address(router), 0);
        wrappedSonic.safeApprove(address(router), 0);
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
        uint256 holderCount = veToken.balanceOfHolderCount();
        uint256 maxBatchSize = 100; // Process in smaller batches to avoid gas limits
        
        for (uint256 i = 0; i < holderCount && i < maxBatchSize; i++) {
            address holder = veToken.holderAt(i);
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
     * @dev This function is no longer used due to gas optimization
     */
    function _getActiveHolders() internal view returns (address[] memory) {
        uint256 holderCount = veToken.balanceOfHolderCount();
        
        // Count active holders first to avoid creating oversized arrays
        uint256 activeCount = 0;
        for (uint256 i = 0; i < holderCount; i++) {
            address holder = veToken.holderAt(i);
            if (veToken.balanceOf(holder) > 0) {
                activeCount++;
            }
        }
        
        // Create properly sized array
        address[] memory activeHolders = new address[](activeCount);
        
        // Fill array with active holders
        uint256 index = 0;
        for (uint256 i = 0; i < holderCount && index < activeCount; i++) {
            address holder = veToken.holderAt(i);
            if (veToken.balanceOf(holder) > 0) {
                activeHolders[index] = holder;
                index++;
            }
        }
        
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
     * @dev Manually trigger liquidity addition
     * Only callable by owner
     */
    function triggerLiquidityAddition(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than zero");
        _addLiquidity(amount);
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
        
        uint256 holderCount = veToken.balanceOfHolderCount();
        require(_endIndex <= holderCount, "End index out of bounds");
        
        uint256 distributedAmount = 0;
        uint256 recipientCount = 0;
        
        for (uint256 i = _startIndex; i < _endIndex; i++) {
            address holder = veToken.holderAt(i);
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