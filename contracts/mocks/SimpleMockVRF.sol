// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SimpleMockVRF
 * @dev A simplified mock VRF contract for testing that doesn't rely on interfaces
 */
contract SimpleMockVRF {
    address public coordinatorAddress;
    
    constructor() {
        coordinatorAddress = address(this);
    }
    
    // Simple function to generate a random number for testing
    function getRandomNumber() external view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty, msg.sender)));
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