// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SimpleMockVRF
 * @dev Very basic mock of a VRF provider for test environments
 */
contract SimpleMockVRF {
    address public coordinatorAddress;
    
    constructor() {
        coordinatorAddress = address(this);
    }
    
    /**
     * @dev Generate a pseudo-random number
     * @return A random-like uint256 value
     */
    function getRandomness() external view returns (uint256) {
        // In a production environment, this would be replaced with a proper VRF solution
        // This is only for testing and should never be used in production
        return uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender)));
    }
    
    // Simulate requesting randomness
    function requestRandomness(bytes32 keyHash, uint64 subId, uint16 minimumRequestConfirmations, uint32 callbackGasLimit, uint32 numWords) external returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, numWords)));
    }
    
    // Function to act as if fulfilling a randomness request
    function fulfillRandomWords(uint256 requestId, address consumer) external {
        // This would do nothing in the mock
    }
} 