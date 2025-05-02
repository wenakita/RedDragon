// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/ILayerZeroEndpointV2Mock.sol";

/**
 * @title SonicVRFConsumerMock
 * @dev Simplified implementation of SonicVRFConsumer for testing
 */
contract SonicVRFConsumerMock is Ownable, ReentrancyGuard {
    // LayerZero endpoint
    ILayerZeroEndpointV2Mock public endpoint;
    
    // LayerZero variables
    uint32 public arbitrumChainId;
    address public arbitrumVRFRequester;
    
    // Lottery contract that will use the randomness
    address public lotteryContract;
    
    // Request tracking
    uint64 public nonce;
    mapping(uint64 => address) public requestToUser;
    
    // Events
    event RandomnessRequested(uint64 indexed requestId, address indexed user);
    event RandomnessReceived(uint64 indexed requestId, address indexed user, uint256 randomness);
    event RandomnessProcessingFailed(uint64 indexed requestId, address indexed user, uint256 randomness);
    
    constructor(
        address _endpoint,
        uint32 _arbitrumChainId,
        address _arbitrumVRFRequester,
        address _lotteryContract
    ) Ownable() {
        endpoint = ILayerZeroEndpointV2Mock(_endpoint);
        arbitrumChainId = _arbitrumChainId;
        arbitrumVRFRequester = _arbitrumVRFRequester;
        lotteryContract = _lotteryContract;
    }
    
    /**
     * @notice Request randomness for a user
     * @param _user User address to receive randomness
     * @return requestId The unique request ID
     */
    function requestRandomness(address _user) external nonReentrant returns (uint64) {
        require(msg.sender == lotteryContract, "Only lottery contract");
        
        uint64 requestId = nonce++;
        requestToUser[requestId] = _user;
        
        // Encode the payload with request ID and user
        bytes memory payload = abi.encode(requestId, _user);
        
        // Prepare message params
        ILayerZeroEndpointV2Mock.MessagingParams memory params = ILayerZeroEndpointV2Mock.MessagingParams({
            dstEid: arbitrumChainId,
            receiver: abi.encodePacked(arbitrumVRFRequester),
            message: payload,
            options: abi.encodePacked(uint16(1), uint256(500000)),
            payInLzToken: false
        });
        
        // Estimate fee
        ILayerZeroEndpointV2Mock.MessagingFee memory fee = endpoint.quoteFee(params);
        
        // Send message
        endpoint.send{value: fee.nativeFee}(params);
        
        emit RandomnessRequested(requestId, _user);
        
        return requestId;
    }
    
    /**
     * @notice Process LayerZero messages (simplified mock implementation)
     */
    function _lzReceive(
        ILayerZeroEndpointV2Mock.Origin calldata _origin,
        bytes32,  // guid
        bytes calldata _message,
        address,  // executor
        bytes calldata  // extraData
    ) external {
        require(_origin.srcEid == arbitrumChainId, "Not from Arbitrum chain");
        
        // Verify the source address
        address srcAddress = address(uint160(uint256(_origin.sender)));
        require(srcAddress == arbitrumVRFRequester, "Not from authorized source");
        
        // Decode the message to get the request ID, user, and randomness
        (uint64 requestId, address user, uint256 randomness) = abi.decode(_message, (uint64, address, uint256));
        
        // Verify the request ID and user
        address storedUser = requestToUser[requestId];
        require(storedUser != address(0), "Unknown request ID");
        require(storedUser == user, "User mismatch");
        
        // Forward randomness to the lottery contract
        emit RandomnessReceived(requestId, user, randomness);
        
        // Call processRandomness on the lottery contract
        (bool success, ) = lotteryContract.call(
            abi.encodeWithSignature("processRandomness(uint64,address,uint256)", requestId, user, randomness)
        );
        
        // Clean up the request mapping
        delete requestToUser[requestId];
        
        // If the lottery contract rejected the randomness, log it but don't revert
        if (!success) {
            emit RandomnessProcessingFailed(requestId, user, randomness);
        }
    }
    
    /**
     * @notice Update parameters (admin functions)
     */
    function updateArbitrumChainId(uint32 _arbitrumChainId) external onlyOwner {
        arbitrumChainId = _arbitrumChainId;
    }
    
    function updateArbitrumVRFRequester(address _arbitrumVRFRequester) external onlyOwner {
        require(_arbitrumVRFRequester != address(0), "Cannot set to zero address");
        arbitrumVRFRequester = _arbitrumVRFRequester;
    }
    
    function updateLotteryContract(address _lotteryContract) external onlyOwner {
        require(_lotteryContract != address(0), "Cannot set to zero address");
        lotteryContract = _lotteryContract;
    }
    
    /**
     * @notice Allow the contract to receive native tokens
     */
    receive() external payable {}
} 