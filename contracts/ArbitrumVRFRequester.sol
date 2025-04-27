// SPDX-License-Identifier: MIT

/**
 *   ================================
 *      ARBITRUM VRF REQUESTER
 *   ================================
 *     Cross-Chain RNG Provider
 *   ================================
 *
 * // "I'll take your ass to Sea World!" - Carter 
 * // https://x.com/sonicreddragon
 * // https://t.me/sonicreddragon
 */

pragma solidity ^0.8.18;

import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/ILayerZeroEndpoint.sol";
import "./interfaces/ILayerZeroReceiver.sol";

/**
 * @title ArbitrumVRFRequester
 * @notice Contract that requests randomness from Chainlink VRF and forwards to Sonic chain
 * @dev Implements Chainlink VRF consumer and LayerZero receiver functionality
 */
contract ArbitrumVRFRequester is VRFConsumerBaseV2, ILayerZeroReceiver, Ownable, ReentrancyGuard {
    /* ========== STATE VARIABLES ========== */
    
    // Chainlink VRF coordinator
    VRFCoordinatorV2Interface public vrfCoordinator;
    
    // Chainlink VRF subscription ID
    uint64 public subscriptionId;
    
    // Chainlink VRF key hash - default to 30 gwei key hash
    bytes32 public keyHash = 0x8472ba59cf7134dfe321f4d61a430c4857e8b19cdd5230b09952a92671c24409;
    
    // LayerZero endpoint
    ILayerZeroEndpoint public lzEndpoint;
    
    // LayerZero Sonic chain ID
    uint16 public sonicChainId;
    
    // Address of the VRF consumer on Sonic
    address public sonicVRFConsumer;
    
    // Number of confirmations to wait before fulfillment
    uint16 public requestConfirmations = 3;
    
    // Number of random words to request
    uint32 public numWords = 1;
    
    // Mapping to track VRF requests
    mapping(uint256 => uint64) public vrfRequestIdToRequestId;
    
    /* ========== EVENTS ========== */
    
    event RandomnessRequested(uint64 indexed requestId, uint256 vrfRequestId);
    event RandomnessFulfilled(uint64 indexed requestId, uint256 randomWord);
    event SonicConsumerUpdated(address indexed sonicConsumer);
    
    /* ========== CONSTRUCTOR ========== */
    
    /**
     * @notice Constructor
     * @param _vrfCoordinator The Chainlink VRF coordinator address
     * @param _subscriptionId The Chainlink VRF subscription ID
     * @param _keyHash The Chainlink VRF key hash
     * @param _lzEndpoint The LayerZero endpoint address
     * @param _sonicChainId The LayerZero chain ID for Sonic
     * @param _sonicVRFConsumer The VRF consumer address on Sonic
     */
    constructor(
        address _vrfCoordinator,
        uint64 _subscriptionId,
        bytes32 _keyHash,
        address _lzEndpoint,
        uint16 _sonicChainId,
        address _sonicVRFConsumer
    ) VRFConsumerBaseV2(_vrfCoordinator) Ownable() {
        vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        lzEndpoint = ILayerZeroEndpoint(_lzEndpoint);
        sonicChainId = _sonicChainId;
        sonicVRFConsumer = _sonicVRFConsumer;
    }
    
    /* ========== LAYERZERO RECEIVER FUNCTIONS ========== */
    
    /**
     * @notice Process message received from LayerZero
     * @dev This function is called when a message is received from Sonic chain
     * @param _srcChainId The source chain ID
     * @param _srcAddress The source address
     * @param _nonce A number that indicates the order of messages
     * @param _payload The message payload
     */
    function lzReceive(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) external override {
        require(msg.sender == address(lzEndpoint), "Only endpoint can call");
        require(_srcChainId == sonicChainId, "Source must be Sonic chain");
        
        // Extract source address from LZ format
        address srcAddress;
        assembly {
            srcAddress := mload(add(_srcAddress, 20))
        }
        
        require(srcAddress == sonicVRFConsumer, "Only trusted consumer can call");
        
        // Decode payload to get the request ID
        uint64 requestId = abi.decode(_payload, (uint64));
        
        // Request randomness from Chainlink VRF
        _requestRandomness(requestId);
    }
    
    /**
     * @notice Request randomness from Chainlink VRF
     * @param requestId The original request ID from Sonic
     */
    function _requestRandomness(uint64 requestId) internal {
        // Request randomness from Chainlink VRF
        uint256 vrfRequestId = vrfCoordinator.requestRandomWords(
            keyHash,
            subscriptionId,
            requestConfirmations,
            500000, // gas limit
            numWords
        );
        
        // Store the mapping between vrfRequestId and requestId
        vrfRequestIdToRequestId[vrfRequestId] = requestId;
        
        emit RandomnessRequested(requestId, vrfRequestId);
    }
    
    /**
     * @notice Callback function called by VRF Coordinator
     * @param vrfRequestId The VRF request ID
     * @param randomWords The random values generated
     */
    function fulfillRandomWords(
        uint256 vrfRequestId,
        uint256[] memory randomWords
    ) internal override {
        // Get the original requestId from Sonic
        uint64 requestId = vrfRequestIdToRequestId[vrfRequestId];
        
        // Only use the first random word
        uint256 randomWord = randomWords[0];
        
        // Forward the randomness to Sonic chain
        _forwardRandomnessToSonic(requestId, randomWord);
        
        emit RandomnessFulfilled(requestId, randomWord);
    }
    
    /**
     * @notice Forward randomness to Sonic chain
     * @param requestId The original request ID
     * @param randomWord The random value to forward
     */
    function _forwardRandomnessToSonic(
        uint64 requestId,
        uint256 randomWord
    ) internal {
        // Encode the payload for LayerZero
        bytes memory payload = abi.encode(requestId, randomWord);
        
        // Get the gas amount needed for the destination chain
        uint16 version = 1;
        uint gasLimit = 200000; // Gas for the receiving function
        bytes memory adapterParams = abi.encodePacked(version, gasLimit);
        
        // Calculate fees for sending message to Sonic
        (uint256 fee, ) = lzEndpoint.estimateFees(
            sonicChainId,
            address(this),
            payload,
            false,
            adapterParams
        );
        
        // Send the message via LayerZero
        lzEndpoint.send{value: fee}(
            sonicChainId,
            abi.encodePacked(sonicVRFConsumer, address(this)),
            payload,
            payable(address(this)),
            address(0x0),
            adapterParams
        );
    }
    
    /* ========== ADMIN FUNCTIONS ========== */
    
    /**
     * @notice Update the VRF configuration
     * @param _coordinator The new VRF coordinator
     * @param _subscriptionId The new subscription ID
     * @param _keyHash The new key hash
     */
    function setVRFConfig(
        address _coordinator,
        uint64 _subscriptionId,
        bytes32 _keyHash
    ) external onlyOwner {
        if (_coordinator != address(0)) {
            vrfCoordinator = VRFCoordinatorV2Interface(_coordinator);
        }
        if (_subscriptionId != 0) {
            subscriptionId = _subscriptionId;
        }
        if (_keyHash != bytes32(0)) {
            keyHash = _keyHash;
        }
    }
    
    /**
     * @notice Update the request configuration
     * @param _confirmations The number of confirmations to wait
     * @param _words The number of random words to request
     */
    function setRequestConfig(
        uint16 _confirmations,
        uint32 _words
    ) external onlyOwner {
        if (_confirmations > 0) {
            requestConfirmations = _confirmations;
        }
        if (_words > 0) {
            numWords = _words;
        }
    }
    
    /**
     * @notice Update the Sonic VRF consumer
     * @param _sonicVRFConsumer The new consumer address on Sonic
     */
    function setSonicVRFConsumer(address _sonicVRFConsumer) external onlyOwner {
        require(_sonicVRFConsumer != address(0), "Consumer cannot be zero address");
        sonicVRFConsumer = _sonicVRFConsumer;
        emit SonicConsumerUpdated(_sonicVRFConsumer);
    }
    
    /**
     * @notice Withdraw ETH from the contract
     * @param to The address to send ETH to
     * @param amount The amount of ETH to withdraw
     */
    function withdrawETH(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot withdraw to zero address");
        require(amount <= address(this).balance, "Insufficient balance");
        
        (bool success, ) = to.call{value: amount}("");
        require(success, "ETH transfer failed");
    }
    
    /**
     * @notice Allow the contract to receive ETH
     */
    receive() external payable {}
} 