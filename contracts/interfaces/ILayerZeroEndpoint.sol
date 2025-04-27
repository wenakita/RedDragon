// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title ILayerZeroEndpoint
 * @notice Interface for LayerZero endpoint for sending messages cross-chain
 */
interface ILayerZeroEndpoint {
    /**
     * @notice Send a LayerZero message to the specified destination
     * @param _dstChainId The destination chain ID
     * @param _destination The address on destination chain
     * @param _payload The message payload
     * @param _refundAddress The address to refund if too much message fee is sent
     * @param _zroPaymentAddress The address of the ZRO token holder who would pay for the transaction
     * @param _adapterParams Parameters for custom functionality
     */
    function send(
        uint16 _dstChainId,
        bytes calldata _destination,
        bytes calldata _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable;

    /**
     * @notice Get the fee to send a cross-chain message
     * @param _dstChainId The destination chain ID
     * @param _userApplication The source sending contract address from the source chain
     * @param _payload The message payload
     * @param _payInZRO Whether to pay in ZRO token
     * @param _adapterParams Parameters for custom functionality
     * @return nativeFee The native fee
     * @return zroFee The ZRO fee
     */
    function estimateFees(
        uint16 _dstChainId,
        address _userApplication,
        bytes calldata _payload,
        bool _payInZRO,
        bytes calldata _adapterParams
    ) external view returns (uint256 nativeFee, uint256 zroFee);

    /**
     * @notice Get the chain ID of this endpoint
     * @return The chain ID
     */
    function getChainId() external view returns (uint16);

    /**
     * @notice Get the inbound nonce for a source chain and source address
     * @param _srcChainId The source chain ID
     * @param _srcAddress The source address
     * @return nonce The inbound nonce
     */
    function getInboundNonce(uint16 _srcChainId, bytes calldata _srcAddress) external view returns (uint64);

    /**
     * @notice Get the outbound nonce for a destination chain and user application
     * @param _dstChainId The destination chain ID
     * @param _srcAddress The address of the user application
     * @return nonce The outbound nonce
     */
    function getOutboundNonce(uint16 _dstChainId, address _srcAddress) external view returns (uint64);

    /**
     * @notice Get the stored payload by source chain ID, source address, and nonce
     * @param _srcChainId The source chain ID
     * @param _srcAddress The source address
     * @param _nonce The nonce of the payload
     * @return payloadHash The hash of the stored payload
     */
    function getStoredPayload(uint16 _srcChainId, bytes calldata _srcAddress, uint64 _nonce) external view returns (bytes memory);

    /**
     * @notice Check if there is a stored payload for the given parameters
     * @param _srcChainId The source chain ID
     * @param _srcAddress The source address
     * @param _nonce The nonce of the payload
     * @return exists Whether a payload exists
     */
    function hasStoredPayload(uint16 _srcChainId, bytes calldata _srcAddress, uint64 _nonce) external view returns (bool);

    /**
     * @notice Check if the source chain ID and source address are trusted
     * @param _srcChainId The source chain ID
     * @param _srcAddress The source address 
     * @return trusted Whether the source is trusted
     */
    function isTrustedRemote(uint16 _srcChainId, bytes calldata _srcAddress) external view returns (bool);
} 