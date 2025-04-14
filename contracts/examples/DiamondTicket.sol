// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "../interfaces/IPromotionalItem.sol";

/**
 * @title DiamondTicket
 * @dev Premium promotional item that provides maximum allowed boosts
 * This is an example for developers to understand how to implement a promotional item
 * that uses the maximum allowed boost values
 */
contract DiamondTicket is Ownable, IPromotionalItem {
    using EnumerableSet for EnumerableSet.AddressSet;
    
    // Promotional item type identifier
    string public constant ITEM_TYPE = "DIAMOND_TICKET";
    
    // Constants - maximum allowed boost: 15%
    uint256 public constant TICKET_BOOST = 1500; // 15% boost in basis points (maximum allowed)
    
    // Registry address
    address public promotionalRegistry;
    
    // Boost type setting
    BoostType public boostTypeConfig;
    
    // Transfer type setting
    TransferType public transferTypeConfig;
    
    // Tracking who has tickets
    mapping(address => uint256) public userTickets;
    
    // Track original ticket owners (for ONE_TIME_TRANSFER restriction)
    mapping(uint256 => address) public originalTicketOwners;
    
    // Set of all users with tickets
    EnumerableSet.AddressSet private _ticketHolders;
    
    // Total tickets distributed
    uint256 public totalTickets;
    
    // Total tickets used
    uint256 public totalUsed;
    
    // Events
    event TicketAssigned(address indexed user, uint256 ticketId);
    event TicketUsed(address indexed user, uint256 ticketId, uint256 boostedAmount);
    event BoostTypeChanged(BoostType newBoostType);
    event TransferTypeChanged(TransferType newTransferType);
    
    /**
     * @dev Constructor
     * @param initialBoostType The initial boost type (JACKPOT or PROBABILITY)
     * @param initialTransferType The initial transfer type
     */
    constructor(BoostType initialBoostType, TransferType initialTransferType) {
        boostTypeConfig = initialBoostType;
        transferTypeConfig = initialTransferType;
    }
    
    /**
     * @dev Set the promotional registry address
     * @param _registry Address of the registry
     */
    function setPromotionalRegistry(address _registry) external onlyOwner {
        require(_registry != address(0), "Invalid registry address");
        promotionalRegistry = _registry;
    }
    
    /**
     * @dev Change the boost type configuration (admin-only)
     * @param newBoostType The new boost type to set
     */
    function setBoostType(BoostType newBoostType) external onlyOwner {
        boostTypeConfig = newBoostType;
        emit BoostTypeChanged(newBoostType);
    }
    
    /**
     * @dev Change the transfer type configuration (admin-only)
     * @param newTransferType The new transfer type to set
     */
    function setTransferType(TransferType newTransferType) external onlyOwner {
        transferTypeConfig = newTransferType;
        emit TransferTypeChanged(newTransferType);
    }
    
    /**
     * @dev Award a Diamond Ticket to a user (for VIPs or special promotions)
     * @param user Address of the user to receive the ticket
     */
    function awardTicket(address user) external onlyOwner {
        require(user != address(0), "Cannot give to zero address");
        require(userTickets[user] == 0, "User already has a ticket");
        
        // Create a unique ticket ID
        uint256 ticketId = totalTickets + 1;
        totalTickets = ticketId;
        
        // Assign to user
        userTickets[user] = ticketId;
        _ticketHolders.add(user);
        
        emit TicketAssigned(user, ticketId);
    }
    
    /**
     * @dev Get item type - implements IPromotionalItem
     * @return The item type identifier
     */
    function getItemType() external pure override returns (string memory) {
        return ITEM_TYPE;
    }
    
    /**
     * @dev Get the boost type - implements IPromotionalItem
     * @return Current boost type configuration
     */
    function getBoostType() external view override returns (BoostType) {
        return boostTypeConfig;
    }
    
    /**
     * @dev Get the transfer type - implements IPromotionalItem
     * @return Current transfer type configuration
     */
    function getTransferType() external view override returns (TransferType) {
        return transferTypeConfig;
    }
    
    /**
     * @dev Apply a ticket to a transaction - implements IPromotionalItem
     * @param itemId ID of the ticket
     * @param user User applying the ticket
     * @param amount Base amount to potentially boost
     * @return isSuccess Whether application was successful
     * @return boostedAmount Amount after applying boost
     */
    function applyItem(uint256 itemId, address user, uint256 amount) 
        external 
        override 
        returns (bool isSuccess, uint256 boostedAmount) 
    {
        // Verify the caller is authorized
        require(
            msg.sender == promotionalRegistry || msg.sender == owner(),
            "Only registry or owner can call"
        );
        
        // Check if the ticket exists and belongs to the user
        if (userTickets[user] != itemId || itemId == 0) {
            return (false, amount);
        }
        
        // Apply the maximum boost
        boostedAmount = (amount * (10000 + TICKET_BOOST)) / 10000;
        
        // Mark as used
        userTickets[user] = 0;
        _ticketHolders.remove(user);
        totalUsed++;
        
        emit TicketUsed(user, itemId, boostedAmount);
        
        return (true, boostedAmount);
    }
    
    /**
     * @dev Check if a user has a ticket - implements IPromotionalItem
     * @param user User to check
     * @param itemId Ticket ID to check
     * @return True if user has the ticket
     */
    function hasItem(address user, uint256 itemId) external view override returns (bool) {
        return userTickets[user] == itemId && itemId > 0;
    }
    
    /**
     * @dev Calculate boost amount - implements IPromotionalItem
     * @param user User to calculate boost for
     * @param itemId Ticket ID to calculate boost for
     * @return Maximum boost amount in basis points (15%)
     * Note: The lottery contract will cap this if multiple boosts are applied
     */
    function calculateBoost(address user, uint256 itemId) external view override returns (uint256) {
        if (userTickets[user] != itemId || itemId == 0) {
            return 0;
        }
        return TICKET_BOOST; // Maximum allowed boost
    }
    
    /**
     * @dev Get total number of active ticket holders
     * @return Count of active ticket holders
     */
    function getActiveTicketCount() external view returns (uint256) {
        return _ticketHolders.length();
    }
    
    /**
     * @dev Get stats about tickets
     * @return total Total tickets distributed
     * @return active Currently active tickets
     * @return used Total tickets used
     */
    function getStats() external view returns (
        uint256 total,
        uint256 active,
        uint256 used
    ) {
        return (
            totalTickets,
            _ticketHolders.length(),
            totalUsed
        );
    }
} 