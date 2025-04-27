// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title IVRFConsumer
 * @notice Interface for contracts that consume VRF randomness
 */
interface IVRFConsumer {
    /**
     * @notice Function to receive the random values from VRF
     * @param requestId The ID of the request
     * @param randomWord The random value
     */
    function fulfillRandomWords(uint64 requestId, uint256 randomWord) external;
} 