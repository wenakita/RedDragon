// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title MockVRFCoordinator
 * @dev Mock contract to simulate Chainlink VRF Coordinator v2 for testing
 */
contract MockVRFCoordinator {
    struct Subscription {
        uint96 balance;
        uint64 reqCount;
    }
    
    // Track subscriptions for testing
    mapping(uint64 => Subscription) public subscriptions;
    
    // Track requests
    mapping(uint256 => address) public consumers;
    uint256 private requestCounter;
    
    event RandomWordsRequested(
        bytes32 indexed keyHash,
        uint256 requestId,
        uint256 preSeed,
        uint64 subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords,
        address indexed sender
    );
    
    event RandomWordsFulfilled(
        uint256 indexed requestId,
        uint256[] randomWords,
        bool success
    );
    
    /**
     * @dev Create and fund a subscription for testing
     */
    function fundSubscription(uint64 subId, uint96 amount) external {
        Subscription storage sub = subscriptions[subId];
        sub.balance += amount;
    }
    
    /**
     * @dev Simulates requestRandomWords from the VRF Coordinator
     */
    function requestRandomWords(
        bytes32 keyHash,
        uint64 subId,
        uint16 requestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords
    ) external returns (uint256) {
        // Validate subscription
        require(subscriptions[subId].balance > 0, "Not enough funds in subscription");
        
        // Create request
        uint256 requestId = requestCounter++;
        consumers[requestId] = msg.sender;
        
        emit RandomWordsRequested(
            keyHash,
            requestId,
            uint256(keccak256(abi.encodePacked(keyHash, requestId))),
            subId,
            requestConfirmations,
            callbackGasLimit,
            numWords,
            msg.sender
        );
        
        return requestId;
    }
    
    /**
     * @dev Function to simulate the VRF Coordinator fulfilling a request
     */
    function fulfillRandomWords(
        uint256 requestId,
        address consumer,
        uint256[] memory randomWords
    ) external {
        require(consumers[requestId] == consumer, "Consumer not found for request");
        
        // Call the consumer contract with the random words
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