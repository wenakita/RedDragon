// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title ILayerZeroEndpoint
 * @notice Interface for LayerZero endpoints
 */
interface ILayerZeroEndpoint {
    /**
     * @notice Send a LayerZero message to the specified destination
     * @param _dstChainId - the destination chain identifier
     * @param _destination - the address on destination chain
     * @param _payload - bytes to be received at the destination
     * @param _refundAddress - the address LayerZero refunds if too much message fee is sent
     * @param _zroPaymentAddress - the address of the ZRO token holder who would pay for the transaction
     * @param _adapterParams - parameters for custom functionality
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
     * @notice Get the inbound nonce for a source chain address
     * @param _srcChainId - the source chain ID
     * @param _srcAddress - the source chain contract address
     */
    function getInboundNonce(uint16 _srcChainId, bytes calldata _srcAddress) external view returns (uint64);

    /**
     * @notice Get the outbound nonce for a destination chain contract address
     * @param _dstChainId - the destination chain ID
     * @param _srcAddress - the source chain contract address
     */
    function getOutboundNonce(uint16 _dstChainId, address _srcAddress) external view returns (uint64);

    /**
     * @notice Estimate the fee for sending a payload to a destination
     * @param _dstChainId - the destination chain ID
     * @param _userApplication - the source application address
     * @param _payload - the payload to send
     * @param _payInZRO - if true, the fee will be paid in ZRO
     * @param _adapterParam - parameters for custom functionality
     */
    function estimateFees(
        uint16 _dstChainId,
        address _userApplication,
        bytes calldata _payload,
        bool _payInZRO,
        bytes calldata _adapterParam
    ) external view returns (uint256 nativeFee, uint256 zroFee);

    /**
     * @notice Check if a payload is stored
     * @param _srcChainId - the source chain ID
     * @param _srcAddress - the source chain contract address
     */
    function hasStoredPayload(uint16 _srcChainId, bytes calldata _srcAddress) external view returns (bool);

    /**
     * @notice Get the address of the send library
     * @param _userApplication - the user application address
     */
    function getSendLibraryAddress(address _userApplication) external view returns (address);

    /**
     * @notice Get the address of the receive library
     * @param _userApplication - the user application address
     */
    function getReceiveLibraryAddress(address _userApplication) external view returns (address);

    /**
     * @notice Check if the endpoint is in the process of sending a payload
     */
    function isSendingPayload() external view returns (bool);

    /**
     * @notice Check if the endpoint is in the process of receiving a payload
     */
    function isReceivingPayload() external view returns (bool);

    /**
     * @notice Get configuration for a specific version, chain and application
     * @param _version - the version
     * @param _chainId - the chain ID
     * @param _userApplication - the user application address
     * @param _configType - the configuration type
     */
    function getConfig(
        uint16 _version,
        uint16 _chainId,
        address _userApplication,
        uint256 _configType
    ) external view returns (bytes memory);

    /**
     * @notice Get the send version for a specific application
     * @param _userApplication - the user application address
     */
    function getSendVersion(address _userApplication) external view returns (uint16);

    /**
     * @notice Get the receive version for a specific application
     * @param _userApplication - the user application address
     */
    function getReceiveVersion(address _userApplication) external view returns (uint16);

    /**
     * @notice Set configuration for a specific version, chain and application
     * @param _version - the version
     * @param _chainId - the chain ID
     * @param _configType - the configuration type
     * @param _config - the configuration data
     */
    function setConfig(
        uint16 _version,
        uint16 _chainId,
        uint256 _configType,
        bytes calldata _config
    ) external;

    /**
     * @notice Set send version for the application
     * @param _version - the version
     */
    function setSendVersion(uint16 _version) external;

    /**
     * @notice Set receive version for the application
     * @param _version - the version
     */
    function setReceiveVersion(uint16 _version) external;

    /**
     * @notice Force resume receiving for a source chain and address
     * @param _srcChainId - the source chain ID
     * @param _srcAddress - the source address
     */
    function forceResumeReceive(uint16 _srcChainId, bytes calldata _srcAddress) external;
} 