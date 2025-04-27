// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title ILegacyDragonLotterySwap
 * @dev Legacy interface for backward compatibility with DragonLotterySwap
 */
interface ILegacyDragonLotterySwap {
    /**
     * @notice Add funds to the jackpot
     * @param _amount The amount to add
     */
    function addToJackpot(uint256 _amount) external;
    
    /**
     * @notice Process a buy transaction for lottery entry
     * @param _user The user address
     * @param _amount The amount of wS
     */
    function processBuy(address _user, uint256 _amount) external;
    
    /**
     * @notice Process a sell transaction
     * @param _user The user address
     * @param _amount The amount of wS
     */
    function processSell(address _user, uint256 _amount) external;
    
    /**
     * @notice Get the current jackpot balance
     * @return The jackpot balance
     */
    function jackpotBalance() external view returns (uint256);
} 