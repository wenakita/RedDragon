// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDragonSwapTrigger
 * @dev Interface for the Dragon Swap Trigger that handles lottery entries
 */
interface IDragonSwapTrigger {
    /**
     * @notice Triggered when a user swaps native token for DRAGON
     * @param _user The user who performed the swap
     * @param _amount The amount of native token swapped
     */
    function onSwapNativeTokenToDragon(address _user, uint256 _amount) external;
    
    /**
     * @notice Add funds to the jackpot
     * @param _amount The amount to add
     */
    function addToJackpot(uint256 _amount) external;
    
    /**
     * @notice Get the current jackpot balance
     * @return The jackpot balance
     */
    function getJackpotBalance() external view returns (uint256);
    
    /**
     * @notice Set the win threshold
     * @param _winThreshold The new win threshold
     */
    function setWinThreshold(uint256 _winThreshold) external;
    
    /**
     * @notice Set the minimum swap amount
     * @param _minSwapAmount The new minimum swap amount
     */
    function setMinSwapAmount(uint256 _minSwapAmount) external;
    
    /**
     * @notice Process randomness
     * @param _requestId The request ID
     * @param _randomness The random value
     */
    function fulfillRandomness(uint256 _requestId, uint256 _randomness) external;
    
    /**
     * @notice Set the VRF consumer address
     * @param _vrfConsumerAddress The new address
     */
    function setVRFConsumer(address _vrfConsumerAddress) external;
    
    /**
     * @notice Get the native token wrapper address used by this swap trigger
     * @return The native token wrapper address
     */
    function getNativeTokenWrapper() external view returns (address);
} 