// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IChainRegistry
 * @dev Interface for the Chain Registry contract that helps manage chain-specific configurations
 */
interface IChainRegistry {
    /**
     * @dev Struct to hold chain-specific configuration
     */
    struct ChainConfig {
        uint16 chainId;
        string chainName;
        address nativeTokenWrapper;    // WETH, WSONIC, etc.
        address swapTrigger;           // Chain-specific swap trigger implementation
        address vrfConsumer;           // Chain-specific VRF consumer
        address dragonToken;           // Dragon token address on this chain
        bool isActive;                 // Whether this chain is active
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
    ) external;
    
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
    ) external;
    
    /**
     * @notice Set chain active status
     * @param _chainId The LayerZero chain ID
     * @param _isActive Whether the chain is active
     */
    function setChainActive(uint16 _chainId, bool _isActive) external;
    
    /**
     * @notice Get chain configuration
     * @param _chainId The LayerZero chain ID
     * @return Chain configuration struct
     */
    function getChainConfig(uint16 _chainId) external view returns (ChainConfig memory);
    
    /**
     * @notice Get native token wrapper address for a specific chain
     * @param _chainId The LayerZero chain ID
     * @return The wrapped native token address
     */
    function getNativeTokenWrapper(uint16 _chainId) external view returns (address);
    
    /**
     * @notice Get swap trigger address for a specific chain
     * @param _chainId The LayerZero chain ID
     * @return The swap trigger address
     */
    function getSwapTrigger(uint16 _chainId) external view returns (address);
    
    /**
     * @notice Get VRF consumer address for a specific chain
     * @param _chainId The LayerZero chain ID
     * @return The VRF consumer address
     */
    function getVRFConsumer(uint16 _chainId) external view returns (address);
    
    /**
     * @notice Get all supported chain IDs
     * @return Array of supported chain IDs
     */
    function getSupportedChains() external view returns (uint16[] memory);
    
    /**
     * @notice Get the chain ID for the current chain
     * @return The current chain ID
     */
    function getCurrentChainId() external view returns (uint16);
} 