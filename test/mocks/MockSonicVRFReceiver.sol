// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "../../contracts/interfaces/ILayerZeroReceiver.sol";
import "../../contracts/interfaces/ISonicVRFReceiver.sol";

/**
 * @title MockSonicVRFReceiver
 * @dev Mock contract for testing cross-chain VRF functionality
 */
contract MockSonicVRFReceiver is ISonicVRFReceiver, ILayerZeroReceiver {
    // Address of the DragonSwapTrigger contract
    address public dragonSwapTrigger;
    
    // Trusted remote on Arbitrum
    mapping(uint16 => bytes) public trustedRemotes;
    
    // Arbitrum chain ID
    uint16 public arbitrumChainId;
    
    // LayerZero endpoint address
    address public lzEndpoint;
    
    // Simulated stored randomness
    mapping(uint256 => uint256) public randomnessValues;
    
    event RandomnessReceived(uint256 requestId, uint256 randomness);
    event RandomnessRequested(uint256 requestId);
    
    constructor(
        address _dragonSwapTrigger,
        uint16 _arbitrumChainId,
        address _lzEndpoint,
        bytes memory _trustedRemote
    ) {
        dragonSwapTrigger = _dragonSwapTrigger;
        arbitrumChainId = _arbitrumChainId;
        lzEndpoint = _lzEndpoint;
        trustedRemotes[_arbitrumChainId] = _trustedRemote;
    }
    
    function lzReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external override {
        // Verify sender is the LayerZero endpoint
        require(msg.sender == lzEndpoint, "SonicVRFReceiver: Invalid sender");
        
        // Verify source chain is Arbitrum
        require(_srcChainId == arbitrumChainId, "SonicVRFReceiver: Invalid source chain");
        
        // Verify source address is trusted
        require(keccak256(_srcAddress) == keccak256(trustedRemotes[_srcChainId]), 
                "SonicVRFReceiver: Invalid source address");
        
        // Decode the payload to get the request ID and randomness
        (uint256 requestId, uint256 randomness) = abi.decode(_payload, (uint256, uint256));
        
        // Store the randomness
        randomnessValues[requestId] = randomness;
        
        // Call the DragonSwapTrigger
        if (dragonSwapTrigger != address(0)) {
            (bool success, ) = dragonSwapTrigger.call(
                abi.encodeWithSignature(
                    "fulfillRandomness(uint256,uint256)",
                    requestId,
                    randomness
                )
            );
            require(success, "SonicVRFReceiver: Failed to call DragonSwapTrigger");
        }
        
        emit RandomnessReceived(requestId, randomness);
    }
    
    function requestRandomness(uint256 requestId) external override {
        // Only DragonSwapTrigger can call this
        require(msg.sender == dragonSwapTrigger, "SonicVRFReceiver: Unauthorized caller");
        
        // In a real contract, this would send a message to Arbitrum via LayerZero
        // For the mock, we just emit an event
        emit RandomnessRequested(requestId);
    }
    
    function receiveRandomness(uint256 requestId, uint256 randomness) external override {
        randomnessValues[requestId] = randomness;
        
        if (dragonSwapTrigger != address(0)) {
            (bool success, ) = dragonSwapTrigger.call(
                abi.encodeWithSignature(
                    "fulfillRandomness(uint256,uint256)",
                    requestId,
                    randomness
                )
            );
            require(success, "SonicVRFReceiver: Failed to call DragonSwapTrigger");
        }
        
        emit RandomnessReceived(requestId, randomness);
    }
    
    function setDragonChainlinkVRF(address _dragonChainlinkVRF) external override {
        // Not needed for the mock
    }
    
    function setEndpoint(uint16 chainId, address endpoint) external override {
        lzEndpoint = endpoint;
    }
    
    function setDragonSwapTrigger(address _dragonSwapTrigger) external override {
        dragonSwapTrigger = _dragonSwapTrigger;
    }
    
    function setTrustedRemote(uint16 chainId, bytes memory trustedRemote) external {
        trustedRemotes[chainId] = trustedRemote;
    }
} 