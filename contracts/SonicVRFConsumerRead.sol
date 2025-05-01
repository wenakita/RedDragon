// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SonicVRFConsumer.sol";

/*
   ===================================
       SONIC VRF CONSUMER READ
   ===================================
    Cross-Chain State Monitoring Hub
     Arbitrum VRF Config Observer
    Advanced Diagnostics Interface
   ===================================

   🔍 Cross-Chain State Inspector
   📡 LayerZero Read Integration
   📊 VRF Configuration Monitor
*/

/**
 * @title SonicVRFConsumerRead
 * @dev Extension of SonicVRFConsumer with LayerZero Read capabilities
 * Allows querying VRF configuration on Arbitrum without requiring a full cross-chain transaction
 */
contract SonicVRFConsumerRead is SonicVRFConsumer {
    // Read channel constants
    uint32 public constant READ_CHANNEL = 5;
    uint16 public constant READ_MSG_TYPE = 1;
    
    // Storage for VRF state
    uint64 public lastQueriedSubscriptionId;
    bytes32 public lastQueriedKeyHash;
    uint16 public lastQueriedConfirmations;
    uint32 public lastQueriedCallbackGasLimit;
    uint64 public lastQueryTimestamp;
    
    // Events
    event VRFStateQueried(uint64 subscriptionId, bytes32 keyHash, uint16 confirmations, uint32 callbackGasLimit);
    event QuerySent(uint32 dstEid, bytes32 guid);
    
    /**
     * @dev Constructor
     * @param _endpoint Address of the LayerZero endpoint
     * @param _arbitrumChainId LayerZero chain ID for Arbitrum
     * @param _arbitrumVRFRequester Address of the ArbitrumVRFRequester contract
     * @param _lotteryContract Address of the lottery contract
     */
    constructor(
        address _endpoint,
        uint32 _arbitrumChainId,
        address _arbitrumVRFRequester,
        address _lotteryContract
    ) SonicVRFConsumer(
        _endpoint,
        _arbitrumChainId,
        _arbitrumVRFRequester,
        _lotteryContract
    ) {}
    
    /**
     * @notice Manually record VRF state parameters from Arbitrum
     * This is a simplified version without actual cross-chain reading
     * @param _subscriptionId Chainlink VRF subscription ID
     * @param _keyHash VRF key hash
     * @param _confirmations Request confirmations
     * @param _callbackGasLimit Callback gas limit
     */
    function recordVRFState(
        uint64 _subscriptionId,
        bytes32 _keyHash,
        uint16 _confirmations,
        uint32 _callbackGasLimit
    ) external onlyOwner {
        lastQueriedSubscriptionId = _subscriptionId;
        lastQueriedKeyHash = _keyHash;
        lastQueriedConfirmations = _confirmations;
        lastQueriedCallbackGasLimit = _callbackGasLimit;
        lastQueryTimestamp = uint64(block.timestamp);
        
        emit VRFStateQueried(_subscriptionId, _keyHash, _confirmations, _callbackGasLimit);
    }
    
    /**
     * @notice Get all VRF state parameters
     * @return subscriptionId Chainlink VRF subscription ID
     * @return keyHash VRF key hash
     * @return confirmations Request confirmations
     * @return callbackGasLimit Callback gas limit
     * @return lastUpdated Timestamp of last update
     */
    function getVRFState() external view returns (
        uint64 subscriptionId,
        bytes32 keyHash,
        uint16 confirmations,
        uint32 callbackGasLimit,
        uint64 lastUpdated
    ) {
        return (
            lastQueriedSubscriptionId,
            lastQueriedKeyHash,
            lastQueriedConfirmations,
            lastQueriedCallbackGasLimit,
            lastQueryTimestamp
        );
    }
    
    /**
     * @notice Simulate a LayerZero Read query request
     * @dev This is a simplified mock version that doesn't actually send cross-chain messages
     * In production, this would use LayerZero Read to query VRF state on Arbitrum
     */
    function simulateQueryArbitrumVRFState() external payable onlyOwner {
        // Generate a random guid just for the event emission
        bytes32 guid = keccak256(abi.encodePacked(block.timestamp, msg.sender, blockhash(block.number - 1)));
        
        emit QuerySent(arbitrumChainId, guid);
    }
} 