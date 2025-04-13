// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockPaintSwapVRF
 * @dev A mock implementation of PaintSwap's VRF for testing
 */
contract MockPaintSwapVRF {
    // Event emitted when randomness is fulfilled
    event RandomnessFulfilled(bytes32 indexed requestId, uint256[] randomWords);
    
    // Mapping to store callback contracts for each request
    mapping(bytes32 => address) private callbacks;
    
    // Request counter
    uint256 private nonce;
    
    /**
     * @dev Request randomness from the VRF provider
     * @return requestId The request ID
     */
    function requestRandomness() external returns (bytes32) {
        bytes32 requestId = keccak256(abi.encodePacked(
            block.timestamp,
            msg.sender,
            nonce++
        ));
        
        callbacks[requestId] = msg.sender;
        
        return requestId;
    }
    
    /**
     * @dev Simulate fulfilling randomness (for testing)
     * @param requestId Request ID
     * @param randomWords Random values to return
     */
    function fulfillRandomnessTest(bytes32 requestId, uint256[] memory randomWords) external {
        address callback = callbacks[requestId];
        require(callback != address(0), "Request not found");
        
        // Call the callback function on the target contract
        (bool success, ) = callback.call(
            abi.encodeWithSignature(
                "fulfillRandomness(bytes32,uint256[])",
                requestId,
                randomWords
            )
        );
        
        require(success, "Callback failed");
        
        // Clean up
        delete callbacks[requestId];
        
        emit RandomnessFulfilled(requestId, randomWords);
    }
} 