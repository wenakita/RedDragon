// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ConsumerMock
 * @dev Simple mock for VRF consumers used in tests
 */
contract ConsumerMock {
    // Last received request ID
    uint256 public lastRequestId;
    
    // Last received random words
    uint256[] public lastRandomWords;
    
    // Event emitted when random words are received
    event RandomWordsFulfilled(uint256 requestId, uint256[] randomWords);
    
    /**
     * @dev Called by the VRF coordinator when fulfilling a request
     * @param requestId The ID of the request
     * @param randomWords The random values generated
     */
    function rawFulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external {
        lastRequestId = requestId;
        delete lastRandomWords;
        
        // Store the random words
        for (uint256 i = 0; i < randomWords.length; i++) {
            lastRandomWords.push(randomWords[i]);
        }
        
        emit RandomWordsFulfilled(requestId, randomWords);
    }
} 