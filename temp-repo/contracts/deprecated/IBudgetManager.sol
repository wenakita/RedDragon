// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev Interface for budget management functionality
 * @notice DEPRECATED: No longer in use as project does not use development funds
 */
interface IBudgetManager {
    /**
     * @dev Structure for tracking budgets
     */
    struct Budget {
        string purpose;
        uint256 amount;
        uint256 used;
        uint256 createdAt;
        bool active;
    }
    
    /**
     * @dev Creates a new budget allocation
     * @param purpose Description of the budget purpose
     * @param amount Amount allocated for this budget
     * @param budgetOwner Address allowed to spend from this budget
     * @return The ID of the created budget
     */
    function createBudget(string memory purpose, uint256 amount, address budgetOwner) external returns (uint256);
    
    /**
     * @dev Updates an existing budget
     * @param budgetId ID of the budget to update
     * @param newAmount New amount for the budget
     * @param active Whether the budget is active
     */
    function updateBudget(uint256 budgetId, uint256 newAmount, bool active) external;
    
    /**
     * @dev Changes the owner of a budget
     * @param budgetId ID of the budget
     * @param newOwner New owner address
     */
    function changeBudgetOwner(uint256 budgetId, address newOwner) external;
    
    /**
     * @dev Allows a budget owner to spend from their budget
     * @param budgetId ID of the budget to spend from
     * @param to Address to send tokens to
     * @param amount Amount to spend
     */
    function spendFromBudget(uint256 budgetId, address to, uint256 amount) external;
    
    /**
     * @dev Gets the number of budgets
     * @return The number of budgets
     */
    function getBudgetCount() external view returns (uint256);
    
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
    );
    
    /**
     * @dev Event emitted when a budget is created
     */
    event BudgetCreated(uint256 indexed budgetId, string purpose, uint256 amount, address owner);
    
    /**
     * @dev Event emitted when a budget is updated
     */
    event BudgetUpdated(uint256 indexed budgetId, uint256 newAmount, bool active);
    
    /**
     * @dev Event emitted when tokens are spent from a budget
     */
    event BudgetSpent(uint256 indexed budgetId, address indexed to, uint256 amount);
} 