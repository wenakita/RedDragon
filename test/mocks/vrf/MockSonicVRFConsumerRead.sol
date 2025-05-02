// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./tokens/MockSonicVRFConsumer.sol";

/**
 * @title MockSonicVRFConsumerRead
 * @dev Mock implementation of SonicVRFConsumerRead for testing, implementing
 * the cross-chain VRF flow with read capabilities
 */
contract MockSonicVRFConsumerRead is MockSonicVRFConsumer {
    // OAppRead integration
    uint32 public constant READ_CHANNEL = 5;
    uint16 public constant READ_MSG_TYPE = 1;
    
    // Storage for VRF state
    uint64 public lastQueriedSubscriptionId;
    bytes32 public lastQueriedKeyHash;
    uint16 public lastQueriedConfirmations;
    uint32 public lastQueriedCallbackGasLimit;
    uint32 public lastQueriedNumWords;
    uint64 public lastQueriedTimestamp;
    
    // Events
    event VRFStateQueried(
        uint64 subscriptionId, 
        bytes32 keyHash, 
        uint16 confirmations, 
        uint32 callbackGasLimit,
        uint32 numWords,
        uint64 timestamp
    );
    
    /**
     * @dev Mock the query function
     */
    function queryArbitrumVRFState(bytes calldata /* _extraOptions */) external payable returns (bool) {
        // Emit event for testing
        emit VRFStateQueried(
            12345,                      // subscriptionId
            bytes32(uint256(123456)),   // keyHash
            3,                          // confirmations
            500000,                     // callbackGasLimit
            1,                          // numWords
            uint64(block.timestamp)     // timestamp
        );
        return true;
    }
    
    /**
     * @dev Mock receiving read response
     */
    function mockReceiveReadResponse(
        uint64 _subscriptionId,
        bytes32 _keyHash,
        uint16 _confirmations,
        uint32 _callbackGasLimit,
        uint32 _numWords
    ) external {
        // Store the queried state
        lastQueriedSubscriptionId = _subscriptionId;
        lastQueriedKeyHash = _keyHash;
        lastQueriedConfirmations = _confirmations;
        lastQueriedCallbackGasLimit = _callbackGasLimit;
        lastQueriedNumWords = _numWords;
        lastQueriedTimestamp = uint64(block.timestamp);
        
        emit VRFStateQueried(
            _subscriptionId,
            _keyHash,
            _confirmations,
            _callbackGasLimit,
            _numWords,
            uint64(block.timestamp)
        );
    }
    
    /**
     * @dev Combine options for LayerZero message
     */
    function combineOptions(uint32 _channelId, uint16 _msgType, bytes calldata _extraOptions) external pure returns (bytes memory) {
        return abi.encodePacked(_channelId, _msgType, _extraOptions);
    }
    
    /**
     * @dev Check if the message is a LayerZero Read response
     */
    function isLzReadResponse(uint32 _srcEid) external pure returns (bool) {
        return _srcEid > 4294965694; // lzRead chain threshold
    }
    
    /**
     * @dev Generate the query command for Arbitrum VRF state
     */
    function getArbitrumVRFQuery() external pure returns (bytes memory) {
        // For mock purposes, return a dummy payload
        return abi.encode(
            uint64(12345),    // Mock subscriptionId
            bytes32(uint256(0x1234567890)), // Mock keyHash
            uint16(3),        // Mock requestConfirmations
            uint32(500000),   // Mock callbackGasLimit
            uint32(1)         // Mock numWords
        );
    }
} 