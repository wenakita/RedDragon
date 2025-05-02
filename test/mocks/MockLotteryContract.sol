// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../contracts/interfaces/IVRFConsumer.sol";

/**
 * @title MockLotteryContract
 * @dev Simple mock contract for testing the VRF system
 */
contract MockLotteryContract {
    // VRF consumer contract
    IVRFConsumer public vrfConsumer;
    
    // Request tracking
    mapping(uint64 => address) public requestToUser;
    mapping(uint64 => uint256) public requestToRandomness;
    mapping(address => uint64) public userToRequestId;
    
    // Events
    event RandomnessRequested(uint64 indexed requestId, address indexed user);
    event RandomnessReceived(uint64 indexed requestId, address indexed user, uint256 randomness);
    event VRFConsumerUpdated(address oldConsumer, address newConsumer);
    
    /**
     * @dev Constructor
     * @param _vrfConsumer VRF consumer contract address
     */
    constructor(address _vrfConsumer) {
        if (_vrfConsumer != address(0)) {
            vrfConsumer = IVRFConsumer(_vrfConsumer);
        }
    }
    
    /**
     * @notice Update the VRF consumer address
     * @param _vrfConsumer New VRF consumer address
     */
    function updateVRFConsumer(address _vrfConsumer) external {
        require(_vrfConsumer != address(0), "VRF consumer cannot be zero address");
        address oldConsumer = address(vrfConsumer);
        vrfConsumer = IVRFConsumer(_vrfConsumer);
        emit VRFConsumerUpdated(oldConsumer, _vrfConsumer);
    }
    
    /**
     * @notice Request randomness for a user
     * @param _user User address
     * @return requestId The request ID
     */
    function requestRandomness(address _user) external returns (uint64) {
        require(address(vrfConsumer) != address(0), "VRF consumer not set");
        uint64 requestId = vrfConsumer.requestRandomness(_user);
        requestToUser[requestId] = _user;
        userToRequestId[_user] = requestId;
        emit RandomnessRequested(requestId, _user);
        return requestId;
    }
    
    /**
     * @notice Process randomness from VRF consumer
     * @param _requestId Request ID
     * @param _user User address
     * @param _randomness Random value
     */
    function processRandomness(uint64 _requestId, address _user, uint256 _randomness) external {
        // Verify sender is the VRF consumer
        require(msg.sender == address(vrfConsumer), "Only VRF consumer can call");
        
        // Verify the request exists
        require(requestToUser[_requestId] == _user, "Unknown request or user mismatch");
        
        // Store the randomness
        requestToRandomness[_requestId] = _randomness;
        
        // Emit event
        emit RandomnessReceived(_requestId, _user, _randomness);
    }
    
    /**
     * @notice Get the randomness for a user
     * @param _user User address
     * @return The random value
     */
    function getRandomnessForUser(address _user) external view returns (uint256) {
        uint64 requestId = userToRequestId[_user];
        require(requestId != 0, "No randomness requested for user");
        return requestToRandomness[requestId];
    }
    
    /**
     * @notice Get the randomness for a request ID
     * @param _requestId Request ID
     * @return The random value
     */
    function getRandomness(uint64 _requestId) external view returns (uint256) {
        require(requestToUser[_requestId] != address(0), "Unknown request ID");
        return requestToRandomness[_requestId];
    }
    
    /**
     * @notice Get the user for a request ID
     * @param _requestId Request ID
     * @return The user address
     */
    function getUser(uint64 _requestId) external view returns (address) {
        return requestToUser[_requestId];
    }
    
    /**
     * @notice Get the request ID for a user
     * @param _user User address
     * @return The request ID
     */
    function getRequestId(address _user) external view returns (uint64) {
        return userToRequestId[_user];
    }
    
    /**
     * @notice Check if a user has received randomness
     * @param _user User address
     * @return Whether randomness has been received
     */
    function hasReceivedRandomness(address _user) external view returns (bool) {
        uint64 requestId = userToRequestId[_user];
        return requestId != 0 && requestToRandomness[requestId] != 0;
    }
} 