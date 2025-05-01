// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ILayerZeroReceiver
 * @dev Interface for LayerZero Receiver
 */
interface ILayerZeroReceiver {
    /**
     * @dev Receive a message from LayerZero
     * @param _srcChainId Source chain ID
     * @param _srcAddress Source address
     * @param _nonce Message nonce
     * @param _payload Message payload
     */
    function lzReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external;
} 