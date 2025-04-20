// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MockJackpot {
    // Track jackpot entries for testing
    mapping(address => uint256) public userEnteredCount;
    uint256 public lastEnteredAmount;
    address public lastEnteredUser;
    uint256 public totalJackpotAmount;
    
    function enterJackpotWithWS(address user, uint256 wsAmount) external {
        userEnteredCount[user]++;
        lastEnteredAmount = wsAmount;
        lastEnteredUser = user;
    }
    
    function addToJackpot(uint256 amount) external {
        totalJackpotAmount += amount;
    }
} 