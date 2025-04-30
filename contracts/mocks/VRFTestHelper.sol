// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VRFTestHelper
 * @dev Helper contract for testing VRF implementations without relying on external contracts
 * This contract includes mock implementations for testing both SonicVRFConsumer and ArbitrumVRFRequester
 */
contract VRFTestHelper is Ownable {
    // Request tracking
    mapping(uint64 => address) public requestToUser;
    uint64 public nonce;
    
    // VRF state
    uint64 public subscriptionId = 12345;
    bytes32 public keyHash = bytes32(uint256(123456));
    uint16 public requestConfirmations = 3;
    uint32 public callbackGasLimit = 500000;
    uint32 public numWords = 1;
    
    // Response state for testing
    mapping(uint64 => uint256) public responseByRequestId;
    
    // Chain IDs for testing
    uint32 public sonicChainId = 1;
    uint32 public arbitrumChainId = 110;
    
    // For storing read response data
    uint64 public lastQueriedSubscriptionId;
    bytes32 public lastQueriedKeyHash;
    uint16 public lastQueriedConfirmations;
    uint32 public lastQueriedCallbackGasLimit;
    uint32 public lastQueriedNumWords;
    uint64 public lastQueriedTimestamp;
    
    // Events
    event RandomnessRequested(uint64 indexed requestId, address indexed user);
    event RandomnessReceived(uint64 indexed requestId, address indexed user, uint256 randomness);
    event VRFStateQueried(
        uint64 subscriptionId, 
        bytes32 keyHash, 
        uint16 confirmations, 
        uint32 callbackGasLimit,
        uint32 numWords
    );
    
    constructor() Ownable() {}
    
    /**
     * @notice Request randomness (like SonicVRFConsumer)
     * @param _user User address to associate with the request
     * @return requestId The request ID
     */
    function requestRandomness(address _user) external returns (uint64) {
        uint64 requestId = nonce++;
        requestToUser[requestId] = _user;
        
        emit RandomnessRequested(requestId, _user);
        
        return requestId;
    }
    
    /**
     * @notice Simulate receiving randomness from Arbitrum
     * @param _requestId Request ID
     * @param _user User address
     * @param _randomness Random value
     */
    function receiveRandomness(uint64 _requestId, address _user, uint256 _randomness) external {
        // Verify the request ID and user
        address storedUser = requestToUser[_requestId];
        require(storedUser != address(0), "Unknown request ID");
        require(storedUser == _user, "User mismatch");
        
        // Store the randomness
        responseByRequestId[_requestId] = _randomness;
        
        emit RandomnessReceived(_requestId, _user, _randomness);
        
        // Clean up the request mapping
        delete requestToUser[_requestId];
    }
    
    /**
     * @notice Simulate the Arbitrum VRF requester
     * @param _requestId Request ID from Sonic
     * @param _user User address
     * @return vrfRequestId The Chainlink VRF request ID
     */
    function simulateArbitrumVRFRequest(uint64 _requestId, address _user) external returns (uint256) {
        require(requestToUser[_requestId] == _user, "Invalid request");
        
        // In a real scenario, ArbitrumVRFRequester would call Chainlink VRF here
        // For testing, we'll just return a fixed value as the VRF request ID
        return uint256(_requestId);
    }
    
    /**
     * @notice Simulate Chainlink VRF fulfillment
     * @param _vrfRequestId VRF request ID
     * @param _randomness Random value
     */
    function fulfillRandomness(uint256 _vrfRequestId, uint256 _randomness) external {
        // In a real scenario, this would be called by Chainlink VRF
        // For testing, we simulate the completion of the VRF request
        
        // Convert back to our requestId format
        uint64 requestId = uint64(_vrfRequestId);
        address user = requestToUser[requestId];
        
        // Store the randomness
        responseByRequestId[requestId] = _randomness;
        
        emit RandomnessReceived(requestId, user, _randomness);
    }
    
    /**
     * @notice Simulate querying VRF state
     */
    function queryVRFState() external {
        // In a real scenario, this would send a read request to Arbitrum
        // For testing, we'll just update our local state
        lastQueriedSubscriptionId = subscriptionId;
        lastQueriedKeyHash = keyHash;
        lastQueriedConfirmations = requestConfirmations;
        lastQueriedCallbackGasLimit = callbackGasLimit;
        lastQueriedNumWords = numWords;
        lastQueriedTimestamp = uint64(block.timestamp);
        
        emit VRFStateQueried(
            subscriptionId,
            keyHash,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
    }
    
    /**
     * @notice Update VRF parameters
     */
    function updateVRFParams(
        uint64 _subscriptionId,
        bytes32 _keyHash,
        uint16 _requestConfirmations,
        uint32 _callbackGasLimit,
        uint32 _numWords
    ) external onlyOwner {
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        requestConfirmations = _requestConfirmations;
        callbackGasLimit = _callbackGasLimit;
        numWords = _numWords;
    }
    
    /**
     * @notice Get response for a request ID
     * @param _requestId Request ID
     * @return randomness The random value
     */
    function getResponse(uint64 _requestId) external view returns (uint256) {
        return responseByRequestId[_requestId];
    }
    
    /**
     * @notice Simulate the retry mechanism
     * @param _requestId Request ID to retry
     * @param _randomness Randomness to deliver
     */
    function retryRandomness(uint64 _requestId, uint256 _randomness) external {
        address user = requestToUser[_requestId];
        require(user != address(0), "Unknown request ID");
        
        // Store the randomness
        responseByRequestId[_requestId] = _randomness;
        
        emit RandomnessReceived(_requestId, user, _randomness);
        
        // Clean up the request mapping
        delete requestToUser[_requestId];
    }
    
    /**
     * @notice Get the current chain ID for testing
     */
    function getChainId() external view returns (uint32) {
        return sonicChainId;
    }
} 