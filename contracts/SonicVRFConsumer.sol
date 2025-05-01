// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./VRFConsumerBase.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/ILayerZeroReceiver.sol";
import "./interfaces/IVRFConsumer.sol";
import "./interfaces/ILayerZeroEndpointV2.sol";

/*
   ==================================
        SONIC VRF CONSUMER
   ==================================
     Cross-Chain Randomness Oracle
      LayerZero Message Gateway
    Dragon Lottery Entropy Provider
   ==================================

   🌊 Sonic Chain VRF Integration
   🔀 Cross-Chain Message Processor
   🐉 Dragon Lottery Randomizer
*/

/**
 * @title SonicVRFConsumer
 * @dev Contract that requests randomness from Arbitrum chain via LayerZero
 * and processes the randomness when it's received back
 */
contract SonicVRFConsumer is VRFConsumerBase, Ownable, ReentrancyGuard, IVRFConsumer, ILayerZeroReceiver {
    // LayerZero variables
    ILayerZeroEndpointV2 public immutable lzEndpoint;
    uint32 public arbitrumChainId;
    address public arbitrumVRFRequester;
    
    // Lottery contract that will use the randomness
    address public lotteryContract;
    
    // Request tracking
    mapping(uint64 => address) public requestToUser;
    uint64 public nonce;
    
    // Events
    event RandomnessRequested(uint64 indexed requestId, address indexed user);
    event RandomnessReceived(uint64 indexed requestId, address indexed user, uint256 randomness);
    event RandomnessProcessingFailed(uint64 indexed requestId, address indexed user, uint256 randomness);
    event ArbitrumChainIdUpdated(uint32 oldChainId, uint32 newChainId);
    event ArbitrumVRFRequesterUpdated(address oldRequester, address newRequester);
    event LotteryContractUpdated(address oldLottery, address newLottery);
    
    /**
     * @dev Constructor
     * @param _endpoint Address of the LayerZero endpoint
     * @param _arbitrumChainId LayerZero chain ID for Arbitrum
     * @param _arbitrumVRFRequester Address of the ArbitrumVRFRequester contract
     * @param _lotteryContract Address of the lottery contract
     */
    constructor(
        address _endpoint,
        uint32 _arbitrumChainId,
        address _arbitrumVRFRequester,
        address _lotteryContract
    ) Ownable() {
        require(_endpoint != address(0), "Endpoint cannot be zero address");
        require(_arbitrumVRFRequester != address(0), "VRF requester cannot be zero address");
        require(_lotteryContract != address(0), "Lottery contract cannot be zero address");
        
        lzEndpoint = ILayerZeroEndpointV2(_endpoint);
        arbitrumChainId = _arbitrumChainId;
        arbitrumVRFRequester = _arbitrumVRFRequester;
        lotteryContract = _lotteryContract;
    }
    
    /**
     * @notice Request randomness for a user
     * @param _user User address to receive randomness
     * @return requestId The unique request ID
     */
    function requestRandomness(address _user) external override nonReentrant returns (uint64) {
        require(msg.sender == lotteryContract, "Only lottery contract");
        
        uint64 requestId = nonce++;
        requestToUser[requestId] = _user;
        
        // Encode the payload with request ID and user
        bytes memory payload = abi.encode(requestId, _user);
        
        // Create message parameters
        ILayerZeroEndpointV2.MessagingParams memory params = ILayerZeroEndpointV2.MessagingParams({
            dstEid: arbitrumChainId,
            receiver: abi.encodePacked(arbitrumVRFRequester),
            message: payload,
            options: abi.encodePacked(uint16(1), uint256(500000)),
            payInLzToken: false
        });
        
        // Set a fixed fee for simplicity
        uint256 messageFee = 0.01 ether;
        
        // Send message
        lzEndpoint.send{value: messageFee}(params, payable(address(this)));
        
        emit RandomnessRequested(requestId, _user);
        
        return requestId;
    }
    
    /**
     * @notice Process LayerZero messages
     * @param _srcChainId ID of the source chain
     * @param _srcAddress Address of the source contract
     * @param _nonce The message nonce
     * @param _payload The message payload
     */
    function lzReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external override {
        require(msg.sender == address(lzEndpoint), "Not from LayerZero endpoint");
        require(_srcChainId == arbitrumChainId, "Not from Arbitrum chain");
        
        // Extract source address - this is a 20-byte address + prefix that we need to parse
        address srcAddress = _bytesToAddress(_srcAddress);
        require(srcAddress == arbitrumVRFRequester, "Not from authorized source");
        
        // Decode the message to get the request ID, user, and randomness
        (uint64 requestId, address user, uint256 randomness) = abi.decode(_payload, (uint64, address, uint256));
        
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
     * @dev Convert bytes to address - handles the LayerZero address format
     */
    function _bytesToAddress(bytes calldata _bytes) internal pure returns (address addr) {
        // LayerZero uses a specific format for addresses, this extracts the actual Ethereum address
        require(_bytes.length >= 20, "Invalid address length");
        
        // Convert the last 20 bytes to an address
        addr = address(uint160(bytes20(_bytes[_bytes.length - 20:])));
    }
    
    /**
     * @notice Process randomness - not used in this implementation, required by interface
     * @param requestId Request ID
     * @param user User address
     * @param randomness Random value
     */
    function processRandomness(uint64 requestId, address user, uint256 randomness) external pure override {
        revert("Not implemented - use LayerZero message path");
    }
    
    /**
     * @notice Required by VRFConsumerBase but not used in this implementation
     * @param user User requesting randomness
     * @return requestId The ID of the randomness request
     */
    function _requestRandomness(address user) internal override returns (uint256 requestId) {
        revert("Not implemented - use external requestRandomness");
    }
    
    /**
     * @notice Required by VRFConsumerBase but not used in this implementation
     * @param requestId Request ID
     * @param randomness Random value
     */
    function _fulfillRandomness(uint256 requestId, uint256 randomness) internal override {
        revert("Not implemented - use LayerZero message path");
    }
    
    /**
     * @notice Update the Arbitrum chain ID
     * @param _arbitrumChainId New Arbitrum chain ID
     */
    function updateArbitrumChainId(uint32 _arbitrumChainId) external onlyOwner {
        uint32 oldChainId = arbitrumChainId;
        arbitrumChainId = _arbitrumChainId;
        emit ArbitrumChainIdUpdated(oldChainId, _arbitrumChainId);
    }
    
    /**
     * @notice Update the Arbitrum VRF requester address
     * @param _arbitrumVRFRequester New Arbitrum VRF requester address
     */
    function updateArbitrumVRFRequester(address _arbitrumVRFRequester) external onlyOwner {
        require(_arbitrumVRFRequester != address(0), "Cannot set to zero address");
        address oldRequester = arbitrumVRFRequester;
        arbitrumVRFRequester = _arbitrumVRFRequester;
        emit ArbitrumVRFRequesterUpdated(oldRequester, _arbitrumVRFRequester);
    }
    
    /**
     * @notice Update the lottery contract address
     * @param _lotteryContract New lottery contract address
     */
    function updateLotteryContract(address _lotteryContract) external onlyOwner {
        require(_lotteryContract != address(0), "Cannot set to zero address");
        address oldLottery = lotteryContract;
        lotteryContract = _lotteryContract;
        emit LotteryContractUpdated(oldLottery, _lotteryContract);
    }
    
    /**
     * @notice Withdraw native tokens from the contract
     * @param _amount Amount to withdraw
     * @param _to Address to withdraw to
     */
    function withdraw(uint256 _amount, address _to) external onlyOwner nonReentrant {
        require(_to != address(0), "Cannot withdraw to zero address");
        (bool success, ) = _to.call{value: _amount}("");
        require(success, "Withdrawal failed");
    }
    
    /**
     * @notice Allow the contract to receive native tokens
     */
    receive() external payable {}
} 