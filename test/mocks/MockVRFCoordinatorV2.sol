// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockVRFCoordinatorV2
 * @dev Mock implementation of VRFCoordinatorV2 for testing
 */
contract MockVRFCoordinatorV2 {
    // Track requests
    struct RandomnessRequest {
        uint256 requestId;
        address requester;
        uint64 subId;
        bytes32 keyHash;
        uint32 callbackGasLimit;
        uint32 numWords;
        bool fulfilled;
    }
    
    uint256 public requestCounter;
    mapping(uint256 => RandomnessRequest) public requests;
    
    // Event to simulate Chainlink VRF behavior
    event RandomWordsRequested(
        bytes32 indexed keyHash,
        uint256 requestId,
        uint256 preSeed,
        uint64 subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords,
        address sender
    );
    
    event RandomWordsFulfilled(
        uint256 indexed requestId,
        uint256[] randomWords,
        bool success
    );
    
    /**
     * @notice Simulates requesting random words
     * @param keyHash The gas lane to use
     * @param subId The subscription ID
     * @param requestConfirmations Number of block confirmations before randomness is available
     * @param callbackGasLimit The gas limit for the callback
     * @param numWords The number of random words to request
     */
    function requestRandomWords(
        bytes32 keyHash,
        uint64 subId,
        uint16 requestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords
    ) external returns (uint256) {
        uint256 requestId = ++requestCounter;
        
        // Store request
        requests[requestId] = RandomnessRequest({
            requestId: requestId,
            requester: msg.sender,
            subId: subId,
            keyHash: keyHash,
            callbackGasLimit: callbackGasLimit,
            numWords: numWords,
            fulfilled: false
        });
        
        // Emit event to simulate Chainlink
        emit RandomWordsRequested(
            keyHash,
            requestId,
            block.timestamp, // Use timestamp as preSeed for mock
            subId,
            requestConfirmations,
            callbackGasLimit,
            numWords,
            msg.sender
        );
        
        return requestId;
    }
    
    /**
     * @notice Simulates fulfillment of a randomness request
     * @param requestId The ID of the request to fulfill
     * @param randomWords The random words to return
     */
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external {
        require(requests[requestId].requestId == requestId, "Request not found");
        require(!requests[requestId].fulfilled, "Request already fulfilled");
        
        requests[requestId].fulfilled = true;
        
        // Call back the requester
        try VRFConsumerBaseV2(requests[requestId].requester).rawFulfillRandomWords(
            requestId,
            randomWords
        ) {
            emit RandomWordsFulfilled(requestId, randomWords, true);
        } catch {
            emit RandomWordsFulfilled(requestId, randomWords, false);
        }
    }
}

/**
 * @title VRFConsumerBaseV2
 * @dev Interface for VRF consumer base - just the fulfillment function
 */
abstract contract VRFConsumerBaseV2 {
    function rawFulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external virtual;
} 