// SPDX-License-Identifier: MIT
// Interface for PaintSwap VRF Coordinator

pragma solidity ^0.8.20;

/**
 * @title IVRFCoordinator
 * @dev Interface for the VRF Coordinator contract
 */
interface IVRFCoordinator {
    /**
     * @dev Request a random number
     * @return requestId The ID of the random number request
     */
    function requestRandomness() external returns (bytes32);

    /**
     * @dev Fulfill a random number request
     * @param requestId The ID of the request to fulfill
     * @param randomness The random number
     */
    function fulfillRandomness(bytes32 requestId, uint256 randomness) external;
} 