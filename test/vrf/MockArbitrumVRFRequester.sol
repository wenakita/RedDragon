// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockArbitrumVRFRequester
 * @notice Mock implementation of ArbitrumVRFRequester for testing
 * @dev Simulates the VRF requester contract on Arbitrum that SonicVRFConsumerRead will query
 */
contract MockArbitrumVRFRequester is Ownable {
    // LayerZero variables
    address public lzEndpoint;
    uint16 public sonicChainId;
    address public sonicVRFConsumer;
    
    // VRF configuration variables that will be read by SonicVRFConsumerRead
    uint64 public subscriptionId;
    bytes32 public keyHash;
    uint16 public requestConfirmations = 3;
    uint32 public callbackGasLimit = 500000;
    
    // Request tracking
    mapping(uint64 => uint256) public requestIdToRandomness;
    
    // Events
    event RandomnessRequested(uint64 indexed requestId);
    event RandomnessReceived(uint64 indexed requestId, uint256 randomness);
    event TrustedRemoteSet(uint16 indexed chainId, bytes remote);
    
    /**
     * @notice Constructor
     * @param _lzEndpoint LayerZero endpoint address
     * @param _sonicChainId Sonic chain ID on LayerZero
     */
    constructor(address _lzEndpoint, uint16 _sonicChainId) {
        lzEndpoint = _lzEndpoint;
        sonicChainId = _sonicChainId;
    }
    
    /**
     * @notice Set the trusted remote address for cross-chain messages
     * @param _chainId Chain ID to set the trusted remote for
     * @param _trustedRemote The trusted remote address in bytes
     */
    function setTrustedRemote(uint16 _chainId, bytes memory _trustedRemote) external onlyOwner {
        require(_chainId == sonicChainId, "Invalid chain ID");
        emit TrustedRemoteSet(_chainId, _trustedRemote);
    }
    
    /**
     * @notice Set the Sonic VRF consumer address
     * @param _sonicVRFConsumer Sonic VRF consumer address
     */
    function setSonicVRFConsumer(address _sonicVRFConsumer) external onlyOwner {
        sonicVRFConsumer = _sonicVRFConsumer;
    }
    
    /**
     * @notice Set the subscription ID
     * @param _subscriptionId New subscription ID
     */
    function setSubscriptionId(uint64 _subscriptionId) external onlyOwner {
        subscriptionId = _subscriptionId;
    }
    
    /**
     * @notice Set the key hash
     * @param _keyHash New key hash
     */
    function setKeyHash(bytes32 _keyHash) external onlyOwner {
        keyHash = _keyHash;
    }
    
    /**
     * @notice Set the request confirmations
     * @param _requestConfirmations New request confirmations
     */
    function setRequestConfirmations(uint16 _requestConfirmations) external onlyOwner {
        requestConfirmations = _requestConfirmations;
    }
    
    /**
     * @notice Set the callback gas limit
     * @param _callbackGasLimit New callback gas limit
     */
    function setCallbackGasLimit(uint32 _callbackGasLimit) external onlyOwner {
        callbackGasLimit = _callbackGasLimit;
    }
    
    /**
     * @notice Receive a message from Sonic and generate randomness
     * @param _srcChainId Source chain ID
     * @param _srcAddress Source address
     * @param _nonce Message nonce
     * @param _payload Message payload
     */
    function lzReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external {
        require(msg.sender == lzEndpoint, "Only LZ endpoint");
        require(_srcChainId == sonicChainId, "Invalid source chain");
        
        // Decode payload to get the request ID and user
        (uint64 requestId, address user) = abi.decode(_payload, (uint64, address));
        
        // Mock generating randomness
        uint256 randomness = uint256(keccak256(abi.encodePacked(
            blockhash(block.number - 1),
            requestId,
            user,
            block.timestamp
        )));
        
        // Store randomness for the request
        requestIdToRandomness[requestId] = randomness;
        
        // Encode response with requestId, user, and randomness
        bytes memory responsePayload = abi.encode(requestId, user, randomness);
        
        // Mock sending back to Sonic - in a real implementation, this would use LayerZero
        emit RandomnessReceived(requestId, randomness);
    }
    
    /**
     * @notice Allow the contract to receive ETH for fees
     */
    receive() external payable {}
} 