// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPromotionalItem
 * @dev Interface for promotional items that can be used with the lottery
 * This provides a standard interface for all promotional items like
 * GoldScratchers, RedEnvelopes, or future promotional NFTs
 * Note: All boosts will be constrained by global limits:
 * - Maximum jackpot boost: 15% (1500 basis points) on top of default 69%
 * - Maximum probability boost: 5x (500%) multiplier
 */
interface IPromotionalItem {
    /**
     * @dev Type of promotional item for compatibility checks
     * @return itemType The type identifier string (e.g., "SCRATCHER", "ENVELOPE")
     */
    function getItemType() external pure returns (string memory);
    
    /**
     * @dev Enum representing the type of boost this item provides
     * JACKPOT - Boosts the jackpot payout percentage (e.g., GoldScratcher)
     * PROBABILITY - Boosts win probability (e.g., RedEnvelope)
     */
    enum BoostType { JACKPOT, PROBABILITY }
    
    /**
     * @dev Enum representing the transfer restrictions of the promotional item
     * FREELY_TRANSFERABLE - Can be transferred without restrictions (e.g., RedEnvelope)
     * ONE_TIME_TRANSFER - Can only be transferred once from the issuer to the user (e.g., GoldScratcher)
     * NON_TRANSFERABLE - Cannot be transferred after issuance
     */
    enum TransferType { FREELY_TRANSFERABLE, ONE_TIME_TRANSFER, NON_TRANSFERABLE }
    
    /**
     * @dev Get the type of boost this promotional item provides
     * @return boostType The type of boost (jackpot or probability)
     */
    function getBoostType() external view returns (BoostType);
    
    /**
     * @dev Get the transfer type of this promotional item
     * @return transferType The type of transfer restrictions
     */
    function getTransferType() external view returns (TransferType);
    
    /**
     * @dev Apply a promotional item to a swap/lottery transaction
     * @param itemId Identifier for the specific promotional item instance
     * @param user Address of the user
     * @param amount Base amount to potentially boost
     * @return isSuccess Whether the application was successful
     * @return boostedAmount The amount after applying any boost
     */
    function applyItem(uint256 itemId, address user, uint256 amount) external returns (bool isSuccess, uint256 boostedAmount);
    
    /**
     * @dev Check if a user has the promotional item
     * @param user User address
     * @param itemId Item ID to check
     * @return True if user has the item
     */
    function hasItem(address user, uint256 itemId) external view returns (bool);
    
    /**
     * @dev Calculate boost amount for a user
     * @param user Address of the user
     * @param itemId ID of the item
     * @return boostAmount The boost amount in basis points (e.g., 690 = 6.9%)
     * Note that returned boost may be capped by the lottery contract
     */
    function calculateBoost(address user, uint256 itemId) external view returns (uint256);
} 