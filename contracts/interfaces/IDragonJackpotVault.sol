// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDragonJackpotVault
 * @dev Interface for the Dragon jackpot vault contract
 */
interface IDragonJackpotVault {
    /**
     * @dev Adds wrapped Sonic to the jackpot
     * @param amount Amount to add
     */
    function addToJackpot(uint256 amount) external;
    
    /**
     * @dev Gets the current jackpot size
     * @return Current jackpot size
     */
    function getJackpotSize() external view returns (uint256);
    
    /**
     * @dev Distributes the jackpot to a winner
     * @param winner Address of the winner
     * @param amount Amount to distribute
     */
    function distributeJackpot(address winner, uint256 amount) external;
    
    /**
     * @dev Withdraws funds from the jackpot (admin only)
     * @param amount Amount to withdraw
     * @param recipient Recipient of the funds
     */
    function withdrawJackpot(uint256 amount, address recipient) external;
} 