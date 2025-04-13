// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RedDragonDevelopmentVault
 * @dev A dedicated vault for collecting and managing development fees
 */
contract RedDragonDevelopmentVault is Ownable {
    using SafeERC20 for IERC20;
    
    // State variables
    IERC20 public wrappedSonic;
    IERC20 public redDragonToken;
    
    // Budget tracking
    struct Budget {
        string purpose;
        uint256 amount;
        uint256 used;
        uint256 createdAt;
        bool active;
    }
    
    Budget[] public budgets;
    mapping(uint256 => address) public budgetOwners;
    
    // Statistics for transparency
    uint256 public totalReceived;
    uint256 public totalSpent;
    uint256 public lastSpendTime;
    
    // Events
    event TokensReceived(address indexed from, uint256 amount);
    event TokenSpent(address indexed to, uint256 amount, string purpose, uint256 budgetId);
    event TokenAddressUpdated(address indexed newAddress);
    event BudgetCreated(uint256 indexed budgetId, string purpose, uint256 amount, address owner);
    event BudgetUpdated(uint256 indexed budgetId, uint256 newAmount, bool active);
    event BudgetSpent(uint256 indexed budgetId, address indexed to, uint256 amount);
    event EmergencyWithdrawal(address indexed to, uint256 amount, address token);
    
    /**
     * @dev Constructor to initialize the vault
     * @param _wrappedSonic Address of the wS token
     * @param _owner Address of the owner (typically a multisig)
     */
    constructor(address _wrappedSonic, address _owner) {
        require(_wrappedSonic != address(0), "wS address cannot be zero");
        require(_owner != address(0), "Owner address cannot be zero");
        
        wrappedSonic = IERC20(_wrappedSonic);
        
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
        
        uint256 wSBalance = wrappedSonic.balanceOf(address(this));
        require(wSBalance >= amount, "Insufficient wS balance");
        
        // Update budget and stats
        budget.used += amount;
        totalSpent += amount;
        lastSpendTime = block.timestamp;
        
        // Transfer tokens
        wrappedSonic.safeTransfer(to, amount);
        
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