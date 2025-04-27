// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @title IJackpot
 * @dev Interface for Jackpot contract
 * Defines functions for entering jackpots with optional boost
 */
interface IJackpot {
    /**
     * @dev Allow a user to enter the jackpot with wrapped Sonic tokens
     * @param user Address of the user entering the jackpot
     * @param amount Amount of wrapped Sonic tokens used to enter
     */
    function enterJackpotWithWrappedSonic(address user, uint256 amount) external;
    
    /**
     * @dev Get the current jackpot size
     * @return The current jackpot size in wrapped Sonic tokens
     */
    function getJackpotSize() external view returns (uint256);
    
    /**
     * @dev Get the total number of jackpot entries
     * @return Number of entries
     */
    function getTotalEntries() external view returns (uint256);
    
    /**
     * @dev Get details of the most recent entry
     * @return user Address of the user who entered
     * @return amount Amount of tokens entered with
     */
    function getLastEntry() external view returns (address user, uint256 amount);
}
