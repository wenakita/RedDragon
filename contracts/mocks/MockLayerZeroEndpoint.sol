// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title MockLayerZeroEndpoint
 * @dev Mock contract for LayerZero Endpoint to test cross-chain functionality
 */
contract MockLayerZeroEndpoint {
    uint16 public immutable chainId;
    
    // Store the mapping from this chain to other chains
    mapping(address => mapping(uint16 => bytes)) public lzReceives;
    mapping(uint16 => address) public destLzEndpoint;
    
    // Last sent payload for verification in tests
    bytes public lastSentPayload;
    bytes public lastReceivedPayload;
    uint16 public lastDestinationChainId;
    
    event PayloadSent(
        uint16 dstChainId,
        bytes destination,
        address sender,
        uint64 nonce,
        bytes payload
    );
    
    event PayloadReceived(
        uint16 srcChainId,
        bytes srcAddress,
        address dstAddress,
        uint64 nonce,
        bytes payload
    );
    
    constructor(uint16 _chainId) {
        chainId = _chainId;
    }
    
    /**
     * @dev Set the destination endpoint address for a given chain ID
     */
    function setDestLzEndpoint(address dstAddress, address lzEndpointAddress) external {
        destLzEndpoint[chainId] = lzEndpointAddress;
    }
    
    /**
     * @dev Get the last sent payload (for test verification)
     */
    function getLastSentPayload() external view returns (bytes memory) {
        return lastSentPayload;
    }
    
    /**
     * @dev Set a trusted remote for a contract
     */
    function setTrustedRemote(address srcAddress, uint16 dstChainId, bytes calldata path) external {
        lzReceives[srcAddress][dstChainId] = path;
    }
    
    /**
     * @dev Mock send function for LayerZero
     */
    function send(
        uint16 _dstChainId,
        bytes memory _destination,
        bytes memory _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes memory _adapterParams
    ) external payable {
        // Store data for test verification
        lastSentPayload = _payload;
        lastDestinationChainId = _dstChainId;
        
        emit PayloadSent(
            _dstChainId,
            _destination,
            msg.sender,
            0, // nonce
            _payload
        );
        
        // If we're in test mode, deliver directly to the destination
        address dstEndpoint = destLzEndpoint[_dstChainId];
        if (dstEndpoint != address(0)) {
            // This would simulate the message arriving at the destination chain
            // In a real environment, this would happen asynchronously
        }
    }
    
    /**
     * @dev Mock function to receive payload (simulates receiving from another chain)
     */
    function receivePayload(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        address _dstAddress,
        uint64 _nonce,
        bytes memory _payload,
        bytes memory _adapterParams
    ) external {
        lastReceivedPayload = _payload;
        
        emit PayloadReceived(
            _srcChainId,
            _srcAddress,
            _dstAddress,
            _nonce,
            _payload
        );
        
        // Call the destination contract with the payload
        (bool success, ) = _dstAddress.call(
            abi.encodeWithSignature(
                "lzReceive(uint16,bytes,address,bytes)",
                _srcChainId,
                _srcAddress,
                _dstAddress,
                _payload
            )
        );
        
        require(success, "Failed to deliver payload");
    }
    
    /**
     * @dev Estimate fees for sending a message
     */
    function estimateFees(
        uint16 _dstChainId,
        address _userApplication,
        bytes calldata _payload,
        bool _payInZRO,
        bytes calldata _adapterParam
    ) external view returns (uint256 nativeFee, uint256 zroFee) {
        return (0.01 ether, 0); // Mock fee for testing
    }
} 