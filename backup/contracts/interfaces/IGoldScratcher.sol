// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IPromotionalItem.sol";

/**
 * @title IGoldScratcher
 * @dev Interface for the GoldScratcher NFT that provides lottery boost
 * Winners receive a 6.9% boost on top of the default 69% jackpot
 * for a total payout of 75.9% of the jackpot
 */
interface IGoldScratcher is IPromotionalItem {
    /**
     * @dev Check if a user has a GoldScratcher
     * @param user User to check
     * @return bool True if user has at least one scratcher
     */
    function hasScratcher(address user) external view returns (bool);
    
    /**
     * @dev Scratch a GoldScratcher to reveal if it's a winner or loser
     * @param tokenId ID of the token to scratch
     * @return isWinner Whether the scratcher is a winner
     */
    function scratch(uint256 tokenId) external returns (bool);
    
    /**
     * @dev Apply a scratcher to a swap transaction
     * @param tokenId The token ID to use
     * @param swapAmount The amount being swapped
     * @return isWinner Whether the scratcher was a winner
     * @return boostedAmount The amount after boost (if winner)
     */
    function applyToSwap(uint256 tokenId, uint256 swapAmount) external returns (bool isWinner, uint256 boostedAmount);
    
    /**
     * @dev Check if a user has a winning scratcher
     * @param user User address to check
     * @param tokenId Token ID to check
     * @return True if the user has a winning scratcher
     */
    function hasWinningScratcher(address user, uint256 tokenId) external view returns (bool);
    
    /**
     * @dev Calculate jackpot boost amount for a user based on their GoldScratcher
     * @param user Address of the user to calculate boost for
     * @param tokenId Token ID to use for the boost
     * @return boostAmount The boost amount in basis points (690 = 6.9%)
     */
    function calculateBoost(address user, uint256 tokenId) external view returns (uint256);
} 