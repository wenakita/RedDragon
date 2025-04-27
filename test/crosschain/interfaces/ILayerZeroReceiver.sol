// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title ILayerZeroReceiver
 * @notice Interface for contracts that receive messages from LayerZero
 */
interface ILayerZeroReceiver {
    /**
     * @notice Called by the LayerZero endpoint when a message is received
     * @param _srcChainId The chain ID of the source chain
     * @param _srcAddress The address of the source sender
     * @param _nonce The nonce of the LayerZero message
     * @param _payload The payload of the message
     */
    function lzReceive(uint16 _srcChainId, bytes calldata _srcAddress, uint64 _nonce, bytes calldata _payload) external;
} 