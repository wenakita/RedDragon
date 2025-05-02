// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../interfaces/ILayerZeroEndpointV2.sol";

/**
 * @title MockLayerZeroEndpointV2
 * @dev Mock implementation of LayerZero endpoint for testing purposes
 */
contract MockLayerZeroEndpointV2 is ILayerZeroEndpointV2 {
    // Mock fee for sending messages
    uint256 public mockFee = 0.01 ether;
    
    // Nonce for generating receipt GUIDs
    uint64 private _nonce;
    
    // Event for tracking mock messages
    event LzMessageSent(uint32 dstEid, bytes receiver, bytes message);
    
    /**
     * @notice Send a message to another chain
     * @param _params Messaging parameters
     * @param _refundAddress Address to refund excess fees
     * @return receipt Receipt for the message
     */
    function send(
        MessagingParams calldata _params,
        address payable _refundAddress
    ) external payable override returns (MessagingReceipt memory receipt) {
        // Generate a receipt with a unique GUID
        bytes32 guid = keccak256(abi.encodePacked(
            block.timestamp,
            msg.sender,
            _params.dstEid,
            _params.receiver,
            _nonce
        ));
        
        // Set up the receipt
        receipt.guid = guid;
        receipt.nonce = _nonce++;
        receipt.fee = MessagingFee({
            nativeFee: mockFee,
            lzTokenFee: 0
        });
        
        // Emit an event for tracking the message
        emit LzMessageSent(_params.dstEid, _params.receiver, _params.message);
        
        // Refund excess fees if any
        uint256 refundAmount = msg.value > mockFee ? msg.value - mockFee : 0;
        if (refundAmount > 0 && _refundAddress != address(0)) {
            (bool success, ) = _refundAddress.call{value: refundAmount}("");
            require(success, "Refund failed");
        }
        
        return receipt;
    }
    
    /**
     * @notice Quote the fee for sending a message
     * @param _params Messaging parameters
     * @return fee The fee for sending the message
     */
    function quoteFee(
        MessagingParams calldata _params
    ) external view returns (MessagingFee memory fee) {
        // For testing, just return the mock fee
        fee = MessagingFee({
            nativeFee: mockFee,
            lzTokenFee: 0
        });
        return fee;
    }
    
    /**
     * @notice Set the mock fee for testing
     * @param _fee New mock fee
     */
    function setMockFee(uint256 _fee) external {
        mockFee = _fee;
    }
    
    /**
     * @notice Mock function to simulate receiving a message
     * @param _origin Origin information
     * @param _guid GUID for the message
     * @param _message Message content
     * @param _executor Executor address
     * @param _extraData Extra data
     */
    function mockLzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) external {
        // This function would call the receiver contract's lzReceive function
        // But since this is a mock, it doesn't need to do anything
    }
} 