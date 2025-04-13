// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./ve8020.sol";

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
 * proportional to their voting power, manages liquidity, and handles development budgets.
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
    uint256 public rewardAllocation = 7000; // 70% to ve8020 holders
    uint256 public liquidityAllocation = 1850; // 18.5% to liquidity
    uint256 public developmentAllocation = 1150; // 11.5% to development
    
    // Liquidity configuration
    uint256 public minTokensToLiquidity = 1000 * 10**18; // 1000 tokens min before adding liquidity
    uint256 public autoLiquidityFrequency = 1 days; // Frequency of automated liquidity additions
    uint256 public lastLiquidityAddition;
    
    // Liquidity statistics
    uint256 public totalLiquidityAdded;
    uint256 public totalRedDragonLiquidity;
    uint256 public totalWrappedSonicLiquidity;
    
    // Development budget tracking
    struct Budget {
        string purpose;
        uint256 amount;
        uint256 used;
        uint256 createdAt;
        bool active;
    }
    
    Budget[] public budgets;
    mapping(uint256 => address) public budgetOwners;
    
    // Development statistics
    uint256 public totalDevReceived;
    uint256 public totalDevSpent;
    uint256 public lastSpendTime;
    
    // Events - Distribution Events
    event RewardsAdded(uint256 indexed epoch, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 indexed epoch, uint256 amount);
    event EpochAdvanced(uint256 indexed epoch, uint256 totalVotingPower);
    event FeesReceived(uint256 totalAmount, uint256 rewardsAmount, uint256 liquidityAmount, uint256 developmentAmount);
    event AllocationUpdated(uint256 rewardAllocation, uint256 liquidityAllocation, uint256 developmentAllocation);
    
    // Events - Liquidity Events
    event LiquidityAdded(uint256 redDragonAmount, uint256 wrappedSonicAmount, uint256 liquidityTokens);
    event RouterUpdated(address indexed newRouter);
    event MinTokensToLiquidityUpdated(uint256 newAmount);
    event AutoLiquidityFrequencyUpdated(uint256 newFrequency);
    
    // Events - Development Events
    event TokenSpent(address indexed to, uint256 amount, string purpose, uint256 budgetId);
    event BudgetCreated(uint256 indexed budgetId, string purpose, uint256 amount, address owner);
    event BudgetUpdated(uint256 indexed budgetId, uint256 newAmount, bool active);
    event BudgetSpent(uint256 indexed budgetId, address indexed to, uint256 amount);
    
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
     * @param _developmentAllocation Percentage for development (basis points)
     */
    function setFeeAllocation(
        uint256 _rewardAllocation,
        uint256 _liquidityAllocation,
        uint256 _developmentAllocation
    ) external onlyOwner {
        require(_rewardAllocation + _liquidityAllocation + _developmentAllocation == 10000, "Must total 10000 basis points");
        
        rewardAllocation = _rewardAllocation;
        liquidityAllocation = _liquidityAllocation;
        developmentAllocation = _developmentAllocation;
        
        emit AllocationUpdated(rewardAllocation, liquidityAllocation, developmentAllocation);
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
        uint256 liquidityAmount = (_amount * liquidityAllocation) / 10000;
        uint256 developmentAmount = _amount - rewardsAmount - liquidityAmount;
        
        // Add rewards to current epoch
        if (rewardsAmount > 0) {
            epochRewards[currentEpoch] += rewardsAmount;
            emit RewardsAdded(currentEpoch, rewardsAmount);
        }
        
        // Track development allocation
        if (developmentAmount > 0) {
            totalDevReceived += developmentAmount;
        }
        
        // Add liquidity if threshold met
        if (liquidityAmount >= minTokensToLiquidity && 
            (block.timestamp >= lastLiquidityAddition + autoLiquidityFrequency)) {
            _addLiquidity(liquidityAmount);
        }
        
        emit FeesReceived(_amount, rewardsAmount, liquidityAmount, developmentAmount);
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
        uint256 liquidityAmount = (_amount * liquidityAllocation) / 10000;
        uint256 developmentAmount = _amount - rewardsAmount - liquidityAmount;
        
        // Add rewards to current epoch
        if (rewardsAmount > 0) {
            epochRewards[currentEpoch] += rewardsAmount;
            emit RewardsAdded(currentEpoch, rewardsAmount);
        }
        
        // Track development allocation
        if (developmentAmount > 0) {
            totalDevReceived += developmentAmount;
        }
        
        // Add liquidity if threshold met
        if (liquidityAmount >= minTokensToLiquidity && 
            (block.timestamp >= lastLiquidityAddition + autoLiquidityFrequency)) {
            _addLiquidity(liquidityAmount);
        }
        
        emit FeesReceived(_amount, rewardsAmount, liquidityAmount, developmentAmount);
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
        
        // Approve tokens for router
        rewardToken.safeApprove(address(router), tokenAmount);
        wrappedSonic.safeApprove(address(router), wrappedSonicBalance);
        
        // Add liquidity to DEX pair
        (uint256 redDragonAdded, uint256 wrappedSonicAdded, uint256 liquidityTokens) = router.addLiquidity(
            address(rewardToken),
            address(wrappedSonic),
            tokenAmount,
            wrappedSonicBalance,
            0, // Accept any amount of RedDragon
            0, // Accept any amount of wS
            owner(), // Send LP tokens to owner (multisig)
            block.timestamp + 600 // 10 minute deadline
        );
        
        // Update statistics
        totalLiquidityAdded += liquidityTokens;
        totalRedDragonLiquidity += redDragonAdded;
        totalWrappedSonicLiquidity += wrappedSonicAdded;
        lastLiquidityAddition = block.timestamp;
        
        emit LiquidityAdded(redDragonAdded, wrappedSonicAdded, liquidityTokens);
        
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
    
    // DEVELOPMENT FUNCTIONALITY
    
    /**
     * @dev Creates a new budget allocation
     * @param purpose Description of the budget purpose
     * @param amount Amount allocated for this budget
     * @param budgetOwner Address allowed to spend from this budget
     */
    function createBudget(string memory purpose, uint256 amount, address budgetOwner) external onlyOwner returns (uint256) {
        require(amount > 0, "Budget amount must be greater than zero");
        require(budgetOwner != address(0), "Budget owner cannot be zero address");
        
        uint256 budgetId = budgets.length;
        budgets.push(Budget({
            purpose: purpose,
            amount: amount,
            used: 0,
            createdAt: block.timestamp,
            active: true
        }));
        
        budgetOwners[budgetId] = budgetOwner;
        
        emit BudgetCreated(budgetId, purpose, amount, budgetOwner);
        return budgetId;
    }
    
    /**
     * @dev Updates an existing budget
     * @param budgetId ID of the budget to update
     * @param newAmount New amount for the budget
     * @param active Whether the budget is active
     */
    function updateBudget(uint256 budgetId, uint256 newAmount, bool active) external onlyOwner {
        require(budgetId < budgets.length, "Budget does not exist");
        
        Budget storage budget = budgets[budgetId];
        budget.amount = newAmount;
        budget.active = active;
        
        emit BudgetUpdated(budgetId, newAmount, active);
    }
    
    /**
     * @dev Changes the owner of a budget
     * @param budgetId ID of the budget
     * @param newOwner New owner address
     */
    function changeBudgetOwner(uint256 budgetId, address newOwner) external onlyOwner {
        require(budgetId < budgets.length, "Budget does not exist");
        require(newOwner != address(0), "New owner cannot be zero address");
        
        budgetOwners[budgetId] = newOwner;
    }
    
    /**
     * @dev Allows a budget owner to spend from their budget
     * @param budgetId ID of the budget to spend from
     * @param to Address to send tokens to
     * @param amount Amount to spend
     */
    function spendFromBudget(uint256 budgetId, address to, uint256 amount) external {
        require(budgetId < budgets.length, "Budget does not exist");
        require(msg.sender == budgetOwners[budgetId] || msg.sender == owner(), "Not authorized");
        require(to != address(0), "Cannot send to zero address");
        
        Budget storage budget = budgets[budgetId];
        require(budget.active, "Budget is not active");
        require(amount > 0, "Amount must be greater than zero");
        require(budget.used + amount <= budget.amount, "Exceeds budget");
        
        // Calculate available development funds
        uint256 devAvailable = totalDevReceived - totalDevSpent;
        require(devAvailable >= amount, "Insufficient development funds");
        
        // Update budget and stats
        budget.used += amount;
        totalDevSpent += amount;
        lastSpendTime = block.timestamp;
        
        // Transfer tokens
        rewardToken.safeTransfer(to, amount);
        
        emit BudgetSpent(budgetId, to, amount);
        emit TokenSpent(to, amount, budget.purpose, budgetId);
    }
    
    /**
     * @dev Gets the number of budgets
     * @return The number of budgets
     */
    function getBudgetCount() external view returns (uint256) {
        return budgets.length;
    }
    
    /**
     * @dev Gets details about a budget
     * @param budgetId ID of the budget
     * @return Purpose of the budget
     * @return Total amount allocated
     * @return Amount used
     * @return Creation timestamp
     * @return Whether the budget is active
     * @return Owner of the budget
     */
    function getBudgetDetails(uint256 budgetId) external view returns (
        string memory, uint256, uint256, uint256, bool, address
    ) {
        require(budgetId < budgets.length, "Budget does not exist");
        
        Budget storage budget = budgets[budgetId];
        return (
            budget.purpose,
            budget.amount,
            budget.used,
            budget.createdAt,
            budget.active,
            budgetOwners[budgetId]
        );
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
     * @dev Get available development funds
     * @return Amount of available development funds
     */
    function getAvailableDevelopmentFunds() external view returns (uint256) {
        return totalDevReceived - totalDevSpent;
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
} 