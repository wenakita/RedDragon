// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Mock OAppRead
 * @dev This is a simplified mock of the LayerZero OAppRead implementation for testing
 */
abstract contract OAppRead {
    // LayerZero endpoint
    address public immutable lzEndpoint;
    address public immutable delegate;
    
    // Constants
    uint32 public constant READ_CHANNEL = 5;
    uint16 public constant READ_MSG_TYPE = 1;
    
    // Read channel enabling
    mapping(uint32 => bool) public readChannelEnabled;
    
    // Storage for queried data
    bytes32 public lastReadResponse;
    mapping(uint32 => bytes) public chainResponses;
    
    // Events
    event ReadRequestSent(uint32 channelId, uint16 srcEid, bytes message);
    event ReadResponseReceived(uint32 channelId, uint16 srcEid, bytes message);
    
    /**
     * @dev Constructor
     * @param _lzEndpoint LayerZero endpoint address
     * @param _delegate Delegate address for cross-chain reads (can be zero)
     */
    constructor(address _lzEndpoint, address _delegate) {
        require(_lzEndpoint != address(0), "LayerZero endpoint cannot be zero address");
        lzEndpoint = _lzEndpoint;
        delegate = _delegate;
        
        // Enable default read channel
        readChannelEnabled[READ_CHANNEL] = true;
    }
    
    /**
     * @dev Set read channel enabled or disabled
     * @param _channelId Channel ID to set
     * @param _enabled Whether the channel is enabled
     */
    function setReadChannel(uint32 _channelId, bool _enabled) external {
        readChannelEnabled[_channelId] = _enabled;
    }
    
    /**
     * @dev Mock function to send a cross-chain read request
     * Structure to represent messaging send receipt
     */
    struct MessagingReceipt {
        uint256 nonce;
        uint256 fee;
    }
    
    /**
     * @dev Mock function to send a cross-chain read request
     * @param _channelId Channel ID for the read
     * @param _message Message to send
     * @param _fee Fee for the read operation
     * @return receipt Receipt for the read request
     */
    function _lzSend(
        uint32 _channelId,
        bytes memory _message,
        bytes memory /* _options */,
        MessagingFee memory _fee,
        address payable /* _refundAddress */
    ) internal returns (MessagingReceipt memory receipt) {
        require(readChannelEnabled[_channelId], "Channel not enabled");
        
        // Mock implementation - just emit event
        emit ReadRequestSent(_channelId, 0, _message);
        
        return MessagingReceipt({
            nonce: block.timestamp, // Use timestamp as nonce
            fee: _fee.nativeFee
        });
    }
    
    /**
     * @dev Fee structure for LayerZero messaging
     */
    struct MessagingFee {
        uint256 nativeFee;
        uint256 lzTokenFee;
    }
    
    /**
     * @dev Mock function to simulate receiving a read response
     * @param _srcEid Source chain ID
     * @param _message Response message
     */
    function mockReceiveReadResponse(uint16 _srcEid, bytes memory _message) external {
        // Store response
        chainResponses[uint32(_srcEid)] = _message;
        lastReadResponse = keccak256(_message);
        
        // Call internal handler
        _handleReadResponse(_message);
        
        emit ReadResponseReceived(READ_CHANNEL, _srcEid, _message);
    }
    
    /**
     * @dev Function to be implemented by child contracts to handle read responses
     * @param _message Response message
     */
    function _handleReadResponse(bytes memory _message) internal virtual;
    
    /**
     * @dev Check if source chain ID is from read channel
     * @param _srcEid Source chain ID
     * @return isReadResponse Whether the source chain ID is from a read channel
     */
    function _isLzReadResponse(uint32 _srcEid) internal pure returns (bool) {
        return _srcEid > 4294965694; // LayerZero read response threshold
    }
} 