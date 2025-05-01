// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockVRFCoordinator
 * @dev Mock Chainlink VRF Coordinator for testing
 */
contract MockVRFCoordinator {
    // Subscription management
    struct Subscription {
        uint96 balance;
        uint64 reqCount;
        address owner;
        address[] consumers;
    }
    
    mapping(uint64 => Subscription) private subscriptions;
    mapping(uint256 => address) private pendingRequests;
    uint64 private nextSubscriptionId = 1;
    uint256 private nextRequestId = 1;
    
    event SubscriptionCreated(uint64 indexed subId, address owner);
    event SubscriptionFunded(uint64 indexed subId, uint256 oldBalance, uint256 newBalance);
    event ConsumerAdded(uint64 indexed subId, address consumer);
    event RandomWordsRequested(
        uint256 indexed requestId,
        uint64 indexed subId,
        bytes32 keyHash
    );
    event RandomWordsFulfilled(uint256 indexed requestId, uint256[] randomWords);
    
    /**
     * @dev Create a new subscription
     */
    function createSubscription() external returns (uint64) {
        uint64 subId = nextSubscriptionId++;
        
        Subscription storage sub = subscriptions[subId];
        sub.owner = msg.sender;
        
        emit SubscriptionCreated(subId, msg.sender);
        
        return subId;
    }
    
    /**
     * @dev Fund a subscription
     */
    function fundSubscription(uint64 _subId, uint256 _amount) external payable {
        Subscription storage sub = subscriptions[_subId];
        require(sub.owner != address(0), "subscription not found");
        
        uint96 oldBalance = sub.balance;
        sub.balance += uint96(_amount);
        
        emit SubscriptionFunded(_subId, oldBalance, sub.balance);
    }
    
    /**
     * @dev Add a consumer to a subscription
     */
    function addConsumer(uint64 _subId, address _consumer) external {
        Subscription storage sub = subscriptions[_subId];
        require(sub.owner == msg.sender, "not owner");
        
        for (uint256 i = 0; i < sub.consumers.length; i++) {
            if (sub.consumers[i] == _consumer) {
                return; // Already added
            }
        }
        
        sub.consumers.push(_consumer);
        
        emit ConsumerAdded(_subId, _consumer);
    }
    
    /**
     * @dev Request random words
     */
    function requestRandomWords(
        bytes32 _keyHash,
        uint64 _subId,
        uint16 _minimumRequestConfirmations,
        uint32 _callbackGasLimit,
        uint32 _numWords
    ) external returns (uint256) {
        Subscription storage sub = subscriptions[_subId];
        require(sub.balance > 0, "insufficient funds");
        
        // Check if consumer is authorized
        bool authorized = false;
        for (uint256 i = 0; i < sub.consumers.length; i++) {
            if (sub.consumers[i] == msg.sender) {
                authorized = true;
                break;
            }
        }
        require(authorized, "consumer not authorized");
        
        uint256 requestId = nextRequestId++;
        pendingRequests[requestId] = msg.sender;
        
        emit RandomWordsRequested(requestId, _subId, _keyHash);
        
        return requestId;
    }
    
    /**
     * @dev Fulfill random words with override (for testing)
     */
    function fulfillRandomWordsWithOverride(
        uint256 _requestId,
        address _consumer,
        uint256[] memory _randomWords
    ) external {
        // Directly call the fulfillRandomWords function on the consumer
        (bool success, ) = _consumer.call(
            abi.encodeWithSignature(
                "fulfillRandomWords(uint256,uint256[])",
                _requestId,
                _randomWords
            )
        );
        require(success, "fulfillRandomWords failed");
        
        emit RandomWordsFulfilled(_requestId, _randomWords);
    }
} 