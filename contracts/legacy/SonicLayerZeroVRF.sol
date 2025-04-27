// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../interfaces/ILayerZeroEndpoint.sol";
import "../interfaces/ILayerZeroReceiver.sol";
import "../interfaces/IVRFConsumer.sol";

/**
 * @title SonicLayerZeroVRF
 * @notice Contract that sends randomness requests to Arbitrum via LayerZero and receives results
 * @dev Implements LayerZero sender and receiver functionality
 */
contract SonicLayerZeroVRF is ILayerZeroReceiver, Ownable, ReentrancyGuard {
    /* ========== STATE VARIABLES ========== */
    
    // LayerZero endpoint on Sonic
    ILayerZeroEndpoint public lzEndpoint;
    
    // LayerZero Arbitrum chain ID
    uint16 public arbitrumChainId;
    
    // Address of the VRF requester on Arbitrum
    address public arbitrumVRFRequester;
    
    // Counter for request IDs
    uint64 public requestIdCounter;
    
    // Mapping from request ID to consumer address
    mapping(uint64 => address) public consumers;
    
    // Mapping to track if a request has been fulfilled
    mapping(uint64 => bool) public fulfilled;
    
    // Gas amount to send with LayerZero messages
    uint256 public gasAmount = 200000;
    
    /* ========== EVENTS ========== */
    
    event RandomnessRequested(address indexed consumer, uint64 indexed requestId);
    event RandomnessFulfilled(uint64 indexed requestId, uint256 randomWord);
    event ArbitrumRequesterUpdated(address indexed arbitrumRequester);
    event GasAmountUpdated(uint256 gasAmount);
    
    /* ========== CONSTRUCTOR ========== */
    
    /**
     * @notice Constructor
     * @param _lzEndpoint The LayerZero endpoint address on Sonic
     * @param _arbitrumChainId The LayerZero chain ID for Arbitrum
     * @param _arbitrumVRFRequester The VRF requester address on Arbitrum
     */
    constructor(
        address _lzEndpoint,
        uint16 _arbitrumChainId,
        address _arbitrumVRFRequester
    ) Ownable() {
        lzEndpoint = ILayerZeroEndpoint(_lzEndpoint);
        arbitrumChainId = _arbitrumChainId;
        arbitrumVRFRequester = _arbitrumVRFRequester;
    }
    
    /* ========== EXTERNAL FUNCTIONS ========== */
    
    /**
     * @notice Request randomness from Arbitrum's Chainlink VRF
     * @dev Can only be called by registered consumers
     * @return requestId The ID of the randomness request
     */
    function requestRandomness() external payable returns (uint64) {
        // Increment the request counter
        requestIdCounter++;
        uint64 requestId = requestIdCounter;
        
        // Store the consumer for this request
        consumers[requestId] = msg.sender;
        
        // Mark request as unfulfilled
        fulfilled[requestId] = false;
        
        // Send request to Arbitrum
        _sendRequestToArbitrum(requestId);
        
        emit RandomnessRequested(msg.sender, requestId);
        
        return requestId;
    }
    
    /**
     * @notice Internal function to send request to Arbitrum
     * @param requestId The ID of the randomness request
     */
    function _sendRequestToArbitrum(uint64 requestId) internal {
        // Encode the request ID in the payload
        bytes memory payload = abi.encode(requestId);
        
        // Get the gas amount needed for the destination chain
        uint16 version = 1;
        bytes memory adapterParams = abi.encodePacked(version, gasAmount);
        
        // Calculate fees for sending message to Arbitrum
        (uint256 fee, ) = lzEndpoint.estimateFees(
            arbitrumChainId,
            address(this),
            payload,
            false,
            adapterParams
        );
        
        // Ensure enough ETH was provided
        require(msg.value >= fee, "Insufficient ETH for cross-chain message");
        
        // Send the message via LayerZero
        lzEndpoint.send{value: fee}(
            arbitrumChainId,
            abi.encodePacked(arbitrumVRFRequester, address(this)),
            payload,
            payable(address(this)),
            address(0x0),
            adapterParams
        );
        
        // Refund excess ETH if any
        uint256 excess = msg.value - fee;
        if (excess > 0) {
            (bool success, ) = payable(msg.sender).call{value: excess}("");
            require(success, "ETH refund failed");
        }
    }
    
    /* ========== LAYERZERO RECEIVER FUNCTIONS ========== */
    
    /**
     * @notice Process message received from LayerZero
     * @dev This function is called when a message is received from Arbitrum
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
        require(_srcChainId == arbitrumChainId, "Source must be Arbitrum chain");
        
        // Extract source address from LZ format
        address srcAddress;
        assembly {
            srcAddress := mload(add(_srcAddress, 20))
        }
        
        require(srcAddress == arbitrumVRFRequester, "Only trusted requester can call");
        
        // Decode payload to get request ID and random word
        (uint64 requestId, uint256 randomWord) = abi.decode(_payload, (uint64, uint256));
        
        // Ensure this request hasn't been fulfilled
        require(!fulfilled[requestId], "Request already fulfilled");
        
        // Mark as fulfilled
        fulfilled[requestId] = true;
        
        // Get the consumer for this request
        address consumer = consumers[requestId];
        
        // Forward randomness to the consumer
        IVRFConsumer(consumer).fulfillRandomWords(requestId, randomWord);
        
        emit RandomnessFulfilled(requestId, randomWord);
    }
    
    /* ========== ADMIN FUNCTIONS ========== */
    
    /**
     * @notice Update the Arbitrum VRF requester
     * @param _arbitrumVRFRequester The new requester address on Arbitrum
     */
    function setArbitrumVRFRequester(address _arbitrumVRFRequester) external onlyOwner {
        require(_arbitrumVRFRequester != address(0), "Requester cannot be zero address");
        arbitrumVRFRequester = _arbitrumVRFRequester;
        emit ArbitrumRequesterUpdated(_arbitrumVRFRequester);
    }
    
    /**
     * @notice Update the gas amount for LayerZero messages
     * @param _gasAmount The new gas amount
     */
    function setGasAmount(uint256 _gasAmount) external onlyOwner {
        require(_gasAmount > 0, "Gas amount must be greater than zero");
        gasAmount = _gasAmount;
        emit GasAmountUpdated(_gasAmount);
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