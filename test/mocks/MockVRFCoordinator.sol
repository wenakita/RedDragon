// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockVRFCoordinator
 * @dev Mock VRF Coordinator for testing VRF integration with BaseDragonSwapTrigger
 */
contract MockVRFCoordinator {
    // Request tracking
    uint256 private requestCounter;
    mapping(uint256 => address) public s_consumers;
    bool public willFulfill;
    uint256 public lastRequestId;
    
    struct RequestConfig {
        bytes32 keyHash;
        uint64 subId;
        uint16 minConfirmations;
        uint32 callbackGasLimit;
        uint32 numWords;
    }
    
    mapping(uint256 => RequestConfig) public s_requests;
    
    event RandomWordsRequested(
        bytes32 indexed keyHash,
        uint256 requestId,
        uint64 subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords,
        address indexed requester
    );
    
    event RandomWordsFulfilled(
        uint256 indexed requestId,
        uint256[] randomWords,
        bool success
    );
    
    /**
     * @notice Set whether the mock coordinator should fulfill requests
     * @param _willFulfill True if requests should be fulfilled automatically
     */
    function setWillFulfill(bool _willFulfill) external {
        willFulfill = _willFulfill;
    }
    
    /**
     * @notice Get the last request ID
     * @return The last request ID
     */
    function getLastRequestId() external view returns (uint256) {
        return lastRequestId;
    }
    
    /**
     * @notice Mock function to request random words
     * @param keyHash Key hash
     * @param subId Subscription ID
     * @param minimumRequestConfirmations Minimum confirmations
     * @param callbackGasLimit Callback gas limit
     * @param numWords Number of random words
     * @return requestId The request ID
     */
    function requestRandomWords(
        bytes32 keyHash,
        uint64 subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords
    ) external returns (uint256) {
        requestCounter++;
        uint256 requestId = requestCounter;
        lastRequestId = requestId;
        
        s_consumers[requestId] = msg.sender;
        s_requests[requestId] = RequestConfig({
            keyHash: keyHash,
            subId: subId,
            minConfirmations: minimumRequestConfirmations,
            callbackGasLimit: callbackGasLimit,
            numWords: numWords
        });
        
        emit RandomWordsRequested(
            keyHash,
            requestId,
            subId,
            minimumRequestConfirmations,
            callbackGasLimit,
            numWords,
            msg.sender
        );
        
        if (willFulfill) {
            // Generate random words
            uint256[] memory randomWords = new uint256[](numWords);
            for (uint256 i = 0; i < numWords; i++) {
                randomWords[i] = uint256(keccak256(abi.encode(requestId, i)));
            }
            
            // Fulfill the request
            fulfillRandomWords(requestId, s_consumers[requestId], randomWords);
        }
        
        return requestId;
    }
    
    /**
     * @notice Fulfill randomness request
     * @param requestId Request ID
     * @param consumer Consumer address
     * @param randomWords Random words
     */
    function fulfillRandomWords(
        uint256 requestId,
        address consumer,
        uint256[] memory randomWords
    ) public {
        // Call rawFulfillRandomWords on the consumer
        (bool success, ) = consumer.call(
            abi.encodeWithSignature(
                "rawFulfillRandomWords(uint256,uint256[])",
                requestId,
                randomWords
            )
        );
        
        emit RandomWordsFulfilled(requestId, randomWords, success);
    }
} 