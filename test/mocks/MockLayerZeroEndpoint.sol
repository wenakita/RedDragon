// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "../../contracts/interfaces/ILayerZeroEndpoint.sol";
import "../../contracts/interfaces/ILayerZeroReceiver.sol";

/**
 * @title MockLayerZeroEndpoint
 * @notice Mock contract for testing LayerZero messaging functionality
 */
contract MockLayerZeroEndpoint is ILayerZeroEndpoint {
    uint16 public chainId;
    
    // mapping from destination LayerZero chain id to address of mock endpoint contract
    mapping(uint16 => address) public destinations;
    
    // message counters per source chain and source address
    mapping(uint16 => mapping(bytes => uint64)) public inboundNonce;
    mapping(uint16 => mapping(address => uint64)) public outboundNonce;
    
    // map of retry payloads
    mapping(uint16 => mapping(bytes => mapping(uint64 => bytes))) public storedPayload;
    
    // map of trusted remotes
    mapping(address => mapping(uint16 => bytes)) public trustedRemoteLookup;

    /**
     * @notice Constructor to set the chain ID for this mock endpoint
     * @param _chainId The chain ID
     */
    constructor(uint16 _chainId) {
        chainId = _chainId;
    }

    /**
     * @notice Helper function to set destination endpoints for testing
     * @param _chainId The destination chain ID
     * @param _endpoint The mock endpoint address for that chain
     */
    function setDestLookup(uint16 _chainId, address _endpoint) external {
        destinations[_chainId] = _endpoint;
    }

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
    ) external payable {
        address dstEndpoint = destinations[_dstChainId];
        require(dstEndpoint != address(0), "Destination not set");

        // increment the outbound nonce
        outboundNonce[_dstChainId][msg.sender]++;

        // get the destination address from the destination chain
        // convert the first 20 bytes of the destination to an address
        address dstAddress;
        
        // Safely extract the address from the bytes array
        require(_destination.length >= 20, "Destination must be at least 20 bytes");
        bytes memory tempBytes = bytes(_destination[:20]); // Take first 20 bytes
        assembly {
            dstAddress := mload(add(tempBytes, 20))
        }

        // mock the receive on the destination chain
        MockLayerZeroEndpoint(dstEndpoint).receivePayload(
            chainId,
            abi.encodePacked(msg.sender),
            dstAddress,
            outboundNonce[_dstChainId][msg.sender],
            _payload
        );
    }

    /**
     * @notice Internal function to simulate receiving a payload from another chain
     * @param _srcChainId The source chain ID
     * @param _srcAddress The source address (abi encoded)
     * @param _dstAddress The destination address on this chain
     * @param _nonce The nonce of the message
     * @param _payload The message payload
     */
    function receivePayload(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        address _dstAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external {
        require(msg.sender == destinations[_srcChainId], "Only destination endpoint can call receivePayload");

        // increment the inbound nonce
        inboundNonce[_srcChainId][_srcAddress]++;

        // invoke the destination contract
        ILayerZeroReceiver(_dstAddress).lzReceive(_srcChainId, _srcAddress, _nonce, _payload);
    }

    /**
     * @notice Get the chain ID of this endpoint
     * @return The chain ID
     */
    function getChainId() external view returns (uint16) {
        return chainId;
    }

    /**
     * @notice Get the inbound nonce for a source chain and source address
     * @param _srcChainId The source chain ID
     * @param _srcAddress The source address
     * @return nonce The inbound nonce
     */
    function getInboundNonce(uint16 _srcChainId, bytes calldata _srcAddress) external view returns (uint64) {
        return inboundNonce[_srcChainId][_srcAddress];
    }

    /**
     * @notice Get the outbound nonce for a destination chain and user application
     * @param _dstChainId The destination chain ID
     * @param _srcAddress The address of the user application
     * @return nonce The outbound nonce
     */
    function getOutboundNonce(uint16 _dstChainId, address _srcAddress) external view returns (uint64) {
        return outboundNonce[_dstChainId][_srcAddress];
    }

    /**
     * @notice Get the fee to send a cross-chain message (always returns 0 for testing)
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
    ) external view returns (uint256 nativeFee, uint256 zroFee) {
        return (0, 0);
    }

    /**
     * @notice Retry a payload (not implemented for the mock)
     * @param _srcChainId The source chain ID
     * @param _srcAddress The source address
     * @param _nonce The nonce of the payload
     * @param _payload The payload to retry
     */
    function retryPayload(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external {
        // This is a mock, so we don't need to implement this functionality
    }

    /**
     * @notice Get the stored payload by source chain ID, source address, and nonce
     * @param _srcChainId The source chain ID
     * @param _srcAddress The source address
     * @param _nonce The nonce of the payload
     * @return The stored payload
     */
    function getStoredPayload(
        uint16 _srcChainId, 
        bytes calldata _srcAddress, 
        uint64 _nonce
    ) external view returns (bytes memory) {
        return storedPayload[_srcChainId][_srcAddress][_nonce];
    }

    /**
     * @notice Check if there is a stored payload for the given parameters
     * @param _srcChainId The source chain ID
     * @param _srcAddress The source address
     * @param _nonce The nonce of the payload
     * @return Whether a payload exists
     */
    function hasStoredPayload(
        uint16 _srcChainId, 
        bytes calldata _srcAddress, 
        uint64 _nonce
    ) external view returns (bool) {
        return storedPayload[_srcChainId][_srcAddress][_nonce].length > 0;
    }

    /**
     * @notice Check if the source chain ID and source address are trusted
     * @param _srcChainId The source chain ID
     * @param _srcAddress The source address 
     * @return Whether the source is trusted
     */
    function isTrustedRemote(
        uint16 _srcChainId, 
        bytes calldata _srcAddress
    ) external view returns (bool) {
        return trustedRemoteLookup[msg.sender][_srcChainId].length > 0 && 
               keccak256(trustedRemoteLookup[msg.sender][_srcChainId]) == keccak256(_srcAddress);
    }
} 