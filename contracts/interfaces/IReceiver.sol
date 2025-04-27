// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title IReceiver
 * @notice Interface for contracts that receive LayerZero messages
 */
interface IReceiver {
    /**
     * @notice Called when a message is received from LayerZero
     * @param _srcChainId The source chain ID
     * @param _srcAddress The source address from the source chain
     * @param _nonce A number that indicates the order of messages
     * @param _payload The message payload
     */
    function lzReceive(uint16 _srcChainId, bytes memory _srcAddress, uint64 _nonce, bytes memory _payload) external;
} 