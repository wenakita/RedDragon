// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ILayerZeroEndpointV2Mock
 * @dev Simplified mock interface of LayerZero endpoint V2 for testing
 */
interface ILayerZeroEndpointV2Mock {
    // Basic structs for messaging
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
    
    struct Origin {
        uint32 srcEid;
        bytes32 sender;
        uint64 nonce;
    }
    
    // For quoteFee
    function quoteFee(MessagingParams calldata _params) external view returns (MessagingFee memory);
    
    // For sending messages
    function send(MessagingParams calldata _params) external payable returns (MessagingFee memory, bytes32);
} 