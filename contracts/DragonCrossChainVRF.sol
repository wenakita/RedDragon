// SPDX-License-Identifier: MIT

/**
 *   ===================================
 *       DRAGON CROSS-CHAIN VRF
 *   ===================================
 *      Multi-Chain Lottery System
 *   ===================================
 *
 * // "That's my favorite part!" - Isabella (The girl at the massage parlor)
 * // https://x.com/sonicreddragon
 * // https://t.me/sonicreddragon
 */

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/ILayerZeroEndpoint.sol";
import "./interfaces/IDragonToken.sol";
import "./interfaces/IWrappedSonic.sol";
import "./interfaces/IDragonSwapTrigger.sol";
import "./interfaces/ISonicVRFReceiver.sol";

/**
 * @title DragonCrossChainVRF
 * @notice Main integration for the Dragon cross-chain VRF system
 * This contract ties together all components:
 * 1. DragonToken for token operations
 * 2. SonicVRFReceiver for handling randomness from Arbitrum
 * 3. ArbitrumVRFRequester for requesting Chainlink VRF on Arbitrum
 * 4. DragonSwapTrigger for lottery management
 */
contract DragonCrossChainVRF is Ownable, ReentrancyGuard {
    /* ========== STATE VARIABLES ========== */
    
    // Core token addresses
    address public wrappedSonicAddress;
    address public dragonTokenAddress;
    
    // Cross-chain VRF infrastructure
    address public sonicVRFReceiverAddress;
    address public arbitrumVRFRequesterAddress;
    address public dragonSwapTriggerAddress;
    
    // LayerZero endpoint
    address public lzEndpointAddress;
    
    // Chain IDs
    uint16 public ARBITRUM_CHAIN_ID;
    uint16 public SONIC_CHAIN_ID;
    
    // VRF status
    bool public vrfEnabled = true;
    
    /* ========== EVENTS ========== */
    
    event VRFInfrastructureUpdated(
        address sonicVRFReceiver,
        address arbitrumVRFRequester,
        address dragonSwapTrigger
    );
    
    event VRFStatusUpdated(bool enabled);
    
    /* ========== CONSTRUCTOR ========== */
    
    /**
     * @notice Constructor
     * @param _wrappedSonicAddress The address of the Wrapped Sonic token
     * @param _dragonTokenAddress The address of the Dragon token
     * @param _sonicVRFReceiverAddress The address of the SonicVRFReceiver contract
     * @param _arbitrumVRFRequesterAddress The address of the ArbitrumVRFRequester contract
     * @param _dragonSwapTriggerAddress The address of the DragonSwapTrigger contract
     * @param _lzEndpointAddress The address of the LayerZero endpoint
     * @param _arbitrumChainId The Arbitrum chain ID on LayerZero
     * @param _sonicChainId The Sonic chain ID on LayerZero
     */
    constructor(
        address _wrappedSonicAddress,
        address _dragonTokenAddress,
        address _sonicVRFReceiverAddress,
        address _arbitrumVRFRequesterAddress,
        address _dragonSwapTriggerAddress,
        address _lzEndpointAddress,
        uint16 _arbitrumChainId,
        uint16 _sonicChainId
    ) Ownable() {
        require(_wrappedSonicAddress != address(0), "wS cannot be zero address");
        require(_dragonTokenAddress != address(0), "DRAGON cannot be zero address");
        require(_sonicVRFReceiverAddress != address(0), "Receiver cannot be zero address");
        require(_arbitrumVRFRequesterAddress != address(0), "Requester cannot be zero address");
        require(_dragonSwapTriggerAddress != address(0), "Trigger cannot be zero address");
        require(_lzEndpointAddress != address(0), "LZ endpoint cannot be zero address");
        
        wrappedSonicAddress = _wrappedSonicAddress;
        dragonTokenAddress = _dragonTokenAddress;
        sonicVRFReceiverAddress = _sonicVRFReceiverAddress;
        arbitrumVRFRequesterAddress = _arbitrumVRFRequesterAddress;
        dragonSwapTriggerAddress = _dragonSwapTriggerAddress;
        lzEndpointAddress = _lzEndpointAddress;
        ARBITRUM_CHAIN_ID = _arbitrumChainId;
        SONIC_CHAIN_ID = _sonicChainId;
        
        // Configure the connection between components
        _setupConnections();
    }
    
    /* ========== SETUP FUNCTIONS ========== */
    
    /**
     * @notice Set up connections between different components
     */
    function _setupConnections() internal {
        // Set the DragonSwapTrigger on the SonicVRFReceiver
        ISonicVRFReceiver(sonicVRFReceiverAddress).setDragonSwapTrigger(dragonSwapTriggerAddress);
        
        // Set the SonicVRFReceiver on the DragonSwapTrigger
        IDragonSwapTrigger(dragonSwapTriggerAddress).setSonicVRFReceiver(sonicVRFReceiverAddress);
        
        // Set the DragonSwapTrigger on the Dragon token
        IDragonToken(dragonTokenAddress).setSwapTriggerAddress(dragonSwapTriggerAddress);
    }
    
    /* ========== VRF CONTROL ========== */
    
    /**
     * @notice Enable or disable the VRF system
     * @param _enabled Whether to enable the VRF system
     */
    function setVRFEnabled(bool _enabled) external onlyOwner {
        vrfEnabled = _enabled;
        emit VRFStatusUpdated(_enabled);
    }
    
    /**
     * @notice Update the VRF infrastructure
     * @param _sonicVRFReceiverAddress The new SonicVRFReceiver address
     * @param _arbitrumVRFRequesterAddress The new ArbitrumVRFRequester address
     * @param _dragonSwapTriggerAddress The new DragonSwapTrigger address
     */
    function updateVRFInfrastructure(
        address _sonicVRFReceiverAddress,
        address _arbitrumVRFRequesterAddress,
        address _dragonSwapTriggerAddress
    ) external onlyOwner {
        require(_sonicVRFReceiverAddress != address(0), "Receiver cannot be zero address");
        require(_arbitrumVRFRequesterAddress != address(0), "Requester cannot be zero address");
        require(_dragonSwapTriggerAddress != address(0), "Trigger cannot be zero address");
        
        sonicVRFReceiverAddress = _sonicVRFReceiverAddress;
        arbitrumVRFRequesterAddress = _arbitrumVRFRequesterAddress;
        dragonSwapTriggerAddress = _dragonSwapTriggerAddress;
        
        // Reconfigure the connections
        _setupConnections();
        
        emit VRFInfrastructureUpdated(
            _sonicVRFReceiverAddress, 
            _arbitrumVRFRequesterAddress,
            _dragonSwapTriggerAddress
        );
    }
    
    /**
     * @notice Update the LayerZero endpoint
     * @param _lzEndpointAddress The new endpoint address
     */
    function updateLZEndpoint(address _lzEndpointAddress) external onlyOwner {
        require(_lzEndpointAddress != address(0), "Endpoint cannot be zero address");
        lzEndpointAddress = _lzEndpointAddress;
        
        // Update the endpoint in the SonicVRFReceiver
        ISonicVRFReceiver(sonicVRFReceiverAddress).setEndpoint(ARBITRUM_CHAIN_ID, _lzEndpointAddress);
    }
    
    /**
     * @notice Update the win threshold for the lottery
     * @param _winThreshold The new win threshold
     */
    function updateWinThreshold(uint256 _winThreshold) external onlyOwner {
        IDragonSwapTrigger(dragonSwapTriggerAddress).setWinThreshold(_winThreshold);
    }
    
    /**
     * @notice Add funds to the jackpot
     * @param _amount The amount to add
     */
    function addToJackpot(uint256 _amount) external onlyOwner {
        // First approve the DragonSwapTrigger to spend the wS
        IWrappedSonic(wrappedSonicAddress).approve(dragonSwapTriggerAddress, _amount);
        
        // Then add to the jackpot
        IDragonSwapTrigger(dragonSwapTriggerAddress).addToJackpot(_amount);
    }
    
    /**
     * @notice Manual request for randomness (admin only)
     * Use for testing or if the automatic system fails
     */
    function manualRequestRandomness() external onlyOwner {
        require(vrfEnabled, "VRF is disabled");
        
        // Generate a unique request ID
        uint256 requestId = uint256(keccak256(abi.encodePacked(block.timestamp, address(this))));
        
        // Request randomness through the SonicVRFReceiver
        ISonicVRFReceiver(sonicVRFReceiverAddress).requestRandomness(requestId);
    }
    
    /**
     * @notice Receive ETH
     */
    receive() external payable {}
} 