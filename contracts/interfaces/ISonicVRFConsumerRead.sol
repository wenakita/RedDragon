// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "./ISonicVRFConsumer.sol";

/**
 * @title ISonicVRFConsumerRead
 * @dev Interface for the SonicVRFConsumerRead contract that extends the consumer with LayerZero Read capability
 */
interface ISonicVRFConsumerRead is ISonicVRFConsumer {
    /**
     * @notice Query Arbitrum VRF state using LayerZero Read
     * @param extraOptions Extra options for LayerZero
     * @return guid GUID of the message
     */
    function queryArbitrumVRFState(bytes calldata extraOptions) external payable returns (bytes32 guid);
    
    /**
     * @notice Get VRF state parameters
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
    );
    
    /**
     * @notice Constructs the query for Arbitrum VRF state
     * @return Encoded query for Arbitrum VRF state
     */
    function getArbitrumVRFQuery() external view returns (bytes memory);
    
    // Events
    event VRFStateQueried(uint64 subscriptionId, bytes32 keyHash, uint16 confirmations, uint32 callbackGasLimit);
    event QuerySent(uint32 dstEid, bytes32 guid);
} 