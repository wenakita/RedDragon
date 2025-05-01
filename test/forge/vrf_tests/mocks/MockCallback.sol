// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockCallback
 * @dev Mock callback contract that simulates the lottery contract
 * that receives randomness
 */
contract MockCallback {
    // Track requests and their randomness
    mapping(uint64 => uint256) public receivedRandomness;
    address public vrfConsumer;
    
    // Events
    event RandomnessReceived(uint64 indexed requestId, uint256 randomValue);
    event RandomnessRequested(uint64 indexed requestId, address indexed user);
    
    /**
     * @dev Set the VRF consumer contract
     */
    function setVRFConsumer(address _vrfConsumer) external {
        vrfConsumer = _vrfConsumer;
    }
    
    /**
     * @dev Called by the VRF consumer to deliver randomness
     */
    function processRandomness(
        uint64 _requestId,
        address _user,
        uint256 _randomness
    ) external {
        require(msg.sender == vrfConsumer, "Only VRF consumer");
        receivedRandomness[_requestId] = _randomness;
        emit RandomnessReceived(_requestId, _randomness);
    }
    
    /**
     * @dev Request randomness from the VRF consumer
     */
    function requestRandomness(address _user) external returns (uint64) {
        require(vrfConsumer != address(0), "VRF consumer not set");
        
        // Call the VRF consumer
        (bool success, bytes memory result) = vrfConsumer.call(
            abi.encodeWithSignature("requestRandomness(address)", _user)
        );
        require(success, "Failed to request randomness");
        
        // Decode the request ID
        uint64 requestId = abi.decode(result, (uint64));
        emit RandomnessRequested(requestId, _user);
        
        return requestId;
    }
} 