// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockSonicVRFConsumer
 * @dev Mock implementation of SonicVRFConsumer for testing
 */
contract MockSonicVRFConsumer {
    // Simplified state variables
    uint64 public nonce;
    mapping(uint64 => address) public requestToUser;
    address public lotteryContract;
    
    // Events
    event RandomnessRequested(uint64 indexed requestId, address indexed user);
    event RandomnessReceived(uint64 indexed requestId, address indexed user, uint256 randomness);
    
    /**
     * @dev Constructor
     * @param _lotteryContract Address of the lottery contract
     */
    constructor(address _lotteryContract) {
        lotteryContract = _lotteryContract;
    }
    
    /**
     * @notice Request randomness for a user
     * @param _user User address to receive randomness
     * @return requestId The unique request ID
     */
    function requestRandomness(address _user) external returns (uint64) {
        require(msg.sender == lotteryContract, "Only lottery contract");
        
        uint64 requestId = nonce++;
        requestToUser[requestId] = _user;
        
        emit RandomnessRequested(requestId, _user);
        
        return requestId;
    }
    
    /**
     * @notice Mock function to simulate receiving randomness from VRF
     * @param _requestId Request ID
     * @param _user User address
     * @param _randomness Random value
     */
    function mockReceiveRandomness(uint64 _requestId, address _user, uint256 _randomness) external {
        address storedUser = requestToUser[_requestId];
        require(storedUser != address(0), "Unknown request ID");
        require(storedUser == _user, "User mismatch");
        
        emit RandomnessReceived(_requestId, _user, _randomness);
        
        // Call processRandomness on the lottery contract
        (bool success, ) = lotteryContract.call(
            abi.encodeWithSignature("processRandomness(uint64,address,uint256)", _requestId, _user, _randomness)
        );
        
        // Clean up the request mapping
        delete requestToUser[_requestId];
        
        require(success, "Failed to process randomness");
    }
    
    /**
     * @notice Update the lottery contract address
     * @param _lotteryContract New lottery contract address
     */
    function setLotteryContract(address _lotteryContract) external {
        lotteryContract = _lotteryContract;
    }
} 