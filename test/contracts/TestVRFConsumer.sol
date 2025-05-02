// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IVRFConsumer.sol";

/**
 * @title TestVRFConsumer
 * @dev A test contract for simulating VRF functionality
 */
contract TestVRFConsumer is Ownable {
    // Request tracking
    mapping(uint256 => address) public requestToUser;
    uint256 public nextRequestId = 1;
    
    // Callback target
    address public callbackTarget;
    
    // Events
    event RandomnessRequested(uint256 indexed requestId, address indexed user);
    event RandomnessDelivered(uint256 indexed requestId, uint256 randomness);
    
    constructor(address _callbackTarget) Ownable() {
        callbackTarget = _callbackTarget;
    }
    
    /**
     * @notice Simulate requesting randomness
     * @param _user User address to associate with the request
     * @return requestId The request ID
     */
    function requestRandomness(address _user) external returns (uint256) {
        require(msg.sender == callbackTarget, "Only callback target can request randomness");
        
        uint256 requestId = nextRequestId++;
        requestToUser[requestId] = _user;
        
        emit RandomnessRequested(requestId, _user);
        
        return requestId;
    }
    
    /**
     * @notice Simulate delivery of randomness for test purposes
     * @param _requestId Request ID to fulfill
     * @param _randomness Random value to deliver
     */
    function deliverRandomness(uint256 _requestId, uint256 _randomness) external onlyOwner {
        address user = requestToUser[_requestId];
        require(user != address(0), "Unknown request");
        
        // Call the callback function on the target
        IVRFConsumer(callbackTarget).processRandomness(uint64(_requestId), user, _randomness);
        
        emit RandomnessDelivered(_requestId, _randomness);
        
        // Clean up
        delete requestToUser[_requestId];
    }
    
    /**
     * @notice Update the callback target
     * @param _callbackTarget New callback target address
     */
    function setCallbackTarget(address _callbackTarget) external onlyOwner {
        require(_callbackTarget != address(0), "Cannot set to zero address");
        callbackTarget = _callbackTarget;
    }
} 