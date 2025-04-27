// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title ILayerZeroUserApplicationConfig
 * @notice Interface for LayerZero User Application configuration
 */
interface ILayerZeroUserApplicationConfig {
    /**
     * @notice Set the configuration for the LayerZero endpoint
     * @param _version The messaging library version
     * @param _chainId The destination chain ID
     * @param _configType Type of configuration
     * @param _config The configuration data
     */
    function setConfig(
        uint16 _version,
        uint16 _chainId,
        uint _configType,
        bytes calldata _config
    ) external;

    /**
     * @notice Set the send messaging library version
     * @param _version The messaging library version
     */
    function setSendVersion(uint16 _version) external;

    /**
     * @notice Set the receive messaging library version
     * @param _version The messaging library version
     */
    function setReceiveVersion(uint16 _version) external;

    /**
     * @notice Force resume a message that got stuck because of a failed send
     * @param _srcChainId The source chain ID
     * @param _srcAddress The source address
     * @param _nonce The nonce of the message
     * @param _payload The message payload
     */
    function forceResumeReceive(
        uint16 _srcChainId, 
        bytes calldata _srcAddress, 
        uint64 _nonce, 
        bytes calldata _payload
    ) external;

    /**
     * @notice Get the configuration of the LayerZero messaging library of the specified version
     * @param _version - messaging library version
     * @param _chainId - the chainId for the pending config change
     * @param _configType - type of configuration. every messaging library has its own convention
     */
    function getConfig(uint16 _version, uint16 _chainId, uint _configType) external view returns (bytes memory);

    /**
     * @notice Get the send() LayerZero messaging library version
     */
    function getSendVersion() external view returns (uint16);

    /**
     * @notice Get the lzReceive() LayerZero messaging library version
     */
    function getReceiveVersion() external view returns (uint16);
} 