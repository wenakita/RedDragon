// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDragonPaintSwapVRF
 * @dev Interface for the Dragon PaintSwap VRF implementation
 */
interface IDragonPaintSwapVRF {
    /**
     * @dev Request randomness from the VRF coordinator
     * @return requestId The unique ID for this randomness request
     */
    function requestRandomness() external returns (bytes32);
    
    /**
     * @dev Get the VRF coordinator address
     * @return The address of the VRF coordinator
     */
    function COORDINATOR() external view returns (address);
    
    /**
     * @dev Get the VRF key hash
     * @return The key hash used for VRF requests
     */
    function KEY_HASH() external view returns (bytes32);
    
    /**
     * @dev Get the VRF subscription ID
     * @return The subscription ID used for VRF requests
     */
    function SUBSCRIPTION_ID() external view returns (uint64);
} 