// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IJackpot.sol";

/**
 * @title MockJackpot
 * @dev A simple mock contract implementing the IJackpot interface
 * Used for testing integration with jackpot-related functionality
 */
contract MockJackpot is IJackpot, Ownable {
    uint256 public jackpotSize;
    uint256 public entryCount;
    mapping(address => uint256) public userEntries;
    
    address public lastEntryUser;
    uint256 public lastEntryAmount;
    
    event JackpotEntry(address indexed user, uint256 amount);
    
    /**
     * @dev Record a jackpot entry 
     * @param user The address entering the jackpot
     * @param amount The amount of tokens used to enter
     */
    function enterJackpotWithWrappedSonic(address user, uint256 amount) external override {
        jackpotSize += amount;
        entryCount++;
        userEntries[user] += amount;
        
        lastEntryUser = user;
        lastEntryAmount = amount;
        
        emit JackpotEntry(user, amount);
    }
    
    /**
     * @dev Get the current jackpot size
     * @return The current jackpot size
     */
    function getJackpotSize() external view returns (uint256) {
        return jackpotSize;
    }
    
    /**
     * @dev Get the total number of jackpot entries
     * @return Number of entries
     */
    function getTotalEntries() external view returns (uint256) {
        return entryCount;
    }
    
    /**
     * @dev Get details of the most recent entry
     * @return user Address of the user who entered
     * @return amount Amount of tokens entered with
     */
    function getLastEntry() external view returns (address user, uint256 amount) {
        return (lastEntryUser, lastEntryAmount);
    }
} 