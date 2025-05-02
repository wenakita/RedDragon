// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockSonicVRFConsumer
 * @dev Mock implementation of SonicVRFConsumer for testing, implementing the cross-chain VRF flow
 */
contract MockSonicVRFConsumer {
    // LayerZero variables
    address public lzEndpoint;
    uint32 public arbitrumChainId;
    address public arbitrumVRFRequester;
    
    // Request tracking
    uint64 public nonce;
    mapping(uint64 => address) public requestToUser;
    uint256 public requestCount;
    
    // Interface for consumer contracts
    address public lotteryContract;
    
    // Events
    event RandomnessRequested(uint64 indexed requestId, address indexed user);
    event RandomnessReceived(uint64 indexed requestId, address indexed user, uint256 randomness);
    event RandomnessProcessingFailed(uint64 indexed requestId, address indexed user, uint256 randomness);
    
    /**
     * @dev Initialize function for the mock
     */
    function initialize(
        address _lzEndpoint,
        uint32 _arbitrumChainId,
        address _arbitrumVRFRequester
    ) external {
        lzEndpoint = _lzEndpoint;
        arbitrumChainId = _arbitrumChainId;
        arbitrumVRFRequester = _arbitrumVRFRequester;
    }
    
    /**
     * @dev Set the lottery contract address
     */
    function setLotteryContract(address _lotteryContract) external {
        lotteryContract = _lotteryContract;
    }
    
    /**
     * @dev Request randomness
     * @param _user User address for randomness request
     * @return requestId The request ID
     */
    function requestRandomness(address _user) external returns (uint64) {
        require(msg.sender == lotteryContract, "Only lottery contract");
        
        uint64 requestId = nonce++;
        requestToUser[requestId] = _user;
        requestCount++;
        
        // In a real implementation, this would send a message to Arbitrum via LayerZero
        // Here we just emit the event
        emit RandomnessRequested(requestId, _user);
        
        return requestId;
    }
    
    /**
     * @dev Simulate receiving randomness from Arbitrum
     * @param _requestId Request ID
     * @param _user User address
     * @param _randomness The randomness value
     */
    function receiveRandomness(uint64 _requestId, address _user, uint256 _randomness) internal {
        // Verify the request ID and user
        address storedUser = requestToUser[_requestId];
        require(storedUser != address(0), "Unknown request ID");
        require(storedUser == _user, "User mismatch");
        
        // Forward randomness to the lottery contract
        emit RandomnessReceived(_requestId, _user, _randomness);
        
        // Call processRandomness on the lottery contract
        if (lotteryContract != address(0)) {
            (bool success, ) = lotteryContract.call(
                abi.encodeWithSignature("fulfillRandomness(uint256,uint256)", _requestId, _randomness)
            );
            
            // If the lottery contract rejected the randomness, log it but don't revert
            if (!success) {
                emit RandomnessProcessingFailed(_requestId, _user, _randomness);
            }
        }
        
        // Clean up the request mapping
        delete requestToUser[_requestId];
    }
    
    /**
     * @dev Mock LayerZero receive function
     */
    function lzReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 /* _nonce */,
        bytes calldata _payload
    ) external {
        require(msg.sender == lzEndpoint, "Only from LayerZero endpoint");
        require(_srcChainId == arbitrumChainId, "Not from Arbitrum chain");
        
        // Verify the source address matches arbitrumVRFRequester
        // Convert the bytes to address - assuming it's the correct format from LayerZero
        address srcAddress = address(uint160(uint256(bytes32(_srcAddress))));
        require(srcAddress == arbitrumVRFRequester, "Not from authorized source");
        
        // Decode the message to get the request ID, user, and randomness
        (uint64 requestId, address user, uint256 randomness) = abi.decode(_payload, (uint64, address, uint256));
        
        // Process the randomness by calling our internal function
        receiveRandomness(requestId, user, randomness);
    }
    
    /**
     * @dev External function to simulate receiving randomness for testing
     */
    function simulateReceiveRandomness(uint64 _requestId, address _user, uint256 _randomness) external {
        // This provides an external way to trigger randomness processing for testing
        receiveRandomness(_requestId, _user, _randomness);
    }
    
    /**
     * @dev Function to get request count
     */
    function getRequestCount() external view returns (uint256) {
        return requestCount;
    }
    
    /**
     * @dev Function to check user request count
     */
    function getUserRequestCount(address _user) external view returns (uint256) {
        uint256 count = 0;
        for (uint64 i = 0; i < nonce; i++) {
            if (requestToUser[i] == _user) {
                count++;
            }
        }
        return count;
    }
    
    /**
     * @dev Function to get the latest request ID
     */
    function getLatestRequestId() external view returns (uint64) {
        return nonce > 0 ? nonce - 1 : 0;
    }
} 