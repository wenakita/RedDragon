// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockProcessSwap
 * @dev Mock contract for testing lottery swap processing
 */
contract MockProcessSwap {
    uint256 public callCount = 0;
    address public lastCaller;
    uint256 public lastAmount;
    
    // Event for tracking calls
    event ProcessSwapCalled(address sender, uint256 amount, address token);
    event ProcessBuyCalled(address user, uint256 amount);
    
    /**
     * @dev Process a swap (mock implementation)
     * @param amount Amount of tokens in the swap
     * @param token Address of the token being swapped
     */
    function processSwap(address sender, uint256 amount, address token) external {
        callCount++;
        lastCaller = sender;
        lastAmount = amount;
        
        emit ProcessSwapCalled(sender, amount, token);
    }
    
    /**
     * @dev Process a buy (required by RedDragon contract)
     * @param user Address of the user making the buy
     * @param amount Amount of tokens bought
     */
    function processBuy(address user, uint256 amount) external {
        callCount++;
        lastCaller = user;
        lastAmount = amount;
        
        emit ProcessBuyCalled(user, amount);
    }
    
    /**
     * @dev Add to jackpot (required by RedDragon contract)
     * @param amount Amount to add to jackpot
     */
    function addToJackpot(uint256 amount) external {
        callCount++;
        lastAmount = amount;
        
        // Just increase call count, no actual implementation needed
    }
    
    /**
     * @dev Get the number of times process functions were called
     */
    function getCallCount() external view returns (uint256) {
        return callCount;
    }
    
    /**
     * @dev Get info about the last call
     */
    function getLastCallInfo() external view returns (address, uint256) {
        return (lastCaller, lastAmount);
    }
    
    /**
     * @dev Function to test a jackpot win
     */
    function testJackpotWin(uint256 amount) external {
        // Do nothing, just a mock
    }
} 