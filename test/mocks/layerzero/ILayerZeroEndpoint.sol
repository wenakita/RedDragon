// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Mock ILayerZeroEndpoint interface
 * @dev This is a simplified mock of the LayerZero Endpoint interface for testing
 */
interface ILayerZeroEndpoint {
    /**
     * @dev Send a payload to another chain
     * @param _dstChainId Destination chain ID
     * @param _destination Destination address in bytes
     * @param _payload The payload to send
     * @param _refundAddress Address to refund excess gas
     * @param _zroPaymentAddress Address to pay for ZRO token
     * @param _adapterParams Adapter parameters
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
     * @dev Estimate fee for sending a payload
     * @param _dstChainId Destination chain ID
     * @param _userApplication Address of user application
     * @param _payload The payload to send
     * @param _payInZRO Whether to pay in ZRO token
     * @param _adapterParams Adapter parameters
     * @return nativeFee Native token fee
     * @return zroFee ZRO token fee
     */
    function estimateFees(
        uint16 _dstChainId,
        address _userApplication,
        bytes calldata _payload,
        bool _payInZRO,
        bytes calldata _adapterParams
    ) external view returns (uint256 nativeFee, uint256 zroFee);

    /**
     * @dev Get incoming nonce for a given chain ID and address
     * @param _srcChainId Source chain ID
     * @param _srcAddress Source address in bytes
     * @return nonce The incoming nonce
     */
    function getInboundNonce(uint16 _srcChainId, bytes calldata _srcAddress) external view returns (uint64);

    /**
     * @dev Get outgoing nonce for a given chain ID and address
     * @param _dstChainId Destination chain ID
     * @param _srcAddress Source address in bytes
     * @return nonce The outgoing nonce
     */
    function getOutboundNonce(uint16 _dstChainId, address _srcAddress) external view returns (uint64);

    /**
     * @dev Get chainId of this endpoint
     * @return chainId The chain ID of this endpoint
     */
    function getChainId() external view returns (uint16);

    /**
     * @dev Get the destination user application address from the path
     * @param _srcChainId Source chain ID
     * @param _srcAddress Source address
     * @return address The destination user application address
     */
    function getReceiveLibraryAddress(uint16 _srcChainId, bytes calldata _srcAddress) external view returns (address);

    /**
     * @dev Get the send version for a given chain ID
     * @param _chainId The chain ID
     * @return version The send version
     */
    function getSendVersion(uint16 _chainId) external view returns (uint16);

    /**
     * @dev Get the receive version for a given chain ID
     * @param _chainId The chain ID
     * @return version The receive version
     */
    function getReceiveVersion(uint16 _chainId) external view returns (uint16);

    /**
     * @dev Set the user application
     * @param _userApplication The address of the user application
     */
    function setUserApplication(address _userApplication) external;
} 