// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ILayerZeroEndpointV2
 * @dev Simplified mock of LayerZero Endpoint V2 interface for testing
 */
interface ILayerZeroEndpointV2 {
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
    
    function send(MessagingParams calldata _params) external payable returns (bytes32 guid);
    
    function quoteFee(MessagingParams calldata _params) external view returns (MessagingFee memory);
} 