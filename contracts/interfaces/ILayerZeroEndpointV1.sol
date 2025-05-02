// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title ILayerZeroEndpointV1
 * @notice Interface for LayerZero endpoint V1 for sending messages cross-chain
 */
interface ILayerZeroEndpointV1 {
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
} 