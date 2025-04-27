// SPDX-License-Identifier: MIT

/**
 *   ===============================
 *       SONIC VRF RECEIVER
 *   ===============================
 *      Cross-Chain Randomness
 *   ===============================
 *
 * // "I'll slap you so hard your ancestors will feel it!" - Carter
 * // https://x.com/sonicreddragon
 * // https://t.me/sonicreddragon
 */

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/ISonicVRFReceiver.sol";
import "./interfaces/ILayerZeroReceiver.sol";
import "./interfaces/IDragonChainlinkVRF.sol";
import "./interfaces/ILayerZeroEndpoint.sol";
import "./interfaces/IDragonSwapTrigger.sol";

/**
 * @title SonicVRFReceiver
 * @notice Contract that receives randomness from Arbitrum via LayerZero
 * This contract is responsible for:
 * 1. Receiving randomness from the Arbitrum chain via LayerZero
 * 2. Forwarding the randomness to the DragonSwapTrigger contract 
 *    or the DragonChainlinkVRF contract (legacy support)
 */
contract SonicVRFReceiver is ISonicVRFReceiver, ILayerZeroReceiver, Ownable, ReentrancyGuard {
    /* ========== STATE VARIABLES ========== */
    
    // Legacy support for DragonChainlinkVRF
    address public dragonChainlinkVRF;
    
    // New lottery trigger
    address public dragonSwapTrigger;
    
    // Mapping of chain ID to LayerZero endpoint
    mapping(uint16 => address) public endpoints;
    
    // Arbitrum chain ID on LayerZero
    uint16 public arbitrumChainId;
    
    // Trusted remote addresses (chainId => source contract)
    mapping(uint16 => bytes) public trustedRemotes;
    
    /* ========== CONSTRUCTOR ========== */
    
    /**
     * @notice Constructor
     * @param _dragonChainlinkVRF The address of the DragonChainlinkVRF contract
     * @param _arbitrumChainId The Arbitrum chain ID
     * @param _endpoint The LayerZero endpoint address for the Arbitrum chain
     * @param _trustedRemote The trusted remote address on Arbitrum
     */
    constructor(
        address _dragonChainlinkVRF,
        uint16 _arbitrumChainId,
        address _endpoint,
        bytes memory _trustedRemote
    ) Ownable() {
        require(_dragonChainlinkVRF != address(0), "Dragon VRF cannot be zero address");
        require(_endpoint != address(0), "Endpoint cannot be zero address");
        require(_trustedRemote.length > 0, "Trusted remote cannot be empty");
        
        dragonChainlinkVRF = _dragonChainlinkVRF;
        arbitrumChainId = _arbitrumChainId;
        endpoints[_arbitrumChainId] = _endpoint;
        trustedRemotes[_arbitrumChainId] = _trustedRemote;
        
        emit DragonChainlinkVRFUpdated(address(0), _dragonChainlinkVRF);
        emit EndpointSet(_arbitrumChainId, _endpoint);
    }
    
    /* ========== LAYERZERO RECEIVER FUNCTIONS ========== */
    
    /**
     * @notice Handle incoming messages from LayerZero
     * @param _srcChainId The source chain ID
     * @param _srcAddress The source address
     * @param _nonce The message nonce
     * @param _payload The message payload
     */
    function lzReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external override(ILayerZeroReceiver, ISonicVRFReceiver) {
        // Verify sender is the LayerZero endpoint
        require(msg.sender == endpoints[_srcChainId], "SonicVRFReceiver: Invalid sender");
        
        // Verify source chain is Arbitrum
        require(_srcChainId == arbitrumChainId, "SonicVRFReceiver: Invalid source chain");
        
        // Verify source address is trusted
        require(keccak256(_srcAddress) == keccak256(trustedRemotes[_srcChainId]), 
                "SonicVRFReceiver: Invalid source address");
        
        // Decode the payload to get the request ID and randomness
        (uint256 requestId, uint256 randomness) = abi.decode(_payload, (uint256, uint256));
        
        // Forward the randomness
        _processRandomness(requestId, randomness);
        
        emit RandomnessReceived(requestId, randomness);
    }
    
    /**
     * @notice Process randomness by forwarding it to the appropriate contract
     * @param requestId The ID of the request
     * @param randomness The random value
     */
    function _processRandomness(uint256 requestId, uint256 randomness) internal {
        // If new lottery contract is set, forward to it first
        if (dragonSwapTrigger != address(0)) {
            IDragonSwapTrigger(dragonSwapTrigger).fulfillRandomness(requestId, randomness);
        }
        
        // Legacy support for DragonChainlinkVRF
        if (dragonChainlinkVRF != address(0)) {
            IDragonChainlinkVRF(dragonChainlinkVRF).fulfillRandomness(requestId, randomness);
        }
    }
    
    /**
     * @notice Receive randomness directly (for testing or manual submission)
     * @param requestId The ID of the request
     * @param randomness The random value
     */
    function receiveRandomness(uint256 requestId, uint256 randomness) external override onlyOwner {
        _processRandomness(requestId, randomness);
        emit RandomnessReceived(requestId, randomness);
    }
    
    /**
     * @notice Request randomness from Arbitrum
     * @param requestId The ID of the request
     */
    function requestRandomness(uint256 requestId) external override {
        // Only the DragonSwapTrigger can call this function
        require(msg.sender == dragonSwapTrigger, "SonicVRFReceiver: Unauthorized caller");
        require(endpoints[arbitrumChainId] != address(0), "SonicVRFReceiver: Endpoint not set");
        
        // Create the LayerZero message
        bytes memory payload = abi.encode(requestId);
        
        // Estimate the fee
        (uint256 fee,) = ILayerZeroEndpoint(endpoints[arbitrumChainId]).estimateFees(
            arbitrumChainId,
            address(this),
            payload,
            false,
            bytes("")
        );
        
        // Send the message to Arbitrum
        ILayerZeroEndpoint(endpoints[arbitrumChainId]).send{value: fee}(
            arbitrumChainId,
            trustedRemotes[arbitrumChainId],
            payload,
            payable(address(this)),
            address(0),
            bytes("")
        );
    }
    
    /* ========== ADMIN FUNCTIONS ========== */
    
    /**
     * @notice Set the DragonChainlinkVRF contract address
     * @param _dragonChainlinkVRF The address of the DragonChainlinkVRF contract
     */
    function setDragonChainlinkVRF(address _dragonChainlinkVRF) external override onlyOwner {
        address oldAddress = dragonChainlinkVRF;
        dragonChainlinkVRF = _dragonChainlinkVRF;
        emit DragonChainlinkVRFUpdated(oldAddress, _dragonChainlinkVRF);
    }
    
    /**
     * @notice Set the DragonSwapTrigger contract address
     * @param _dragonSwapTrigger The address of the DragonSwapTrigger contract
     */
    function setDragonSwapTrigger(address _dragonSwapTrigger) external onlyOwner {
        dragonSwapTrigger = _dragonSwapTrigger;
    }
    
    /**
     * @notice Set the endpoint for a specific chain
     * @param chainId The chain ID
     * @param endpoint The endpoint address
     */
    function setEndpoint(uint16 chainId, address endpoint) external override onlyOwner {
        require(endpoint != address(0), "SonicVRFReceiver: Invalid endpoint");
        endpoints[chainId] = endpoint;
        emit EndpointSet(chainId, endpoint);
    }
    
    /**
     * @notice Set the trusted remote address for a chain
     * @param chainId The chain ID
     * @param trustedRemote The trusted remote address
     */
    function setTrustedRemote(uint16 chainId, bytes memory trustedRemote) external onlyOwner {
        require(trustedRemote.length > 0, "SonicVRFReceiver: Invalid trusted remote");
        trustedRemotes[chainId] = trustedRemote;
    }
    
    /**
     * @notice Withdraw ETH from the contract
     * @param to The address to withdraw to
     * @param amount The amount to withdraw
     */
    function withdrawETH(address payable to, uint256 amount) external onlyOwner {
        require(to != address(0), "SonicVRFReceiver: Invalid address");
        require(amount <= address(this).balance, "SonicVRFReceiver: Insufficient balance");
        to.transfer(amount);
    }
    
    /**
     * @notice Receive ETH
     */
    receive() external payable {}
} 