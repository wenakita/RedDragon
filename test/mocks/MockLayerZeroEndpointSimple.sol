// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockLayerZeroEndpointSimple
 * @dev Mock implementation of LayerZero endpoint for testing
 */
contract MockLayerZeroEndpointSimple {
    mapping(uint16 => mapping(bytes => mapping(uint64 => bytes))) public storedPayload;
    mapping(uint16 => bytes) public trustedRemoteLookup;
    
    // Counters for nonce tracking
    mapping(address => mapping(uint16 => uint64)) public outboundNonce;
    mapping(uint16 => mapping(bytes => uint64)) public inboundNonce;
    
    uint16 public immutable mockChainId = 123;
    
    // Events to match LayerZero V1 endpoint
    event SendToChain(uint16 dstChainId, bytes destination, bytes payload);
    event ReceiveFromChain(uint16 srcChainId, bytes srcAddress, bytes payload);
    
    /**
     * @notice Mock send function
     * @param _dstChainId Destination chain ID
     * @param _destination Destination address
     * @param _payload Payload to send
     * @param _refundAddress Refund address
     * @param _zroPaymentAddress ZRO payment address
     * @param _adapterParams Adapter parameters
     */
    function send(
        uint16 _dstChainId,
        bytes calldata _destination,
        bytes calldata _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable {
        // Increment outbound nonce
        outboundNonce[msg.sender][_dstChainId]++;
        
        emit SendToChain(_dstChainId, _destination, _payload);
        
        // Return any ETH to refund address
        if (msg.value > 0) {
            (bool success, ) = _refundAddress.call{value: msg.value}("");
            require(success, "MockLayerZeroEndpoint: failed to refund");
        }
    }
    
    /**
     * @notice Get the fee to send a cross-chain message
     * @param _dstChainId Destination chain ID
     * @param _userApplication User application address
     * @param _payload Payload
     * @param _payInZRO Whether to pay in ZRO
     * @param _adapterParams Adapter parameters
     * @return nativeFee Native fee
     * @return zroFee ZRO fee
     */
    function estimateFees(
        uint16 _dstChainId,
        address _userApplication,
        bytes calldata _payload,
        bool _payInZRO,
        bytes calldata _adapterParams
    ) external view returns (uint256 nativeFee, uint256 zroFee) {
        // Return a mock fee
        return (0.01 ether, 0);
    }
    
    /**
     * @notice Mock function to receive a payload from another chain
     * @param _srcChainId Source chain ID
     * @param _srcAddress Source address
     * @param _dstAddress Destination address
     * @param _nonce Nonce
     * @param _gasLimit Gas limit
     * @param _payload Payload
     */
    function receivePayload(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        address _dstAddress,
        uint64 _nonce,
        uint _gasLimit,
        bytes memory _payload
    ) external {
        // Store payload (simulate LayerZero behavior)
        storedPayload[_srcChainId][_srcAddress][_nonce] = _payload;
        inboundNonce[_srcChainId][_srcAddress]++;
        
        emit ReceiveFromChain(_srcChainId, _srcAddress, _payload);
        
        // Call the destination contract with the payload
        (bool success, ) = _dstAddress.call(
            abi.encodeWithSelector(
                bytes4(keccak256("lzReceive(uint16,bytes,uint64,bytes)")),
                _srcChainId,
                _srcAddress,
                _nonce,
                _payload
            )
        );
        
        // We don't revert so tests can continue
        if (!success) {
            // Store payload for retry
        }
    }
    
    /**
     * @notice Get the chain ID of this endpoint
     * @return Chain ID
     */
    function getChainId() external view returns (uint16) {
        return mockChainId;
    }
} 