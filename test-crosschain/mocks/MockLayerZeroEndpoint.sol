// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "../interfaces/ILayerZeroEndpoint.sol";
import "../interfaces/ILayerZeroReceiver.sol";

/**
 * @title MockLayerZeroEndpoint
 * @dev Mock contract for LayerZero Endpoint to test cross-chain functionality
 */
contract MockLayerZeroEndpoint is ILayerZeroEndpoint {
    uint16 public immutable chainId;
    
    // Store the mapping from this chain to other chains
    mapping(address => mapping(uint16 => bytes)) public trustedRemotes;
    mapping(uint16 => address) public destLzEndpoint;
    
    // Last sent payload for verification in tests
    bytes public lastSentPayload;
    bytes public lastReceivedPayload;
    uint16 public lastDestinationChainId;
    
    event PayloadSent(
        uint16 dstChainId,
        bytes destination,
        address sender,
        uint64 nonce,
        bytes payload
    );
    
    event PayloadReceived(
        uint16 srcChainId,
        bytes srcAddress,
        address dstAddress,
        uint64 nonce,
        bytes payload
    );
    
    constructor(uint16 _chainId) {
        chainId = _chainId;
    }
    
    /**
     * @dev Set the destination endpoint address for a given chain ID
     */
    function setDestLzEndpoint(address dstAddress, address lzEndpointAddress) external {
        destLzEndpoint[chainId] = lzEndpointAddress;
    }
    
    /**
     * @dev Get the last sent payload (for test verification)
     */
    function getLastSentPayload() external view returns (bytes memory) {
        return lastSentPayload;
    }
    
    /**
     * @dev Set a trusted remote for a contract
     */
    function setTrustedRemote(uint16 _srcChainId, address _srcAddress, bytes calldata _path) external {
        trustedRemotes[_srcAddress][_srcChainId] = _path;
    }
    
    /**
     * @dev Mock send function for LayerZero
     */
    function send(
        uint16 _dstChainId,
        bytes calldata _destination,
        bytes calldata _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable override {
        // Store data for test verification
        lastSentPayload = _payload;
        lastDestinationChainId = _dstChainId;
        
        emit PayloadSent(
            _dstChainId,
            _destination,
            msg.sender,
            0, // nonce
            _payload
        );
    }
    
    /**
     * @dev Mock function to receive payload (simulates receiving from another chain)
     */
    function receivePayload(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        address _dstAddress,
        uint64 _nonce,
        bytes memory _payload,
        bytes memory _adapterParams
    ) external {
        lastReceivedPayload = _payload;
        
        emit PayloadReceived(
            _srcChainId,
            _srcAddress,
            _dstAddress,
            _nonce,
            _payload
        );
        
        // Call the destination contract with the payload
        ILayerZeroReceiver(_dstAddress).lzReceive(
            _srcChainId,
            _srcAddress,
            _nonce,
            _payload
        );
    }
    
    /**
     * @dev Estimate fees for sending a message
     */
    function estimateFees(
        uint16 _dstChainId,
        address _userApplication,
        bytes calldata _payload,
        bool _payInZRO,
        bytes calldata _adapterParam
    ) external view override returns (uint256 nativeFee, uint256 zroFee) {
        return (0.01 ether, 0); // Mock fee for testing
    }
    
    function getInboundNonce(uint16 _srcChainId, bytes calldata _srcAddress) external view override returns (uint64) {
        return 0;
    }
    
    function getOutboundNonce(uint16 _dstChainId, address _srcAddress) external view override returns (uint64) {
        return 0;
    }
    
    function hasStoredPayload(uint16 _srcChainId, bytes calldata _srcAddress) external view override returns (bool) {
        return false;
    }
    
    function getSendLibraryAddress(address _userApplication) external view override returns (address) {
        return address(0);
    }
    
    function getReceiveLibraryAddress(address _userApplication) external view override returns (address) {
        return address(0);
    }
    
    function isSendingPayload() external view override returns (bool) {
        return false;
    }
    
    function isReceivingPayload() external view override returns (bool) {
        return false;
    }
    
    function getConfig(
        uint16 _version, 
        uint16 _chainId, 
        address _userApplication, 
        uint256 _configType
    ) external view override returns (bytes memory) {
        return bytes("");
    }
    
    function getSendVersion(address _userApplication) external view override returns (uint16) {
        return 1;
    }
    
    function getReceiveVersion(address _userApplication) external view override returns (uint16) {
        return 1;
    }
    
    function setConfig(
        uint16 _version,
        uint16 _chainId,
        uint256 _configType,
        bytes calldata _config
    ) external override {}
    
    function setSendVersion(uint16 _version) external override {}
    
    function setReceiveVersion(uint16 _version) external override {}
    
    function forceResumeReceive(uint16 _srcChainId, bytes calldata _srcAddress) external override {}
} 