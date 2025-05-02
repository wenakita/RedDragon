// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockArbitrumVRFRequester
 * @dev Mock contract for testing cross-chain VRF functionality on the Arbitrum side
 */
contract MockArbitrumVRFRequester {
    // Chainlink VRF configuration
    uint64 public subscriptionId = 0;
    bytes32 public keyHash = 0x0;
    uint16 public requestConfirmations = 3;
    uint32 public callbackGasLimit = 500000;
    uint32 public numWords = 1;
    
    // LayerZero variables
    address public lzEndpoint;
    uint16 public sonicChainId;
    address public sonicVRFConsumer;
    
    // Request tracking
    mapping(uint64 => address) public requests;
    uint64 public latestRequestId;
    address public latestRequestUser;
    bool public hasRequest = false;
    
    // Events
    event RandomnessRequested(uint64 indexed requestId, address indexed user);
    event RandomnessFulfilled(uint64 indexed requestId, uint256 randomWord);
    event ConfigUpdated(uint64 subscriptionId, bytes32 keyHash, uint16 confirmations, uint32 gasLimit);
    
    /**
     * @dev Constructor (empty for minimal mock)
     */
    constructor() {}
    
    /**
     * @dev Set Sonic chain VRF consumer
     */
    function setSonicVRFConsumer(address _sonicVRFConsumer, uint16 _sonicChainId) external {
        sonicVRFConsumer = _sonicVRFConsumer;
        sonicChainId = _sonicChainId;
    }
    
    /**
     * @dev Set LayerZero endpoint
     */
    function setLzEndpoint(address _lzEndpoint) external {
        lzEndpoint = _lzEndpoint;
    }
    
    /**
     * @dev Set VRF configuration
     */
    function setVRFConfig(
        uint64 _subscriptionId,
        bytes32 _keyHash,
        uint16 _confirmations,
        uint32 _callbackGasLimit
    ) external {
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        requestConfirmations = _confirmations;
        callbackGasLimit = _callbackGasLimit;
        
        emit ConfigUpdated(_subscriptionId, _keyHash, _confirmations, _callbackGasLimit);
    }

    /**
     * @dev Helper function to directly store a request for testing
     */
    function storeRequest(uint64 _requestId, address _user) external {
        // Store the request
        requests[_requestId] = _user;
        latestRequestId = _requestId;
        latestRequestUser = _user;
        hasRequest = true;
        
        emit RandomnessRequested(_requestId, _user);
    }
    
    /**
     * @dev Process request from Sonic chain
     */
    function lzReceive(
        uint16 _srcChainId,
        bytes calldata /* _srcAddress */,
        uint64 /* _nonce */,
        bytes calldata _payload
    ) external {
        require(msg.sender == lzEndpoint, "Only endpoint can call");
        require(_srcChainId == sonicChainId, "Source must be Sonic chain");
        
        // Decode payload to get the request ID and user
        (uint64 requestId, address user) = abi.decode(_payload, (uint64, address));
        
        // Store the request
        requests[requestId] = user;
        latestRequestId = requestId;
        latestRequestUser = user;
        hasRequest = true;
        
        emit RandomnessRequested(requestId, user);
    }
    
    /**
     * @dev Simulate Chainlink VRF fulfillment
     */
    function simulateFulfillRandomness(uint64 _requestId, uint256 _randomWord) external {
        // Get the user address for this request
        address user = requests[_requestId];
        require(user != address(0), "Unknown request ID");
        
        // Simulate sending randomness back to Sonic chain
        if (lzEndpoint != address(0) && sonicVRFConsumer != address(0)) {
            // Prepare the payload with request ID, user, and randomness
            bytes memory payload = abi.encode(_requestId, user, _randomWord);
            
            // Simulate sending the payload via LayerZero
            (bool success, ) = lzEndpoint.call(
                abi.encodeWithSignature(
                    "mockLzReceive(uint16,bytes,uint64,bytes)",
                    sonicChainId,
                    abi.encodePacked(address(this)),
                    0,
                    payload
                )
            );
            
            require(success, "Failed to send cross-chain message");
        }
        
        emit RandomnessFulfilled(_requestId, _randomWord);
    }
    
    /**
     * @dev Get the latest request details - now returns request ID and user address directly
     */
    function getLatestRequest() external view returns (uint64, address) {
        require(hasRequest, "No requests yet");
        return (latestRequestId, latestRequestUser);
    }
    
    /**
     * @dev Check if a request exists and get its user
     */
    function getRequest(uint64 _requestId) external view returns (bool, address) {
        address user = requests[_requestId];
        return (user != address(0), user);
    }
} 