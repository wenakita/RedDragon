// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPromotionalItemRegistry
 * @dev Interface for the promotional item registry
 */
interface IPromotionalItemRegistry {
    /**
     * @dev Register a promotional item
     * @param itemType The type of the item
     * @param itemAddress The contract address of the item
     */
    function registerPromotionalItem(string calldata itemType, address itemAddress) external;
    
    /**
     * @dev Unregister a promotional item
     * @param itemType The type of the item
     */
    function unregisterPromotionalItem(string calldata itemType) external;
    
    /**
     * @dev Get a promotional item contract address
     * @param itemType The type of the item
     * @return The contract address of the item
     */
    function getPromotionalItem(string calldata itemType) external view returns (address);
    
    /**
     * @dev Check if a promotional item type exists
     * @param itemType The type of the item
     * @return True if the item type exists
     */
    function promotionalItemExists(string calldata itemType) external view returns (bool);
    
    /**
     * @dev Get all registered promotional item types
     * @return Array of item types
     */
    function getAllPromotionalItemTypes() external view returns (string[] memory);
} 