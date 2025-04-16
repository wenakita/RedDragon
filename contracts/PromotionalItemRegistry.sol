// SPDX-License-Identifier: MIT

/**
 *   =============================
 *   | PROMOTIONAL ITEM REGISTRY |
 *   =============================
 *   | For Managing Boost Items  |
 *   =============================
 *
 * // "I'll slap you so hard you'll end up in the Ming Dynasty." - Carter
 * // https://x.com/sonicreddragon
 * // https://t.me/sonicreddragon
 */

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IPromotionalItem.sol";

/**
 * @title PromotionalItemRegistry
 * @dev Registry for all promotional items and their types.
 * Allows for dynamic registration of new promotional item types
 */
contract PromotionalItemRegistry is Ownable {
    // Mapping of item type string to contract address
    mapping(string => address) public promotionalItems;
    
    // List of all registered item types
    string[] public registeredItemTypes;
    
    // Store boost types by item type for easier lookup
    mapping(string => IPromotionalItem.BoostType) public itemBoostTypes;
    
    // Store transfer types by item type for easier lookup
    mapping(string => IPromotionalItem.TransferType) public itemTransferTypes;
    
    // Events
    event PromotionalItemRegistered(
        string indexed itemType, 
        address indexed itemContract, 
        IPromotionalItem.BoostType boostType,
        IPromotionalItem.TransferType transferType
    );
    event PromotionalItemRemoved(string indexed itemType, address indexed itemContract);
    
    /**
     * @dev Register a new promotional item type
     * @param itemType String identifier for the item type
     * @param itemContract Address of the contract implementing IPromotionalItem
     */
    function registerPromotionalItem(string calldata itemType, address itemContract) external onlyOwner {
        require(itemContract != address(0), "Invalid contract address");
        require(bytes(itemType).length > 0, "Empty item type not allowed");
        
        // Verify the contract implements the correct interface
        string memory contractItemType = IPromotionalItem(itemContract).getItemType();
        require(
            keccak256(abi.encodePacked(contractItemType)) == keccak256(abi.encodePacked(itemType)),
            "Item type mismatch"
        );
        
        // Get boost and transfer types
        IPromotionalItem.BoostType boostType = IPromotionalItem(itemContract).getBoostType();
        IPromotionalItem.TransferType transferType = IPromotionalItem(itemContract).getTransferType();
        
        // Register the item
        promotionalItems[itemType] = itemContract;
        itemBoostTypes[itemType] = boostType;
        itemTransferTypes[itemType] = transferType;
        
        // Add to list if not already present
        bool exists = false;
        for (uint i = 0; i < registeredItemTypes.length; i++) {
            if (keccak256(abi.encodePacked(registeredItemTypes[i])) == keccak256(abi.encodePacked(itemType))) {
                exists = true;
                break;
            }
        }
        
        if (!exists) {
            registeredItemTypes.push(itemType);
        }
        
        emit PromotionalItemRegistered(itemType, itemContract, boostType, transferType);
    }
    
    /**
     * @dev Remove a promotional item type
     * @param itemType String identifier for the item type to remove
     */
    function removePromotionalItem(string calldata itemType) external onlyOwner {
        require(promotionalItems[itemType] != address(0), "Item type not registered");
        
        address itemContract = promotionalItems[itemType];
        delete promotionalItems[itemType];
        
        // Remove from the list
        for (uint i = 0; i < registeredItemTypes.length; i++) {
            if (keccak256(abi.encodePacked(registeredItemTypes[i])) == keccak256(abi.encodePacked(itemType))) {
                // Replace with the last element and pop
                registeredItemTypes[i] = registeredItemTypes[registeredItemTypes.length - 1];
                registeredItemTypes.pop();
                break;
            }
        }
        
        emit PromotionalItemRemoved(itemType, itemContract);
    }
    
    /**
     * @dev Get a promotional item contract by type
     * @param itemType Type of the promotional item
     * @return The contract address implementing this item type
     */
    function getPromotionalItem(string calldata itemType) external view returns (address) {
        return promotionalItems[itemType];
    }
    
    /**
     * @dev Get all registered item types
     * @return Array of all registered item types
     */
    function getAllItemTypes() external view returns (string[] memory) {
        return registeredItemTypes;
    }
    
    /**
     * @dev Check if an item type is registered
     * @param itemType Type to check
     * @return True if the item type is registered
     */
    function isItemTypeRegistered(string calldata itemType) external view returns (bool) {
        return promotionalItems[itemType] != address(0);
    }
    
    /**
     * @dev Get a promotional item's boost type
     * @param itemType Type of the promotional item
     * @return The boost type (JACKPOT or PROBABILITY)
     */
    function getBoostType(string calldata itemType) external view returns (IPromotionalItem.BoostType) {
        require(promotionalItems[itemType] != address(0), "Item type not registered");
        return itemBoostTypes[itemType];
    }
    
    /**
     * @dev Get a promotional item's transfer type
     * @param itemType Type of the promotional item
     * @return The transfer type (FREELY_TRANSFERABLE, ONE_TIME_TRANSFER, or NON_TRANSFERABLE)
     */
    function getTransferType(string calldata itemType) external view returns (IPromotionalItem.TransferType) {
        require(promotionalItems[itemType] != address(0), "Item type not registered");
        return itemTransferTypes[itemType];
    }
    
    /**
     * @dev Check if an item type supports a specific boost type
     * @param itemType Type of promotional item
     * @param boostType Boost type to check
     * @return True if the item has the specified boost type
     */
    function hasBoostType(string calldata itemType, IPromotionalItem.BoostType boostType) external view returns (bool) {
        return itemBoostTypes[itemType] == boostType;
    }
    
    /**
     * @dev Check if an item type supports a specific transfer type
     * @param itemType Type of promotional item
     * @param transferType Transfer type to check
     * @return True if the item has the specified transfer type
     */
    function hasTransferType(string calldata itemType, IPromotionalItem.TransferType transferType) external view returns (bool) {
        return itemTransferTypes[itemType] == transferType;
    }
    
    /**
     * @dev Get all registered items with a specific boost type
     * @param boostType Boost type to filter by
     * @return itemTypes Array of item types with the specified boost type
     */
    function getItemsByBoostType(IPromotionalItem.BoostType boostType) external view returns (string[] memory itemTypes) {
        uint256 count = 0;
        
        // First count matching items
        for (uint i = 0; i < registeredItemTypes.length; i++) {
            if (itemBoostTypes[registeredItemTypes[i]] == boostType) {
                count++;
            }
        }
        
        // Create appropriately sized array
        itemTypes = new string[](count);
        
        // Fill array with matching items
        uint256 index = 0;
        for (uint i = 0; i < registeredItemTypes.length; i++) {
            if (itemBoostTypes[registeredItemTypes[i]] == boostType) {
                itemTypes[index] = registeredItemTypes[i];
                index++;
            }
        }
        
        return itemTypes;
    }
    
    /**
     * @dev Get all registered items with a specific transfer type
     * @param transferType Transfer type to filter by
     * @return itemTypes Array of item types with the specified transfer type
     */
    function getItemsByTransferType(IPromotionalItem.TransferType transferType) external view returns (string[] memory itemTypes) {
        uint256 count = 0;
        
        // First count matching items
        for (uint i = 0; i < registeredItemTypes.length; i++) {
            if (itemTransferTypes[registeredItemTypes[i]] == transferType) {
                count++;
            }
        }
        
        // Create appropriately sized array
        itemTypes = new string[](count);
        
        // Fill array with matching items
        uint256 index = 0;
        for (uint i = 0; i < registeredItemTypes.length; i++) {
            if (itemTransferTypes[registeredItemTypes[i]] == transferType) {
                itemTypes[index] = registeredItemTypes[i];
                index++;
            }
        }
        
        return itemTypes;
    }
} 