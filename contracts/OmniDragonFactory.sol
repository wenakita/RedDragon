// SPDX-License-Identifier: MIT

/**
 *   =============================
 *      OMNI DRAGON FACTORY
 *   =============================
 *  Deploys chain-specific components
 *   =============================
 *
 * // "Spawning dragons across the chains." - Carter
 * // https://x.com/sonicreddragon
 * // https://t.me/sonicreddragon
 */

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IChainRegistry.sol";

/**
 * @title OmniDragonFactory
 * @dev Factory contract to deploy chain-specific components for OmniDragon
 */
contract OmniDragonFactory is Ownable {
    // References
    IChainRegistry public chainRegistry;
    address public omniDragon;
    
    // Events
    event ChainRegistrySet(address indexed registry);
    event OmniDragonSet(address indexed dragon);
    event SonicImplementationDeployed(address indexed swapTrigger, address indexed vrfConsumer);
    event BaseImplementationDeployed(address indexed swapTrigger);
    event ArbitrumImplementationDeployed(address indexed swapTrigger, address indexed vrfRequester);
    
    /**
     * @dev Constructor
     * @param _chainRegistry Address of the chain registry
     */
    constructor(address _chainRegistry) Ownable() {
        require(_chainRegistry != address(0), "Chain registry cannot be zero address");
        chainRegistry = IChainRegistry(_chainRegistry);
        emit ChainRegistrySet(_chainRegistry);
    }
    
    /**
     * @notice Set the OmniDragon token address
     * @param _omniDragon Address of the OmniDragon token
     */
    function setOmniDragon(address _omniDragon) external onlyOwner {
        require(_omniDragon != address(0), "OmniDragon cannot be zero address");
        omniDragon = _omniDragon;
        emit OmniDragonSet(_omniDragon);
    }
    
    /**
     * @notice Deploy Sonic-specific implementation components
     * @param _wrappedSonic Address of the wS token
     * @param _minSwapAmount Minimum amount for lottery entries
     * @param _lzEndpoint LayerZero endpoint address on Sonic
     * @param _arbitrumChainId Arbitrum chain ID for LayerZero
     * @param _arbitrumVRFRequester Arbitrum VRF requester address
     * @return swapTrigger Address of the deployed swap trigger
     * @return vrfConsumer Address of the deployed VRF consumer
     */
    function deploySonicImplementation(
        address _wrappedSonic,
        uint256 _minSwapAmount,
        address _lzEndpoint,
        uint32 _arbitrumChainId,
        address _arbitrumVRFRequester
    ) external onlyOwner returns (address swapTrigger, address vrfConsumer) {
        require(omniDragon != address(0), "OmniDragon must be set first");
        require(_wrappedSonic != address(0), "Wrapped Sonic cannot be zero address");
        require(_lzEndpoint != address(0), "LZ endpoint cannot be zero address");
        require(_arbitrumVRFRequester != address(0), "Arbitrum VRF requester cannot be zero address");
        
        // First deploy VRF consumer since it's needed by the swap trigger
        vrfConsumer = deploySonicVRFConsumer(
            _lzEndpoint,
            _arbitrumChainId,
            _arbitrumVRFRequester
        );
        
        // Then deploy swap trigger
        swapTrigger = deploySonicSwapTrigger(
            _wrappedSonic,
            omniDragon,
            vrfConsumer,
            _minSwapAmount,
            address(chainRegistry)
        );
        
        // Set permissions
        setSonicPermissions(swapTrigger, vrfConsumer);
        
        emit SonicImplementationDeployed(swapTrigger, vrfConsumer);
        return (swapTrigger, vrfConsumer);
    }
    
    /**
     * @notice Deploy Base-specific implementation components
     * @param _weth Address of WETH on Base
     * @param _minSwapAmount Minimum amount for lottery entries
     * @param _vrfCoordinator Address of Chainlink VRF Coordinator on Base
     * @param _keyHash VRF key hash to use
     * @param _subscriptionId VRF subscription ID
     * @param _callbackGasLimit Gas limit for VRF callback
     * @return swapTrigger Address of the deployed swap trigger
     */
    function deployBaseImplementation(
        address _weth,
        uint256 _minSwapAmount,
        address _vrfCoordinator,
        bytes32 _keyHash,
        uint64 _subscriptionId,
        uint32 _callbackGasLimit
    ) external onlyOwner returns (address swapTrigger) {
        require(omniDragon != address(0), "OmniDragon must be set first");
        require(_weth != address(0), "WETH cannot be zero address");
        require(_vrfCoordinator != address(0), "VRF coordinator cannot be zero address");
        
        // Deploy Base swap trigger with direct VRF integration
        swapTrigger = deployBaseSwapTrigger(
            _weth,
            omniDragon,
            _vrfCoordinator,
            _keyHash,
            _subscriptionId,
            _callbackGasLimit,
            _minSwapAmount,
            address(chainRegistry)
        );
        
        emit BaseImplementationDeployed(swapTrigger);
        return swapTrigger;
    }
    
    /**
     * @notice Deploy the Sonic VRF Consumer contract
     * @param _lzEndpoint LayerZero endpoint address
     * @param _arbitrumChainId Arbitrum chain ID for LayerZero
     * @param _arbitrumVRFRequester Arbitrum VRF requester address
     * @return Address of the deployed VRF consumer
     */
    function deploySonicVRFConsumer(
        address _lzEndpoint,
        uint32 _arbitrumChainId,
        address _arbitrumVRFRequester
    ) internal returns (address) {
        // Deploy the SonicVRFConsumer contract (placeholder for actual deployment)
        // In a real implementation, this would use CREATE2 or a similar deterministic deployment method
        
        // Placeholder return value
        return address(0);
    }
    
    /**
     * @notice Deploy the Sonic-specific swap trigger
     * @param _wrappedSonic Address of wS token
     * @param _dragonToken Address of DRAGON token
     * @param _sonicVRFConsumer Address of Sonic VRF consumer
     * @param _minSwapAmount Minimum amount for lottery entry
     * @param _chainRegistry Address of the chain registry
     * @return Address of the deployed swap trigger
     */
    function deploySonicSwapTrigger(
        address _wrappedSonic,
        address _dragonToken,
        address _sonicVRFConsumer,
        uint256 _minSwapAmount,
        address _chainRegistry
    ) internal returns (address) {
        // Deploy the SonicDragonSwapTrigger contract (placeholder for actual deployment)
        // In a real implementation, this would use CREATE2 or a similar deterministic deployment method
        
        // Placeholder return value
        return address(0);
    }
    
    /**
     * @notice Deploy the Base-specific swap trigger
     * @param _weth Address of WETH token on Base
     * @param _dragonToken Address of DRAGON token
     * @param _vrfCoordinator Address of Chainlink VRF Coordinator on Base
     * @param _keyHash VRF key hash to use
     * @param _subscriptionId VRF subscription ID
     * @param _callbackGasLimit Gas limit for VRF callback
     * @param _minSwapAmount Minimum amount for lottery entry
     * @param _chainRegistry Address of the chain registry
     * @return Address of the deployed swap trigger
     */
    function deployBaseSwapTrigger(
        address _weth,
        address _dragonToken,
        address _vrfCoordinator,
        bytes32 _keyHash,
        uint64 _subscriptionId,
        uint32 _callbackGasLimit,
        uint256 _minSwapAmount,
        address _chainRegistry
    ) internal returns (address) {
        // Deploy the BaseDragonSwapTrigger contract (placeholder for actual deployment)
        // In a real implementation, this would use CREATE2 or a similar deterministic deployment method
        
        // Placeholder return value
        return address(0);
    }
    
    /**
     * @notice Set permissions between Sonic components
     * @param _swapTrigger Swap trigger address
     * @param _vrfConsumer VRF consumer address
     */
    function setSonicPermissions(address _swapTrigger, address _vrfConsumer) internal {
        // Set appropriate permissions between components
        // This would involve calling setLotteryContract on the VRF consumer
        // and setSonicVRFReceiver on the swap trigger
    }
} 