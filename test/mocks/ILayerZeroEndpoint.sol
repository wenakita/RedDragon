// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ILayerZeroEndpoint
 * @dev Interface for LayerZero Endpoint
 */
interface ILayerZeroEndpoint {
    function send(
        uint16 _dstChainId,
        bytes calldata _destination,
        bytes calldata _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable;

    function estimateFees(
        uint16 _dstChainId,
        address _userApplication,
        bytes calldata _payload,
        bool _payInZRO,
        bytes calldata _adapterParam
    ) external view returns (uint nativeFee, uint zroFee);

    function getInboundNonce(uint16 _srcChainId, bytes calldata _srcAddress) external view returns (uint64);

    function getOutboundNonce(uint16 _dstChainId, address _srcAddress) external view returns (uint64);

    function getChainId() external view returns (uint16);

    function retryPayload(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        address _dstAddress
    ) external;

    function hasStoredPayload(uint16 _srcChainId, bytes calldata _srcAddress) external view returns (bool);

    function getSendLibraryAddress(address _userApplication) external view returns (address);

    function getReceiveLibraryAddress(address _userApplication) external view returns (address);

    function isSendingPayload() external view returns (bool);

    function isReceivingPayload() external view returns (bool);

    function getSendVersion(address _userApplication) external view returns (uint16);

    function getReceiveVersion(address _userApplication) external view returns (uint16);
} 