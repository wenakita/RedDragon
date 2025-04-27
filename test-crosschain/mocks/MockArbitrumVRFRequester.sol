// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "../interfaces/ILayerZeroReceiver.sol";

/**
 * @title MockArbitrumVRFRequester
 * @dev Mock contract for testing cross-chain VRF functionality
 */
contract MockArbitrumVRFRequester is ILayerZeroReceiver {
    // Chainlink VRF coordinator
    address public vrfCoordinator;
    
    // Chainlink VRF subscription ID
    uint64 public subscriptionId;
    
    // Chainlink VRF key hash
    bytes32 public keyHash;
    
    // LayerZero endpoint
    address public lzEndpoint;
    
    // LayerZero Sonic chain ID
    uint16 public sonicChainId;
    
    // Address of the VRF consumer on Sonic
    address public sonicVRFConsumer;
    
    // Number of confirmations to wait before fulfillment
    uint16 public requestConfirmations = 3;
    
    // Number of random words to request
    uint32 public numWords = 1;
    
    // Mapping to track VRF requests
    mapping(uint256 => uint64) public vrfRequestIdToRequestId;
    
    // Track request IDs in testing
    uint256 public lastRequestId;
    
    // Events
    event RandomnessRequested(uint64 indexed requestId, uint256 vrfRequestId);
    event RandomnessFulfilled(uint64 indexed requestId, uint256 randomWord);
    
    constructor(
        address _vrfCoordinator,
        uint64 _subscriptionId,
        bytes32 _keyHash,
        address _lzEndpoint,
        uint16 _sonicChainId,
        address _sonicVRFConsumer
    ) {
        vrfCoordinator = _vrfCoordinator;
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        lzEndpoint = _lzEndpoint;
        sonicChainId = _sonicChainId;
        sonicVRFConsumer = _sonicVRFConsumer;
    }
    
    /**
     * @dev Process message received from LayerZero
     */
    function lzReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external override {
        require(msg.sender == lzEndpoint, "Only endpoint can call");
        require(_srcChainId == sonicChainId, "Source must be Sonic chain");
        
        // Extract source address from LZ format
        address srcAddress;
        bytes memory srcAddressBytes = _srcAddress;
        assembly {
            srcAddress := mload(add(srcAddressBytes, 20))
        }
        
        require(srcAddress == sonicVRFConsumer, "Only trusted consumer can call");
        
        // Decode payload to get the request ID
        uint64 requestId = abi.decode(_payload, (uint64));
        
        // Store the request ID for testing
        lastRequestId = requestId;
        
        // Request randomness from Chainlink VRF
        _requestRandomness(requestId);
    }
    
    /**
     * @dev Request randomness from Chainlink VRF
     */
    function _requestRandomness(uint64 requestId) internal {
        // Mock requesting randomness - create a VRF request ID
        uint256 vrfRequestId = uint256(keccak256(abi.encode(requestId, block.timestamp)));
        
        // Store the mapping between vrfRequestId and requestId
        vrfRequestIdToRequestId[vrfRequestId] = requestId;
        
        emit RandomnessRequested(requestId, vrfRequestId);
    }
    
    /**
     * @dev Callback function called by VRF Coordinator
     */
    function fulfillRandomWords(
        uint256 vrfRequestId,
        uint256[] memory randomWords
    ) external {
        require(msg.sender == vrfCoordinator, "Only VRF Coordinator can call");
        
        // Get the original requestId from Sonic
        uint64 requestId = vrfRequestIdToRequestId[vrfRequestId];
        
        // Only use the first random word
        uint256 randomWord = randomWords[0];
        
        // Forward the randomness to Sonic chain
        _forwardRandomnessToSonic(requestId, randomWord);
        
        emit RandomnessFulfilled(requestId, randomWord);
    }
    
    /**
     * @dev Forward randomness to Sonic chain
     */
    function _forwardRandomnessToSonic(
        uint64 requestId,
        uint256 randomWord
    ) internal {
        // For testing, we just call the mock LayerZero to simulate sending
        // This is a simplified version of what would happen in production
        bytes memory payload = abi.encode(requestId, randomWord);
        
        // In the real contract, this would be:
        // lzEndpoint.send{value: fee}(sonicChainId, destination, payload, refundAddress, zroPaymentAddress, adapterParams);
        
        // For testing, we directly call the destination
        (bool success, ) = lzEndpoint.call(
            abi.encodeWithSignature(
                "receivePayload(uint16,bytes,address,uint64,bytes,bytes)",
                sonicChainId,  // _srcChainId 
                abi.encodePacked(address(this)),  // _srcAddress
                sonicVRFConsumer,  // _dstAddress
                0,  // _nonce
                payload,  // _payload
                ""  // _adapterParams
            )
        );
        require(success, "Failed to send cross-chain message");
    }
    
    /**
     * @dev Update the VRF configuration
     */
    function setVRFConfig(
        address _coordinator,
        uint64 _subscriptionId,
        bytes32 _keyHash
    ) external {
        if (_coordinator != address(0)) {
            vrfCoordinator = _coordinator;
        }
        if (_subscriptionId != 0) {
            subscriptionId = _subscriptionId;
        }
        if (_keyHash != bytes32(0)) {
            keyHash = _keyHash;
        }
    }
    
    /**
     * @dev Update the request configuration
     */
    function setRequestConfig(
        uint16 _confirmations,
        uint32 _words
    ) external {
        if (_confirmations > 0) {
            requestConfirmations = _confirmations;
        }
        if (_words > 0) {
            numWords = _words;
        }
    }
    
    /**
     * @dev Update the Sonic VRF consumer
     */
    function setSonicVRFConsumer(address _sonicVRFConsumer) external {
        sonicVRFConsumer = _sonicVRFConsumer;
    }
} 