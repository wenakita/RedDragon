// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title IDragonSwapTrigger
 * @dev Interface for the DragonSwapTrigger contract
 */
interface IDragonSwapTrigger {
    /**
     * @notice Triggered when a user swaps wS for DRAGON
     * @param _user The user who performed the swap
     * @param _amount The amount of wS swapped
     */
    function onSwapWSToDragon(address _user, uint256 _amount) external;
    
    /**
     * @notice Add funds to the jackpot
     * @param _amount The amount to add
     */
    function addToJackpot(uint256 _amount) external;
    
    /**
     * @notice Get the current jackpot balance
     * @return The jackpot balance
     */
    function jackpotBalance() external view returns (uint256);
    
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
     * @notice Callback function for VRF to deliver randomness
     * @param _requestId The request ID
     * @param _randomness The random value
     */
    function fulfillRandomness(uint256 _requestId, uint256 _randomness) external;
    
    /**
     * @notice Update the SonicVRFReceiver address
     * @param _sonicVRFReceiverAddress The new address
     */
    function setSonicVRFReceiver(address _sonicVRFReceiverAddress) external;
} 