// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/ILayerZeroEndpointV2Mock.sol";

/**
 * @title MockLzEndpoint
 * @dev Mock implementation of the LayerZero endpoint for testing
 */
contract MockLzEndpoint is ILayerZeroEndpointV2Mock {
    // Store last sent message
    bytes public lastSentPayload;
    uint32 public lastDstEid;
    address public lastSender;
    
    // Events
    event MessageSent(uint32 dstEid, bytes receiver, bytes payload);
    event MessageReceived(uint32 srcEid, bytes32 sender, bytes payload);
    
    /**
     * @dev Quote the fee for sending a message
     */
    function quoteFee(MessagingParams calldata /* _params */) external pure override returns (MessagingFee memory) {
        return MessagingFee({
            nativeFee: 0.01 ether,
            lzTokenFee: 0
        });
    }
    
    /**
     * @dev Send a message to the destination chain
     */
    function send(MessagingParams calldata _params) external payable override returns (MessagingFee memory, bytes32) {
        // Store message info
        lastSentPayload = _params.message;
        lastDstEid = _params.dstEid;
        lastSender = msg.sender;
        
        emit MessageSent(_params.dstEid, _params.receiver, _params.message);
        
        return (
            MessagingFee({
                nativeFee: 0.01 ether,
                lzTokenFee: 0
            }),
            bytes32(0) // Message ID
        );
    }
    
    /**
     * @dev Mock function to simulate receiving a message
     */
    function mockLzReceive(
        uint32 _srcEid,
        bytes memory _sender,
        bytes memory _message
    ) external {
        // Convert sender bytes to bytes32
        bytes32 senderBytes32;
        assembly {
            senderBytes32 := mload(add(_sender, 32))
        }
        
        emit MessageReceived(_srcEid, senderBytes32, _message);
        
        // Extract the destination address (first 20 bytes of sender)
        address receiver = address(bytes20(_sender));
        
        // Call the receiver's _lzReceive function
        Origin memory origin = Origin({
            srcEid: _srcEid,
            sender: senderBytes32,
            nonce: 0
        });
        
        // Directly call the _lzReceive function on the destination contract
        (bool success, ) = receiver.call(
            abi.encodeWithSignature(
                "_lzReceive((uint32,bytes32,uint64),bytes32,bytes,address,bytes)",
                origin,
                bytes32(0), // guid
                _message,
                msg.sender, // executor
                bytes("") // extraData
            )
        );
        
        // For testing, we don't enforce success
        if (!success) {
            emit MessageReceived(_srcEid, senderBytes32, _message);
        }
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