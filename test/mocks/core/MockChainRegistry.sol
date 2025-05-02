// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockChainRegistry
 * @dev Mock Chain Registry for testing
 */
contract MockChainRegistry {
    struct ChainConfig {
        string chainName;
        address nativeTokenWrapper;
        address swapTrigger;
        address vrfConsumer;
        address dragonToken;
    }
    
    mapping(uint16 => ChainConfig) public chainConfigs;
    
    /**
     * @notice Register a chain
     * @param _chainId Chain ID
     * @param _chainName Chain name
     * @param _nativeTokenWrapper Native token wrapper address
     * @param _swapTrigger Swap trigger address
     * @param _vrfConsumer VRF consumer address
     * @param _dragonToken Dragon token address
     */
    function registerChain(
        uint16 _chainId,
        string memory _chainName,
        address _nativeTokenWrapper,
        address _swapTrigger,
        address _vrfConsumer,
        address _dragonToken
    ) external {
        chainConfigs[_chainId] = ChainConfig({
            chainName: _chainName,
            nativeTokenWrapper: _nativeTokenWrapper,
            swapTrigger: _swapTrigger,
            vrfConsumer: _vrfConsumer,
            dragonToken: _dragonToken
        });
    }
    
    /**
     * @notice Update chain configuration
     * @param _chainId Chain ID
     * @param _nativeTokenWrapper Native token wrapper address
     * @param _swapTrigger Swap trigger address
     * @param _vrfConsumer VRF consumer address
     * @param _dragonToken Dragon token address
     */
    function updateChain(
        uint16 _chainId,
        address _nativeTokenWrapper,
        address _swapTrigger,
        address _vrfConsumer,
        address _dragonToken
    ) external {
        ChainConfig storage config = chainConfigs[_chainId];
        
        if (_nativeTokenWrapper != address(0)) {
            config.nativeTokenWrapper = _nativeTokenWrapper;
        }
        
        if (_swapTrigger != address(0)) {
            config.swapTrigger = _swapTrigger;
        }
        
        if (_vrfConsumer != address(0)) {
            config.vrfConsumer = _vrfConsumer;
        }
        
        if (_dragonToken != address(0)) {
            config.dragonToken = _dragonToken;
        }
    }
    
    /**
     * @notice Get native token wrapper address
     * @param _chainId Chain ID
     * @return Native token wrapper address
     */
    function getNativeTokenWrapper(uint16 _chainId) external view returns (address) {
        return chainConfigs[_chainId].nativeTokenWrapper;
    }
    
    /**
     * @notice Get swap trigger address
     * @param _chainId Chain ID
     * @return Swap trigger address
     */
    function getSwapTrigger(uint16 _chainId) external view returns (address) {
        return chainConfigs[_chainId].swapTrigger;
    }
    
    /**
     * @notice Get VRF consumer address
     * @param _chainId Chain ID
     * @return VRF consumer address
     */
    function getVRFConsumer(uint16 _chainId) external view returns (address) {
        return chainConfigs[_chainId].vrfConsumer;
    }
    
    /**
     * @notice Get Dragon token address
     * @param _chainId Chain ID
     * @return Dragon token address
     */
    function getDragonToken(uint16 _chainId) external view returns (address) {
        return chainConfigs[_chainId].dragonToken;
    }
} 