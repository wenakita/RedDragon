// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/ILayerZeroReceiver.sol";
import "./interfaces/ILayerZeroEndpointV2.sol";

/*
   =====================================
        ARBITRUM VRF REQUESTER
   =====================================
     Cross-Chain Randomness Hub
      Chainlink VRF Integration
    Secure Arbitrum Bridge Protocol
   =====================================

   🔗 LayerZero Message Protocol
   🎲 Chainlink VRF Integration
   🌉 Arbitrum → Sonic Bridge
*/

/**
 * @title ArbitrumVRFRequester
 * @dev Contract that receives requests from Sonic chain, requests randomness from Chainlink VRF,
 * and sends the randomness back to Sonic chain via LayerZero
 */
contract ArbitrumVRFRequester is VRFConsumerBaseV2, Ownable, ReentrancyGuard, ILayerZeroReceiver {
    // Chainlink VRF variables
    VRFCoordinatorV2Interface public immutable vrfCoordinator;
    uint64 public subscriptionId;
    bytes32 public keyHash;
    uint16 public requestConfirmations;
    uint32 public callbackGasLimit;
    uint32 public numWords;
    
    // LayerZero variables
    ILayerZeroEndpointV2 public immutable lzEndpoint;
    uint32 public sonicChainId;
    address public sonicVRFConsumer;
    
    // Request tracking
    mapping(uint256 => RequestStatus) public requests;
    
    struct RequestStatus {
        uint64 sonicRequestId;
        address user;
        bool fulfilled;
        uint256 randomness;
    }
    
    // Events
    event VRFRequested(uint256 indexed requestId, uint64 indexed sonicRequestId, address indexed user);
    event VRFFulfilled(uint256 indexed requestId, uint256 randomness);
    event VRFSentToSonic(uint256 indexed requestId, uint64 indexed sonicRequestId, address indexed user, uint256 randomness);
    event SubscriptionIdUpdated(uint64 oldSubscriptionId, uint64 newSubscriptionId);
    event KeyHashUpdated(bytes32 oldKeyHash, bytes32 newKeyHash);
    event RequestConfirmationsUpdated(uint16 oldConfirmations, uint16 newConfirmations);
    event CallbackGasLimitUpdated(uint32 oldLimit, uint32 newLimit);
    event NumWordsUpdated(uint32 oldNumWords, uint32 newNumWords);
    event SonicChainIdUpdated(uint32 oldChainId, uint32 newChainId);
    event SonicVRFConsumerUpdated(address oldConsumer, address newConsumer);
    
    /**
     * @dev Constructor
     * @param _vrfCoordinator Address of the VRF Coordinator on Arbitrum
     * @param _endpoint Address of the LayerZero endpoint
     * @param _subscriptionId Chainlink VRF subscription ID
     * @param _keyHash Key hash for VRF
     * @param _sonicChainId LayerZero chain ID for Sonic chain
     * @param _sonicVRFConsumer Address of the SonicVRFConsumer contract
     */
    constructor(
        address _vrfCoordinator,
        address _endpoint,
        uint64 _subscriptionId,
        bytes32 _keyHash,
        uint32 _sonicChainId,
        address _sonicVRFConsumer
    ) VRFConsumerBaseV2(_vrfCoordinator) Ownable() {
        require(_vrfCoordinator != address(0), "VRF Coordinator cannot be zero");
        require(_endpoint != address(0), "Endpoint cannot be zero");
        require(_sonicVRFConsumer != address(0), "Consumer cannot be zero");
        
        vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
        lzEndpoint = ILayerZeroEndpointV2(_endpoint);
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        sonicChainId = _sonicChainId;
        sonicVRFConsumer = _sonicVRFConsumer;
        
        // Set default values
        requestConfirmations = 3;
        callbackGasLimit = 500000;
        numWords = 1;
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
        require(_srcChainId == sonicChainId, "Not from Sonic chain");
        
        // Extract source address
        address srcAddress = _bytesToAddress(_srcAddress);
        require(srcAddress == sonicVRFConsumer, "Not from authorized source");
        
        // Decode the message
        (uint64 sonicRequestId, address user) = abi.decode(_payload, (uint64, address));
        
        // Request randomness from Chainlink VRF
        uint256 requestId = vrfCoordinator.requestRandomWords(
            keyHash,
            subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
        
        // Store request info
        requests[requestId] = RequestStatus({
            sonicRequestId: sonicRequestId,
            user: user,
            fulfilled: false,
            randomness: 0
        });
        
        emit VRFRequested(requestId, sonicRequestId, user);
    }
    
    /**
     * @dev Convert bytes to address - handles the LayerZero address format
     */
    function _bytesToAddress(bytes calldata _bytes) internal pure returns (address addr) {
        require(_bytes.length >= 20, "Invalid address length");
        addr = address(uint160(bytes20(_bytes[_bytes.length - 20:])));
    }
    
    /**
     * @notice Callback function used by VRF Coordinator to return the random numbers
     * @param requestId Request ID
     * @param randomWords Random words
     */
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        require(msg.sender == getVRFCoordinator(), "Only VRF coordinator can fulfill");
        
        RequestStatus storage request = requests[requestId];
        require(!request.fulfilled, "Request already fulfilled");
        require(request.user != address(0), "Unknown request");
        
        // Store randomness
        request.randomness = randomWords[0];
        request.fulfilled = true;
        
        emit VRFFulfilled(requestId, randomWords[0]);
        
        // Send randomness back to Sonic chain
        _sendRandomnessToSonic(
            requestId,
            request.sonicRequestId,
            request.user,
            randomWords[0]
        );
    }
    
    /**
     * @notice Send randomness back to Sonic chain
     * @param _requestId Chainlink request ID
     * @param _sonicRequestId Sonic request ID
     * @param _user User address
     * @param _randomness Random number
     */
    function _sendRandomnessToSonic(
        uint256 _requestId,
        uint64 _sonicRequestId,
        address _user,
        uint256 _randomness
    ) internal nonReentrant {
        // Encode the payload
        bytes memory payload = abi.encode(_sonicRequestId, _user, _randomness);
        
        // Create message parameters
        ILayerZeroEndpointV2.MessagingParams memory params = ILayerZeroEndpointV2.MessagingParams({
            dstEid: sonicChainId,
            receiver: abi.encodePacked(sonicVRFConsumer),
            message: payload,
            options: abi.encodePacked(uint16(1), uint256(500000)),
            payInLzToken: false
        });
        
        // Set a fixed fee for simplicity
        uint256 messageFee = 0.01 ether;
        
        // Send message
        lzEndpoint.send{value: messageFee}(params, payable(address(this)));
        
        emit VRFSentToSonic(_requestId, _sonicRequestId, _user, _randomness);
    }
    
    /**
     * @notice Override to implement the _requestRandomness function required by VRFConsumerBase
     * @param user User requesting randomness
     * @return requestId The ID of the randomness request
     */
    function _requestRandomness(address user) internal override returns (uint256) {
        revert("Not implemented - use LayerZero message path");
    }
    
    /**
     * @notice Override to implement the _fulfillRandomness function required by VRFConsumerBase
     * @param requestId Request ID
     * @param randomness Random value
     */
    function _fulfillRandomness(uint256 requestId, uint256 randomness) internal override {
        revert("Not implemented - directly use fulfillRandomWords");
    }
    
    /**
     * @notice Update the Chainlink VRF subscription ID
     * @param _subscriptionId New subscription ID
     */
    function updateSubscriptionId(uint64 _subscriptionId) external onlyOwner {
        uint64 oldSubscriptionId = subscriptionId;
        subscriptionId = _subscriptionId;
        emit SubscriptionIdUpdated(oldSubscriptionId, _subscriptionId);
    }
    
    /**
     * @notice Update the key hash
     * @param _keyHash New key hash
     */
    function updateKeyHash(bytes32 _keyHash) external onlyOwner {
        bytes32 oldKeyHash = keyHash;
        keyHash = _keyHash;
        emit KeyHashUpdated(oldKeyHash, _keyHash);
    }
    
    /**
     * @notice Update the request confirmations
     * @param _requestConfirmations New request confirmations
     */
    function updateRequestConfirmations(uint16 _requestConfirmations) external onlyOwner {
        uint16 oldConfirmations = requestConfirmations;
        requestConfirmations = _requestConfirmations;
        emit RequestConfirmationsUpdated(oldConfirmations, _requestConfirmations);
    }
    
    /**
     * @notice Update the callback gas limit
     * @param _callbackGasLimit New callback gas limit
     */
    function updateCallbackGasLimit(uint32 _callbackGasLimit) external onlyOwner {
        uint32 oldLimit = callbackGasLimit;
        callbackGasLimit = _callbackGasLimit;
        emit CallbackGasLimitUpdated(oldLimit, _callbackGasLimit);
    }
    
    /**
     * @notice Update the number of words
     * @param _numWords New number of words
     */
    function updateNumWords(uint32 _numWords) external onlyOwner {
        require(_numWords > 0, "NumWords must be greater than 0");
        uint32 oldNumWords = numWords;
        numWords = _numWords;
        emit NumWordsUpdated(oldNumWords, _numWords);
    }
    
    /**
     * @notice Update the Sonic chain ID
     * @param _sonicChainId New Sonic chain ID
     */
    function updateSonicChainId(uint32 _sonicChainId) external onlyOwner {
        uint32 oldChainId = sonicChainId;
        sonicChainId = _sonicChainId;
        emit SonicChainIdUpdated(oldChainId, _sonicChainId);
    }
    
    /**
     * @notice Update the Sonic VRF consumer address
     * @param _sonicVRFConsumer New Sonic VRF consumer address
     */
    function updateSonicVRFConsumer(address _sonicVRFConsumer) external onlyOwner {
        require(_sonicVRFConsumer != address(0), "Cannot set to zero address");
        address oldConsumer = sonicVRFConsumer;
        sonicVRFConsumer = _sonicVRFConsumer;
        emit SonicVRFConsumerUpdated(oldConsumer, _sonicVRFConsumer);
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
     * @notice Force retry sending randomness to Sonic if it failed for any reason
     * @param _requestId Request ID to retry
     */
    function retrySendRandomness(uint256 _requestId) external onlyOwner nonReentrant {
        RequestStatus storage request = requests[_requestId];
        require(request.fulfilled, "Request not fulfilled yet");
        require(request.user != address(0), "Unknown request");
        
        _sendRandomnessToSonic(
            _requestId,
            request.sonicRequestId,
            request.user,
            request.randomness
        );
    }
    
    /**
     * @notice Check if a request exists and its status
     * @param _requestId Request ID to check
     * @return exists Whether the request exists
     * @return fulfilled Whether the request is fulfilled
     * @return randomness The randomness if fulfilled
     */
    function getRequestStatus(uint256 _requestId) external view returns (bool exists, bool fulfilled, uint256 randomness) {
        RequestStatus storage request = requests[_requestId];
        if (request.user == address(0)) {
            return (false, false, 0);
        }
        return (true, request.fulfilled, request.randomness);
    }
    
    /**
     * @notice Allow the contract to receive native tokens
     */
    receive() external payable {}
} 