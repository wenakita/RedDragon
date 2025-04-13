// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

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
 * @title RedDragonLiquiDevVault
 * @dev A dedicated vault for collecting and managing both liquidity and development fees
 */
contract RedDragonLiquiDevVault is Ownable {
    using SafeERC20 for IERC20;
    
    // State variables
    IERC20 public wrappedSonic;
    IERC20 public redDragonToken;
    IRouter public router;
    
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
    uint256 public totalReceived;
    uint256 public totalSpent;
    uint256 public lastSpendTime;
    
    // Fee allocation
    uint256 public liquidityAllocation = 62; // 62% of incoming fees to liquidity (1.5% of 2.41% total)
    uint256 public developmentAllocation = 38; // 38% of incoming fees to development (0.91% of 2.41% total)
    
    // Events
    // Liquidity events
    event TokensReceived(address indexed from, uint256 amount);
    event LiquidityAdded(uint256 redDragonAmount, uint256 wrappedSonicAmount, uint256 liquidityTokens);
    event RouterUpdated(address indexed newRouter);
    event TokenAddressUpdated(address indexed newAddress);
    event MinTokensToLiquidityUpdated(uint256 newAmount);
    event AutoLiquidityFrequencyUpdated(uint256 newFrequency);
    
    // Development events
    event TokenSpent(address indexed to, uint256 amount, string purpose, uint256 budgetId);
    event BudgetCreated(uint256 indexed budgetId, string purpose, uint256 amount, address owner);
    event BudgetUpdated(uint256 indexed budgetId, uint256 newAmount, bool active);
    event BudgetSpent(uint256 indexed budgetId, address indexed to, uint256 amount);
    
    // Shared events
    event EmergencyWithdrawal(address indexed to, uint256 amount, address token);
    event AllocationUpdated(uint256 liquidityAllocation, uint256 developmentAllocation);
    
    /**
     * @dev Constructor to initialize the vault
     * @param _wrappedSonic Address of the wS token
     * @param _router Address of the router for liquidity addition
     * @param _owner Address of the owner (typically a multisig)
     */
    constructor(address _wrappedSonic, address _router, address _owner) {
        require(_wrappedSonic != address(0), "wS address cannot be zero");
        require(_router != address(0), "Router address cannot be zero");
        require(_owner != address(0), "Owner address cannot be zero");
        
        wrappedSonic = IERC20(_wrappedSonic);
        router = IRouter(_router);
        
        // Transfer ownership to the specified owner (multisig)
        transferOwnership(_owner);
    }
    
    /**
     * @dev Sets the address of the RedDragon token
     * @param _redDragonToken Address of the RedDragon token
     */
    function setTokenAddress(address _redDragonToken) external onlyOwner {
        require(_redDragonToken != address(0), "Token address cannot be zero");
        redDragonToken = IERC20(_redDragonToken);
        emit TokenAddressUpdated(_redDragonToken);
    }
    
    /**
     * @dev Sets the router address
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
     * @dev Updates the allocation between liquidity and development
     * @param _liquidityAllocation Percentage for liquidity (0-100)
     */
    function updateAllocation(uint256 _liquidityAllocation) external onlyOwner {
        require(_liquidityAllocation <= 100, "Allocation must be 0-100");
        liquidityAllocation = _liquidityAllocation;
        developmentAllocation = 100 - _liquidityAllocation;
        emit AllocationUpdated(liquidityAllocation, developmentAllocation);
    }
    
    /**
     * @dev Process incoming tokens and allocate them to liquidity and development
     * Can be called by anyone
     */
    function processTokens() external {
        uint256 balance = redDragonToken.balanceOf(address(this));
        require(balance > 0, "No tokens to process");
        
        // Calculate allocations
        uint256 liquidityPortion = (balance * liquidityAllocation) / 100;
        uint256 developmentPortion = balance - liquidityPortion;
        
        // Add liquidity if threshold met
        if (liquidityPortion >= minTokensToLiquidity && 
            (block.timestamp >= lastLiquidityAddition + autoLiquidityFrequency)) {
            _addLiquidity(liquidityPortion);
        }
        
        // Update development stats
        totalReceived += developmentPortion;
    }
    
    /**
     * @dev Check if liquidity addition criteria are met
     * @return Whether liquidity should be added
     */
    function shouldAddLiquidity() public view returns (bool) {
        // Calculate how much would go to liquidity
        uint256 balance = redDragonToken.balanceOf(address(this));
        uint256 liquidityPortion = (balance * liquidityAllocation) / 100;
        
        // Check token balance threshold
        if (liquidityPortion < minTokensToLiquidity) {
            return false;
        }
        
        // Check time-based criteria
        if (block.timestamp < lastLiquidityAddition + autoLiquidityFrequency) {
            return false;
        }
        
        return true;
    }
    
    /**
     * @dev Add liquidity to the DEX if criteria are met
     * Can be triggered by anyone
     */
    function addLiquidityIfNeeded() external {
        if (shouldAddLiquidity()) {
            uint256 balance = redDragonToken.balanceOf(address(this));
            uint256 liquidityPortion = (balance * liquidityAllocation) / 100;
            _addLiquidity(liquidityPortion);
        }
    }
    
    /**
     * @dev Manually trigger liquidity addition
     * Only callable by owner
     */
    function triggerLiquidityAddition() external onlyOwner {
        uint256 balance = redDragonToken.balanceOf(address(this));
        uint256 liquidityPortion = (balance * liquidityAllocation) / 100;
        _addLiquidity(liquidityPortion);
    }
    
    /**
     * @dev Implementation of liquidity addition
     * Adds liquidity to the DEX using allocated tokens
     * @param tokenAmount Amount of DRAGON tokens to use for liquidity
     */
    function _addLiquidity(uint256 tokenAmount) internal {
        require(address(redDragonToken) != address(0), "Token address not set");
        require(tokenAmount > 0, "No tokens to add liquidity");
        
        // Calculate how much wS to use - typical implementation would get the fair value
        // For simplicity, we'll use an equal value approach
        uint256 wrappedSonicBalance = wrappedSonic.balanceOf(address(this));
        require(wrappedSonicBalance > 0, "No wS tokens to add liquidity");
        
        // Approve tokens for router
        redDragonToken.safeApprove(address(router), tokenAmount);
        wrappedSonic.safeApprove(address(router), wrappedSonicBalance);
        
        // Add liquidity to DEX pair
        (uint256 redDragonAdded, uint256 wrappedSonicAdded, uint256 liquidityTokens) = router.addLiquidity(
            address(redDragonToken),
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
        redDragonToken.safeApprove(address(router), 0);
        wrappedSonic.safeApprove(address(router), 0);
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
        
        uint256 redDragonBalance = redDragonToken.balanceOf(address(this));
        uint256 developmentPortion = (redDragonBalance * developmentAllocation) / 100;
        require(developmentPortion >= amount, "Insufficient development funds");
        
        // Update budget and stats
        budget.used += amount;
        totalSpent += amount;
        lastSpendTime = block.timestamp;
        
        // Transfer tokens
        redDragonToken.safeTransfer(to, amount);
        
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
     * @dev Fallback function to receive ETH
     */
    receive() external payable {
        emit TokensReceived(msg.sender, msg.value);
    }
} 