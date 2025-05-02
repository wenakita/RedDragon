// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockCallback
 * @dev Simple mock contract for testing VRF functionality
 */
contract MockCallback {
    // Events
    event RandomnessReceived(uint64 requestId, address user, uint256 randomness);
    
    // Tracking
    mapping(uint64 => uint256) public receivedRandomness;
    
    /**
     * @notice Process randomness
     * @param requestId Request ID
     * @param user User address
     * @param randomness Random value
     */
    function processRandomness(uint64 requestId, address user, uint256 randomness) external {
        receivedRandomness[requestId] = randomness;
        emit RandomnessReceived(requestId, user, randomness);
    }
} 