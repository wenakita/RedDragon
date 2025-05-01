// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ILayerZeroEndpoint.sol";
import "./ILayerZeroReceiver.sol";

/**
 * @title MockLzEndpoint
 * @dev Mock implementation of LayerZero Endpoint for testing
 */
contract MockLzEndpoint is ILayerZeroEndpoint {
    uint16 public immutable chainId;
    
    // Store the destination endpoints for cross-chain messaging
    mapping(uint16 => address) public lzEndpoints;
    
    // Nonce tracking
    mapping(address => mapping(uint16 => mapping(bytes => uint64))) public outboundNonce;
    mapping(address => mapping(uint16 => mapping(bytes => uint64))) public inboundNonce;
    
    /**
     * @dev Constructor
     * @param _chainId The chain ID of this endpoint
     */
    constructor(uint16 _chainId) {
        chainId = _chainId;
    }
    
    /**
     * @dev Set the destination LayerZero endpoint
     * @param _endpoint The endpoint address
     * @param _dstChainId The destination chain ID
     */
    function setDestLzEndpoint(address _endpoint, uint16 _dstChainId) external {
        lzEndpoints[_dstChainId] = _endpoint;
    }
    
    /**
     * @dev Send a cross-chain message
     * Mocks the LayerZero send function
     */
    function send(
        uint16 _dstChainId,
        bytes calldata _destination,
        bytes calldata _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable override {
        // Get the destination endpoint
        address dstEndpoint = lzEndpoints[_dstChainId];
        require(dstEndpoint != address(0), "MockLzEndpoint: destination endpoint not found");
        
        // Extract the destination address from the bytes
        address dstAddress;
        assembly {
            dstAddress := mload(add(_destination, 20))
        }
        
        // Increment nonce
        outboundNonce[msg.sender][_dstChainId][_destination]++;
        
        // Call the destination endpoint to deliver the message
        MockLzEndpoint(dstEndpoint).receivePayload(
            chainId,
            abi.encodePacked(msg.sender),
            dstAddress,
            outboundNonce[msg.sender][_dstChainId][_destination],
            _payload,
            bytes("")
        );
    }
    
    /**
     * @dev Receive a payload from another chain
     * @param _srcChainId Source chain ID
     * @param _srcAddress Source address (as bytes)
     * @param _dstAddress Destination address
     * @param _nonce Message nonce
     * @param _payload Message payload
     * @param _extraData Extra data (unused in this mock)
     */
    function receivePayload(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        address _dstAddress,
        uint64 _nonce,
        bytes memory _payload,
        bytes memory _extraData
    ) external {
        // Extract source address
        address srcAddress;
        assembly {
            srcAddress := mload(add(_srcAddress, 20))
        }
        
        // Update inbound nonce
        inboundNonce[srcAddress][_srcChainId][_srcAddress] = _nonce;
        
        // Call the destination contract's lzReceive function
        ILayerZeroReceiver(_dstAddress).lzReceive(
            _srcChainId,
            _srcAddress,
            _nonce,
            _payload
        );
    }
    
    // Mock functions required by the interface
    
    function estimateFees(
        uint16 _dstChainId,
        address _userApplication,
        bytes calldata _payload,
        bool _payInZRO,
        bytes calldata _adapterParam
    ) external view override returns (uint nativeFee, uint zroFee) {
        return (0.01 ether, 0); // Fixed mock fee
    }
    
    function getInboundNonce(uint16 _srcChainId, bytes calldata _srcAddress) external view override returns (uint64) {
        return inboundNonce[msg.sender][_srcChainId][_srcAddress];
    }
    
    function getOutboundNonce(uint16 _dstChainId, address _srcAddress) external view override returns (uint64) {
        return outboundNonce[_srcAddress][_dstChainId][abi.encodePacked(_srcAddress)];
    }
    
    function getChainId() external view override returns (uint16) {
        return chainId;
    }
    
    function retryPayload(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        address _dstAddress
    ) external override {}
    
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
    
    function getSendVersion(address _userApplication) external view override returns (uint16) {
        return 1;
    }
    
    function getReceiveVersion(address _userApplication) external view override returns (uint16) {
        return 1;
    }
}

/**
 * @title ILayerZeroReceiver
 * @dev Interface for LayerZero receiver
 */
interface ILayerZeroReceiver {
    function lzReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external;
} 