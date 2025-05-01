// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockLzEndpoint
 * @dev Simplified mock of LayerZero endpoint for testing
 */
contract MockLzEndpoint {
    // Store msgs sent
    bytes public lastSentPayload;
    uint16 public lastDestinationChainId;
    address public lastSender;
    
    // Events
    event MessageSent(uint16 dstChainId, bytes destination, bytes payload);
    event MessageReceived(uint16 srcChainId, bytes srcAddress, bytes payload);
    
    // For quoteFee
    struct MessagingParams {
        uint32 dstEid;
        bytes receiver;
        bytes message;
        bytes options;
        bool payInLzToken;
    }
    
    struct MessagingFee {
        uint256 nativeFee;
        uint256 lzTokenFee;
    }
    
    /**
     * @dev Mock sending a message
     */
    function send(MessagingParams memory _params) external payable returns (MessagingFee memory) {
        lastSentPayload = _params.message;
        lastDestinationChainId = uint16(_params.dstEid);
        lastSender = msg.sender;
        
        emit MessageSent(uint16(_params.dstEid), _params.receiver, _params.message);
        
        return MessagingFee({
            nativeFee: 0.01 ether,
            lzTokenFee: 0
        });
    }
    
    /**
     * @dev Quote the fee for sending a message
     */
    function quoteFee(MessagingParams memory _params) external view returns (MessagingFee memory) {
        return MessagingFee({
            nativeFee: 0.01 ether,
            lzTokenFee: 0
        });
    }
    
    /**
     * @dev Mock receiving a message
     */
    function mockLzReceive(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        bytes memory _payload
    ) external {
        emit MessageReceived(_srcChainId, _srcAddress, _payload);
        
        // Extract destination address from _srcAddress (first 20 bytes)
        address receiverAddress = address(bytes20(_srcAddress));
        
        // Call the lzReceive method on the receiver
        (bool success, ) = receiverAddress.call(
            abi.encodeWithSignature(
                "_lzReceive(Origin,bytes32,bytes,address,bytes)",
                // Mock Origin struct with minimal information
                _srcChainId,
                bytes32(0), // guid
                _payload,
                msg.sender, // executor
                "" // extraData
            )
        );
        
        require(success, "Failed to deliver message");
    }
} 