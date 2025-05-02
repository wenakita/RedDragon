// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockVRFCoordinatorV1
 * @dev Mock implementation of Chainlink VRF Coordinator for testing
 */
contract MockVRFCoordinatorV1 {
    // Track requests
    mapping(uint256 => bool) public requests;
    uint256 public requestCount;
    
    // Events
    event RandomWordsRequested(
        uint256 indexed requestId,
        address indexed requester,
        uint64 subId,
        bytes32 keyHash,
        uint16 requestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords
    );
    
    event RandomWordsFulfilled(
        uint256 indexed requestId,
        address indexed consumer,
        uint256[] randomWords
    );
    
    /**
     * @notice Mock implementation of requestRandomWords
     */
    function requestRandomWords(
        bytes32 keyHash,
        uint64 subId,
        uint16 requestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords
    ) external returns (uint256) {
        uint256 requestId = requestCount++;
        requests[requestId] = true;
        
        emit RandomWordsRequested(
            requestId,
            msg.sender,
            subId,
            keyHash,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
        
        return requestId;
    }
    
    /**
     * @notice Simulate fulfillment of random words
     * @param requestId Request ID
     * @param consumer VRF consumer contract address
     * @param randomWords Random values to fulfill
     */
    function fulfillRandomWords(
        uint256 requestId,
        address consumer,
        uint256[] memory randomWords
    ) external {
        require(requests[requestId], "Request not found");
        
        // Call the VRF consumer contract
        bytes memory callData = abi.encodeWithSignature(
            "fulfillRandomWords(uint256,uint256[])",
            requestId,
            randomWords
        );
        
        // Perform low-level call to consumer
        (bool success, ) = consumer.call(callData);
        require(success, "fulfillRandomWords call failed");
        
        // Clear the request
        delete requests[requestId];
        
        emit RandomWordsFulfilled(requestId, consumer, randomWords);
    }
    
    /**
     * @notice Get the current request count
     * @return The number of requests made
     */
    function getRequestCount() external view returns (uint256) {
        return requestCount;
    }
    
    /**
     * @notice Check if a request exists
     * @param requestId Request ID to check
     * @return Whether the request exists
     */
    function requestExists(uint256 requestId) external view returns (bool) {
        return requests[requestId];
    }
    
    /**
     * @notice Generate a random number (for testing only)
     * @return A pseudo-random number
     */
    function generateRandomNumber() external view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(
            block.timestamp,
            blockhash(block.number - 1),
            msg.sender
        )));
    }
} 