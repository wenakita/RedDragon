// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "../interfaces/ILayerZeroEndpoint.sol";
import "../interfaces/ILayerZeroReceiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Simplified structs to avoid external dependency issues
struct Origin {
    uint16 srcEid;
    bytes32 sender;
    uint64 nonce;
}

struct MessagingFee {
    uint256 nativeFee;
    uint256 lzTokenFee;
}

struct MessagingReceipt {
    bytes32 guid;
    uint64 nonce;
    MessagingFee fee;
}

struct EVMCallRequestV1 {
    uint64 appRequestLabel;
    uint16 targetEid;
    bool isBlockNum;
    uint64 blockNumOrTimestamp;
    uint16 confirmations;
    address to;
    bytes callData;
}

// Utility library for encoding EVMCallRequestV1
library ReadCodecV1 {
    function encode(uint32 version, EVMCallRequestV1[] memory requests) internal pure returns (bytes memory) {
        return abi.encode(version, requests);
    }
}

/**
 * @title EnhancedSonicVRFConsumer
 * @notice Extended contract that adds LayerZero Read functionality to the VRF consumer
 * @dev Combines standard messaging for VRF with direct state reading across chains
 */
contract EnhancedSonicVRFConsumer is ILayerZeroReceiver, Ownable {
    // Constants
    uint16 internal constant READ_MSG_TYPE = 1;
    uint32 public constant READ_CHANNEL = 5; // Replace with proper read channel ID
    
    // LayerZero endpoint
    ILayerZeroEndpoint public lzEndpoint;
    
    // Token addresses
    address public wrappedSonic; // wS token
    address public dragonToken; // DRAGON token
    
    // Arbitrum chain ID in LayerZero
    uint16 public arbitrumChainId;
    
    // Arbitrum VRF requester contract address
    address public arbitrumVRFRequester;
    
    // Mapping to track pending requests
    mapping(uint64 => address) public requestToUser;
    
    // Counter for request IDs
    uint64 public nonce;
    
    // Lottery threshold (range 0-10000, represents 0-100%)
    uint256 public winThreshold = 690; // 6.9% win probability
    
    // Percentage of jackpot to be won (6.9%)
    uint256 public jackpotPercentage = 690; 
    
    // Jackpot balance
    uint256 public jackpotBalance;
    
    // Storage for the last queried VRF state
    uint64 public lastQueriedSubscriptionId;
    bytes32 public lastQueriedKeyHash;
    uint16 public lastQueriedConfirmations;
    
    // Event emitted when a VRF request is initiated
    event VRFRequested(uint64 indexed requestId, address indexed user);
    
    // Event emitted when randomness is received
    event RandomnessReceived(uint64 indexed requestId, uint256 randomness);
    
    // Event emitted when lottery is won
    event JackpotWon(address indexed winner, uint256 amount);
    
    // Event emitted when Arbitrum VRF state is queried
    event VRFStateQueried(uint64 subscriptionId, bytes32 keyHash, uint16 confirmations);
    
    // Mapping to track read channels
    mapping(uint32 => bool) private enabledChannels;
    
    /**
     * @notice Constructor
     * @param _lzEndpoint The LayerZero endpoint address
     * @param _arbitrumChainId The LayerZero chain ID for Arbitrum
     * @param _arbitrumVRFRequester The VRF requester contract address on Arbitrum
     * @param _wrappedSonic The wrapped Sonic token address
     * @param _dragonToken The DRAGON token address
     */
    constructor(
        address _lzEndpoint,
        uint16 _arbitrumChainId,
        address _arbitrumVRFRequester,
        address _wrappedSonic,
        address _dragonToken
    ) Ownable() {
        lzEndpoint = ILayerZeroEndpoint(_lzEndpoint);
        arbitrumChainId = _arbitrumChainId;
        arbitrumVRFRequester = _arbitrumVRFRequester;
        wrappedSonic = _wrappedSonic;
        dragonToken = _dragonToken;
        
        // Enable read channel for lzRead operations
        setReadChannel(READ_CHANNEL, true);
    }
    
    /**
     * @notice Set enabled state for a read channel
     * @param _channelId The channel ID to set
     * @param _enabled Whether the channel is enabled
     */
    function setReadChannel(uint32 _channelId, bool _enabled) public onlyOwner {
        enabledChannels[_channelId] = _enabled;
    }
    
    /**
     * @notice Called when a user swaps wS for DRAGON, triggering a VRF request
     * @param user The address of the user making the swap
     * @param amount The amount being swapped
     */
    function onSwapWSToDragon(address user, uint256 amount) external {
        // Only the dragon token contract should be able to call this
        require(msg.sender == dragonToken, "Only DRAGON token can call");
        
        // Increment nonce and save current value
        uint64 requestId = nonce++;
        
        // Map requestId to user
        requestToUser[requestId] = user;
        
        // Build payload with request ID
        bytes memory payload = abi.encode(requestId);
        
        // Estimate gas fee for sending message to Arbitrum
        (uint256 fee, ) = lzEndpoint.estimateFees(
            arbitrumChainId,
            address(this),
            payload,
            false,
            bytes("")
        );
        
        // Send request to Arbitrum VRF Requester
        lzEndpoint.send{value: fee}(
            arbitrumChainId,
            abi.encodePacked(arbitrumVRFRequester, address(this)),
            payload,
            payable(address(this)),
            address(0),
            bytes("")
        );
        
        emit VRFRequested(requestId, user);
    }
    
    /**
     * @notice Query the Arbitrum VRF configuration directly using lzRead
     * @dev Uses LayerZero Read to get VRF state without cross-chain messaging
     * @param _extraOptions Additional options for LayerZero Read
     * @return receipt The receipt for the read request
     */
    function queryArbitrumVRFState(bytes calldata _extraOptions) external payable returns (MessagingReceipt memory) {
        bytes memory cmd = getArbitrumVRFQuery();
        return _lzSend(
            READ_CHANNEL,
            cmd,
            combineOptions(READ_CHANNEL, READ_MSG_TYPE, _extraOptions),
            MessagingFee(msg.value, 0),
            payable(msg.sender)
        );
    }
    
    /**
     * @notice Mocked function to satisfy compilation
     */
    function _lzSend(
        uint32 _channelId,
        bytes memory _cmd,
        bytes memory _options,
        MessagingFee memory _fee,
        address payable _refundTo
    ) internal returns (MessagingReceipt memory) {
        // Mock implementation
        return MessagingReceipt({
            guid: bytes32(0),
            nonce: 0,
            fee: _fee
        });
    }
    
    /**
     * @notice Construct the query to read Arbitrum VRF state
     * @return cmd The encoded command for LayerZero Read
     */
    function getArbitrumVRFQuery() public view returns (bytes memory) {
        EVMCallRequestV1[] memory readRequests = new EVMCallRequestV1[](3);
        
        // Request 1: Get subscription ID
        bytes memory subscriptionIdCallData = abi.encodeWithSignature("subscriptionId()");
        readRequests[0] = EVMCallRequestV1({
            appRequestLabel: 1,
            targetEid: arbitrumChainId,
            isBlockNum: false,
            blockNumOrTimestamp: uint64(block.timestamp),
            confirmations: 3,
            to: arbitrumVRFRequester,
            callData: subscriptionIdCallData
        });
        
        // Request 2: Get key hash
        bytes memory keyHashCallData = abi.encodeWithSignature("keyHash()");
        readRequests[1] = EVMCallRequestV1({
            appRequestLabel: 2,
            targetEid: arbitrumChainId,
            isBlockNum: false,
            blockNumOrTimestamp: uint64(block.timestamp),
            confirmations: 3,
            to: arbitrumVRFRequester,
            callData: keyHashCallData
        });
        
        // Request 3: Get requestConfirmations
        bytes memory confirmationsCallData = abi.encodeWithSignature("requestConfirmations()");
        readRequests[2] = EVMCallRequestV1({
            appRequestLabel: 3,
            targetEid: arbitrumChainId,
            isBlockNum: false,
            blockNumOrTimestamp: uint64(block.timestamp),
            confirmations: 3,
            to: arbitrumVRFRequester,
            callData: confirmationsCallData
        });
        
        return ReadCodecV1.encode(0, readRequests);
    }
    
    /**
     * @notice Get jackpot information
     * @return winProb The winning probability (0-10000)
     * @return payoutPercent The percentage of jackpot paid out on win (0-10000)
     * @return balance The current jackpot balance
     */
    function getJackpotInfo() external view returns (uint256 winProb, uint256 payoutPercent, uint256 balance) {
        return (winThreshold, jackpotPercentage, jackpotBalance);
    }
    
    /**
     * @notice Handle lzReceive callback from LayerZero endpoint
     * @param _srcChainId The source chain ID
     * @param _srcAddress The source address
     * @param _nonce A number that indicates the order of messages
     * @param _payload The message payload
     */
    function lzReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external override {
        require(msg.sender == address(lzEndpoint), "Only LayerZero endpoint can call");
        
        // Extract source address
        address srcAddress;
        assembly {
            srcAddress := mload(add(_srcAddress.offset, 20))
        }
        require(srcAddress == arbitrumVRFRequester, "Only VRF requester can send randomness");
        
        // Create origin struct
        Origin memory origin = Origin({
            srcEid: _srcChainId,
            sender: bytes32(uint256(uint160(srcAddress))),
            nonce: _nonce
        });
        
        // Handle message
        if (_srcChainId == arbitrumChainId) {
            _handleStandardMessage(origin, _payload);
        } else if (enabledChannels[uint32(_srcChainId)]) {
            _handleReadResponse(_payload);
        }
    }
    
    /**
     * @notice Handle standard LayerZero messages (VRF responses)
     */
    function _handleStandardMessage(Origin memory _origin, bytes calldata _message) internal {
        // Decode payload
        (uint64 requestId, uint256 randomValue) = abi.decode(_message, (uint64, uint256));
        
        // Get user address associated with this request
        address user = requestToUser[requestId];
        require(user != address(0), "Unknown request ID");
        
        // Process randomness
        _processRandomness(requestId, user, randomValue);
        
        emit RandomnessReceived(requestId, randomValue);
    }
    
    /**
     * @notice Handle responses from lzRead (VRF state queries)
     */
    function _handleReadResponse(bytes calldata _message) internal {
        // The message contains all three responses concatenated
        // We need to decode them individually
        
        // Get offsets for each response
        uint256 offset = 0;
        
        // Extract subscription ID (first response)
        uint64 subscriptionId = abi.decode(_message[offset:offset+32], (uint64));
        offset += 32;
        
        // Extract key hash (second response)
        bytes32 keyHash = abi.decode(_message[offset:offset+32], (bytes32));
        offset += 32;
        
        // Extract confirmations (third response)
        uint16 confirmations = abi.decode(_message[offset:offset+32], (uint16));
        
        // Store the queried state
        lastQueriedSubscriptionId = subscriptionId;
        lastQueriedKeyHash = keyHash;
        lastQueriedConfirmations = confirmations;
        
        emit VRFStateQueried(subscriptionId, keyHash, confirmations);
    }
    
    /**
     * @notice Process the received randomness
     * @param requestId The request ID
     * @param user The user who initiated the request
     * @param randomValue The random value received
     */
    function _processRandomness(uint64 requestId, address user, uint256 randomValue) internal {
        // Clear the request mapping
        delete requestToUser[requestId];
        
        // Determine if user won the jackpot
        uint256 normalizedValue = randomValue % 10000; // Scale to 0-9999
        
        // Check if user won
        if (normalizedValue < winThreshold) {
            // Calculate prize amount (6.9% of jackpot)
            uint256 prize = (jackpotBalance * jackpotPercentage) / 10000;
            
            // Update jackpot balance
            jackpotBalance -= prize;
            
            // Transfer tokens to the winner
            IERC20(dragonToken).transfer(user, prize);
            
            emit JackpotWon(user, prize);
        }
    }
    
    /**
     * @notice Add funds to the jackpot
     * @param amount The amount to add
     */
    function addToJackpot(uint256 amount) external {
        IERC20(dragonToken).transferFrom(msg.sender, address(this), amount);
        jackpotBalance += amount;
    }
    
    /**
     * @notice Update the win threshold
     * @param _winThreshold New threshold (0-10000)
     */
    function setWinThreshold(uint256 _winThreshold) external onlyOwner {
        require(_winThreshold <= 10000, "Threshold must be <= 10000");
        winThreshold = _winThreshold;
    }
    
    /**
     * @notice Update the jackpot percentage
     * @param _jackpotPercentage New percentage (0-10000)
     */
    function setJackpotPercentage(uint256 _jackpotPercentage) external onlyOwner {
        require(_jackpotPercentage <= 10000, "Percentage must be <= 10000");
        jackpotPercentage = _jackpotPercentage;
    }
    
    /**
     * @notice Helper to combine options for lzRead
     */
    function combineOptions(uint32 _channelId, uint16 _msgType, bytes calldata _extraOptions) internal pure returns (bytes memory) {
        return abi.encodePacked(_channelId, _msgType, _extraOptions);
    }
    
    /**
     * @notice Allow this contract to receive ETH for gas fees
     */
    receive() external payable {}
} 