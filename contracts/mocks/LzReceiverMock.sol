// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title LzReceiverMock
 * @dev A simple mock implementation of a LayerZero receiver for testing
 */
contract LzReceiverMock {
    // The LayerZero endpoint address
    address public lzEndpoint;
    
    // The last received payload
    bytes public lastPayload;
    
    // The last source chain ID
    uint16 public lastSrcChainId;
    
    // The last source address
    bytes public lastSrcAddress;
    
    // Event emitted when a message is received
    event MessageReceived(
        uint16 srcChainId,
        bytes srcAddress,
        address dstAddress,
        bytes payload
    );
    
    /**
     * @dev Constructor
     * @param _lzEndpoint The LayerZero endpoint address
     */
    constructor(address _lzEndpoint) {
        lzEndpoint = _lzEndpoint;
    }
    
    /**
     * @dev Receive a message from LayerZero
     * @param _srcChainId The source chain ID
     * @param _srcAddress The source address
     * @param _dstAddress The destination address (this contract)
     * @param _payload The message payload
     */
    function lzReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        address _dstAddress,
        bytes calldata _payload
    ) external {
        // Only the LZ endpoint can call this function
        require(msg.sender == lzEndpoint, "Not from LZ endpoint");
        require(_dstAddress == address(this), "Wrong destination");
        
        // Store the received data
        lastSrcChainId = _srcChainId;
        lastSrcAddress = _srcAddress;
        lastPayload = _payload;
        
        // Emit an event
        emit MessageReceived(_srcChainId, _srcAddress, _dstAddress, _payload);
    }
    
    /**
     * @dev Send a message via LayerZero
     * @param _dstChainId The destination chain ID
     * @param _destination The destination address
     * @param _payload The message payload
     */
    function sendMessage(
        uint16 _dstChainId,
        bytes calldata _destination,
        bytes calldata _payload
    ) external payable {
        // Call the LZ endpoint to send the message
        (bool success, ) = lzEndpoint.call{value: msg.value}(
            abi.encodeWithSignature(
                "send(uint16,bytes,bytes,address,address,bytes)",
                _dstChainId,
                _destination,
                _payload,
                address(this),
                address(0),
                bytes("")
            )
        );
        
        require(success, "Failed to send message");
    }
    
    /**
     * @dev Receive ETH
     */
    receive() external payable {}
} 