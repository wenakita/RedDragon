// SPDX-License-Identifier: MIT

/**
 *   ===============================
 *        SONIC VRF CONSUMER
 *   ===============================
 *       Randomness Generation
 *   ===============================
 *
 * // "Put your hands up, let me see those golden nuggets!" - Carter
 * // https://x.com/sonicreddragon
 * // https://t.me/sonicreddragon
 */

pragma solidity ^0.8.18;

import "../interfaces/ILayerZeroEndpoint.sol";
import "../interfaces/ILayerZeroReceiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SonicVRFConsumer
 * @notice Contract on the Sonic chain that initiates VRF requests through LayerZero
 * @dev This contract initiates the request to Arbitrum's VRF request contract and
 *      processes the resulting random number
 */
contract SonicVRFConsumer is ILayerZeroReceiver, Ownable {
    // LayerZero endpoint
    ILayerZeroEndpoint public lzEndpoint;
    
    // Token addresses
    address public wrappedSonic; // wS token
    address public dragonToken; // DRAGON token
    
    // Arbitrum chain ID in LayerZero (this will be replaced with the actual ID)
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
    
    // Event emitted when a VRF request is initiated
    event VRFRequested(uint64 indexed requestId, address indexed user);
    
    // Event emitted when randomness is received
    event RandomnessReceived(uint64 indexed requestId, uint256 randomness);
    
    // Event emitted when lottery is won
    event JackpotWon(address indexed winner, uint256 amount);
    
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
     * @notice Receive randomness from Arbitrum
     * @dev Called by LayerZero endpoint when a message is received
     * @param _srcChainId The source chain ID
     * @param _srcAddress The source address
     * @param _nonce The message nonce
     * @param _payload The payload containing the random number
     */
    function lzReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external override {
        require(msg.sender == address(lzEndpoint), "Only LayerZero endpoint can call");
        require(_srcChainId == arbitrumChainId, "Only Arbitrum chain can send randomness");
        
        // Extract source address
        address srcAddress;
        assembly {
            srcAddress := mload(add(_srcAddress.offset, 20))
        }
        require(srcAddress == arbitrumVRFRequester, "Only VRF requester can send randomness");
        
        // Decode payload
        (uint64 requestId, uint256 randomValue) = abi.decode(_payload, (uint64, uint256));
        
        // Get user address associated with this request
        address user = requestToUser[requestId];
        require(user != address(0), "Unknown request ID");
        
        // Process randomness
        processRandomness(requestId, user, randomValue);
        
        emit RandomnessReceived(requestId, randomValue);
    }
    
    /**
     * @notice Process the received randomness
     * @param requestId The request ID
     * @param user The user who initiated the request
     * @param randomValue The random value received
     */
    function processRandomness(uint64 requestId, address user, uint256 randomValue) internal {
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
     * @notice Receive ETH for gas fees
     */
    receive() external payable {}
} 