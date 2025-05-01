// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

/**
 * @title IVRFConsumer
 * @dev Interface for VRF consumer contracts that can request randomness
 */
interface IVRFConsumer {
    /**
     * @notice Request randomness for a user
     * @param user The user requesting randomness
     * @return requestId The request ID for tracking
     */
    function requestRandomness(address user) external returns (uint64 requestId);
    
    /**
     * @notice Process randomness received from VRF
     * @param requestId The request ID
     * @param user The user who requested randomness
     * @param randomness The random value
     */
    function processRandomness(uint64 requestId, address user, uint256 randomness) external;
} 