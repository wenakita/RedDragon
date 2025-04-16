// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IRedDragonSwapLottery.sol";

/**
 * @title IRedDragonSwapLotteryWithScratcher
 * @dev Interface for the RedDragonSwapLotteryWithScratcher contract
 * Extends the standard lottery interface with scratcher-specific functionality
 */
interface IRedDragonSwapLotteryWithScratcher is IRedDragonSwapLottery {
    /**
     * @dev Register a winning scratcher for a user
     * @param user User's address
     * @param tokenId Token ID of the winning scratcher
     */
    function registerWinningScratcher(address user, uint256 tokenId) external;
    
    /**
     * @dev Calculate total jackpot percentage including GoldScratcher boost if applicable
     * @param _user Address of the user
     * @return percentage Total jackpot percentage in basis points
     */
    function calculateJackpotPercentage(address _user) external view returns (uint256);
} 