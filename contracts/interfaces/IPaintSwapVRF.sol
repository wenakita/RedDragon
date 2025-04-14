// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev Interface for PaintSwap's VRF (Verifiable Random Function)
 * This interface is used to interact with PaintSwap's randomness service
 */
interface IPaintSwapVRF {
    /**
     * @dev Request random values from the VRF service
     * @return requestId The ID of the randomness request
     */
    function requestRandomness() external returns (bytes32);
    
    /**
     * @dev Callback function called by the VRF provider when randomness is ready
     * @param requestId The ID of the randomness request
     * @param randomWords The random values generated
     */
    function fulfillRandomness(bytes32 requestId, uint256[] memory randomWords) external;
} 