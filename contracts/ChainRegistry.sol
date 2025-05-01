// SPDX-License-Identifier: MIT

/**
 *   =============================
 *        CHAIN REGISTRY
 *   =============================
 *   Registry for chain-specific settings
 *   =============================
 *
 * // "Same Dragon, different chains." - Carter
 * // https://x.com/sonicreddragon
 * // https://t.me/sonicreddragon
 */

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IChainRegistry.sol";

/**
 * @title ChainRegistry
 * @dev Implementation of the Chain Registry contract that helps manage chain-specific configurations
 */
contract ChainRegistry is IChainRegistry, Ownable {
    // Storage for chain configurations
    mapping(uint16 => ChainConfig) private chainConfigs;
    uint16[] private supportedChains;
    
    // Current chain ID
    uint16 private immutable currentChainId;
    
    // Events
    event ChainRegistered(uint16 indexed chainId, string chainName, address nativeTokenWrapper, address swapTrigger, address vrfConsumer, address dragonToken);
    event ChainUpdated(uint16 indexed chainId, address nativeTokenWrapper, address swapTrigger, address vrfConsumer, address dragonToken);
    event ChainActiveStatusChanged(uint16 indexed chainId, bool isActive);
    
    /**
     * @dev Constructor
     * @param _currentChainId The current chain ID
     */
    constructor(uint16 _currentChainId) Ownable() {
        currentChainId = _currentChainId;
    }
    
    /**
     * @notice Register a new chain configuration
     * @param _chainId The LayerZero chain ID
     * @param _chainName The human-readable chain name
     * @param _nativeTokenWrapper The wrapped native token address (WETH, WSONIC, etc.)
     * @param _swapTrigger The chain-specific swap trigger address
     * @param _vrfConsumer The chain-specific VRF consumer address
     * @param _dragonToken The Dragon token address on this chain
     */
    function registerChain(
        uint16 _chainId,
        string calldata _chainName,
        address _nativeTokenWrapper,
        address _swapTrigger,
        address _vrfConsumer,
        address _dragonToken
    ) external onlyOwner {
        require(chainConfigs[_chainId].chainId == 0, "Chain already registered");
        require(_nativeTokenWrapper != address(0), "Native token wrapper cannot be zero address");
        require(_dragonToken != address(0), "Dragon token cannot be zero address");
        
        // Create and store chain configuration
        chainConfigs[_chainId] = ChainConfig({
            chainId: _chainId,
            chainName: _chainName,
            nativeTokenWrapper: _nativeTokenWrapper,
            swapTrigger: _swapTrigger,
            vrfConsumer: _vrfConsumer,
            dragonToken: _dragonToken,
            isActive: true // Active by default
        });
        
        // Add to supported chains array
        supportedChains.push(_chainId);
        
        emit ChainRegistered(_chainId, _chainName, _nativeTokenWrapper, _swapTrigger, _vrfConsumer, _dragonToken);
    }
    
    /**
     * @notice Update an existing chain configuration
     * @param _chainId The LayerZero chain ID to update
     * @param _nativeTokenWrapper The wrapped native token address
     * @param _swapTrigger The chain-specific swap trigger address
     * @param _vrfConsumer The chain-specific VRF consumer address
     * @param _dragonToken The Dragon token address on this chain
     */
    function updateChain(
        uint16 _chainId,
        address _nativeTokenWrapper,
        address _swapTrigger,
        address _vrfConsumer,
        address _dragonToken
    ) external onlyOwner {
        require(chainConfigs[_chainId].chainId != 0, "Chain not registered");
        require(_nativeTokenWrapper != address(0), "Native token wrapper cannot be zero address");
        require(_dragonToken != address(0), "Dragon token cannot be zero address");
        
        // Update chain configuration
        chainConfigs[_chainId].nativeTokenWrapper = _nativeTokenWrapper;
        chainConfigs[_chainId].swapTrigger = _swapTrigger;
        chainConfigs[_chainId].vrfConsumer = _vrfConsumer;
        chainConfigs[_chainId].dragonToken = _dragonToken;
        
        emit ChainUpdated(_chainId, _nativeTokenWrapper, _swapTrigger, _vrfConsumer, _dragonToken);
    }
    
    /**
     * @notice Set chain active status
     * @param _chainId The LayerZero chain ID
     * @param _isActive Whether the chain is active
     */
    function setChainActive(uint16 _chainId, bool _isActive) external onlyOwner {
        require(chainConfigs[_chainId].chainId != 0, "Chain not registered");
        
        chainConfigs[_chainId].isActive = _isActive;
        
        emit ChainActiveStatusChanged(_chainId, _isActive);
    }
    
    /**
     * @notice Get chain configuration
     * @param _chainId The LayerZero chain ID
     * @return Chain configuration struct
     */
    function getChainConfig(uint16 _chainId) external view override returns (ChainConfig memory) {
        require(chainConfigs[_chainId].chainId != 0, "Chain not registered");
        
        return chainConfigs[_chainId];
    }
    
    /**
     * @notice Get native token wrapper address for a specific chain
     * @param _chainId The LayerZero chain ID
     * @return The wrapped native token address
     */
    function getNativeTokenWrapper(uint16 _chainId) external view override returns (address) {
        require(chainConfigs[_chainId].chainId != 0, "Chain not registered");
        
        return chainConfigs[_chainId].nativeTokenWrapper;
    }
    
    /**
     * @notice Get swap trigger address for a specific chain
     * @param _chainId The LayerZero chain ID
     * @return The swap trigger address
     */
    function getSwapTrigger(uint16 _chainId) external view override returns (address) {
        require(chainConfigs[_chainId].chainId != 0, "Chain not registered");
        
        return chainConfigs[_chainId].swapTrigger;
    }
    
    /**
     * @notice Get VRF consumer address for a specific chain
     * @param _chainId The LayerZero chain ID
     * @return The VRF consumer address
     */
    function getVRFConsumer(uint16 _chainId) external view override returns (address) {
        require(chainConfigs[_chainId].chainId != 0, "Chain not registered");
        
        return chainConfigs[_chainId].vrfConsumer;
    }
    
    /**
     * @notice Get all supported chain IDs
     * @return Array of supported chain IDs
     */
    function getSupportedChains() external view override returns (uint16[] memory) {
        return supportedChains;
    }
    
    /**
     * @notice Get the chain ID for the current chain
     * @return The current chain ID
     */
    function getCurrentChainId() external view override returns (uint16) {
        return currentChainId;
    }
} 