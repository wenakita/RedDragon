// SPDX-License-Identifier: MIT
// Interface for PaintSwap VRF Coordinator

pragma solidity ^0.8.20;

/**
 * @title IVRFCoordinator
 * @dev Interface for the PaintSwap VRF Coordinator
 * @notice Based on method signatures observed in testnet transactions
 */
interface IVRFCoordinator {
    /**
     * @dev Fulfills a randomness request with proof
     * @param requestId The ID of the request to fulfill
     * @param randomWords The random values generated
     */
    function fulfillRandomWords(bytes32 requestId, uint256[] memory randomWords) external;
    
    /**
     * @dev Requests randomness 
     * @return requestId The ID for the randomness request
     */
    function requestRandomness() external returns (bytes32);
} 