// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ILayerZeroEndpointV2
 * @dev Simplified interface for LayerZero Endpoint V2
 * Used for cross-chain messaging in the Dragon VRF system
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
    
    struct MessagingReceipt {
        bytes32 guid;
        uint64 nonce;
        MessagingFee fee;
    }
    
    /**
     * @notice Send a message to another chain
     * @param _params Messaging parameters
     * @param _refundAddress Address to refund excess fees
     * @return receipt Receipt for the message
     */
    function send(MessagingParams calldata _params, address payable _refundAddress) external payable returns (MessagingReceipt memory receipt);
    
    /**
     * @notice Quote the fee for sending a message
     * @param _params Messaging parameters
     * @param _sender Address of the sender
     * @return fee The messaging fee
     */
    function quote(MessagingParams calldata _params, address _sender) external view returns (MessagingFee memory fee);
} 