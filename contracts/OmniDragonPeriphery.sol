// SPDX-License-Identifier: MIT

/**
 *   =============================
 *      OMNI DRAGON PERIPHERY
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
import "./interfaces/ISonicVRFConsumer.sol";
import "./interfaces/IArbitrumVRFRequester.sol";
import "./SonicVRFConsumer.sol";
// import "./SonicVRFConsumerRead.sol"; // Removed for V1 compatibility
import "./DragonSwapTriggerV2.sol";
import "./ArbitrumVRFRequester.sol";

/**
 * @title OmniDragonPeriphery
 * @dev Factory contract to deploy chain-specific components for OmniDragon
 */
contract OmniDragonPeriphery is Ownable {
    // References
    IChainRegistry public chainRegistry;
    address public omniDragon;
    
    // Events
    event ChainRegistrySet(address indexed registry);
    event OmniDragonSet(address indexed dragon);
    event SwapTriggerDeployed(address indexed swapTrigger, address indexed vrfConsumer, string chainName);
    event ArbitrumVRFRequesterDeployed(address indexed vrfRequester);
    event SonicVRFConsumerDeployed(address indexed vrfConsumer);
    
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
     * @notice Deploy chain implementation components
     * @param _nativeTokenWrapper Address of the wrapped native token (wS, WETH, etc.)
     * @param _minSwapAmount Minimum amount for lottery entries
     * @param _lzEndpoint LayerZero endpoint address
     * @param _vrfChainId Chain ID for VRF (Arbitrum or other)
     * @param _vrfRequester VRF requester address
     * @param _chainlinkFeed Chainlink price feed address
     * @param _pythOracle Pyth oracle address
     * @param _pythPriceId Pyth price ID for the native token
     * @param _chainName Name of the chain (e.g. "Sonic", "Base")
     * @param _payoutMethod Method to use for payout (ERC20 or unwrap to native)
     * @return swapTrigger Address of the deployed swap trigger
     * @return vrfConsumer Address of the deployed VRF consumer
     */
    function deployChainImplementation(
        address _nativeTokenWrapper,
        uint256 _minSwapAmount,
        address _lzEndpoint,
        uint16 _vrfChainId,
        address _vrfRequester,
        address _chainlinkFeed,
        address _pythOracle,
        bytes32 _pythPriceId,
        string memory _chainName,
        DragonSwapTriggerV2.PayoutMethod _payoutMethod
    ) external onlyOwner returns (address swapTrigger, address vrfConsumer) {
        require(omniDragon != address(0), "OmniDragon must be set first");
        require(_nativeTokenWrapper != address(0), "Native token wrapper cannot be zero address");
        require(_lzEndpoint != address(0), "LZ endpoint cannot be zero address");
        require(_vrfRequester != address(0), "VRF requester cannot be zero address");
        
        // First deploy VRF consumer since it's needed by the swap trigger
        vrfConsumer = deploySonicVRFConsumer(
            _lzEndpoint,
            _vrfChainId,
            _vrfRequester
        );
        
        // Then deploy unified swap trigger
        swapTrigger = deployDragonSwapTrigger(
            _nativeTokenWrapper,
            omniDragon,
            vrfConsumer,
            _minSwapAmount,
            _chainlinkFeed,
            _pythOracle,
            _pythPriceId,
            _chainName,
            _payoutMethod
        );
        
        // Set permissions
        setSonicPermissions(swapTrigger, vrfConsumer);
        
        emit SwapTriggerDeployed(swapTrigger, vrfConsumer, _chainName);
        return (swapTrigger, vrfConsumer);
    }
    
    /**
     * @notice Deploy Arbitrum VRF Requester
     * @param _vrfCoordinator Address of Chainlink VRF Coordinator on Arbitrum
     * @param _lzEndpoint Address of LayerZero endpoint on Arbitrum
     * @param _subscriptionId Chainlink VRF subscription ID
     * @param _keyHash VRF key hash to use
     * @param _sonicChainId Sonic chain ID for LayerZero
     * @param _sonicVRFConsumer Address of the Sonic VRF Consumer (can be address(0) initially)
     * @return Address of the deployed ArbitrumVRFRequester
     */
    function deployArbitrumVRFRequester(
        address _vrfCoordinator,
        address _lzEndpoint,
        uint64 _subscriptionId,
        bytes32 _keyHash,
        uint16 _sonicChainId,
        address _sonicVRFConsumer
    ) external onlyOwner returns (address) {
        require(_vrfCoordinator != address(0), "VRF Coordinator cannot be zero address");
        require(_lzEndpoint != address(0), "LZ endpoint cannot be zero address");
        
        // Deploy ArbitrumVRFRequester
        ArbitrumVRFRequester vrfRequester = new ArbitrumVRFRequester(
            _vrfCoordinator,
            _lzEndpoint,
            _subscriptionId,
            _keyHash,
            _sonicChainId,
            _sonicVRFConsumer
        );
        
        // Transfer ownership to the factory owner
        vrfRequester.transferOwnership(owner());
        
        emit ArbitrumVRFRequesterDeployed(address(vrfRequester));
        
        return address(vrfRequester);
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
        uint16 _arbitrumChainId,
        address _arbitrumVRFRequester
    ) internal returns (address) {
        require(_lzEndpoint != address(0), "LZ endpoint cannot be zero address");
        require(_arbitrumChainId != 0, "Arbitrum chain ID cannot be zero");
        require(_arbitrumVRFRequester != address(0), "Arbitrum VRF requester cannot be zero address");
        
        // Deploy the SonicVRFConsumer contract
        SonicVRFConsumer vrfConsumer = new SonicVRFConsumer(
            _lzEndpoint,
            _arbitrumChainId,
            _arbitrumVRFRequester,
            address(0) // Initially set lottery contract to address(0), will be updated later
        );
        
        // Transfer ownership of the VRF contracts to the factory owner
        vrfConsumer.transferOwnership(owner());
        
        emit SonicVRFConsumerDeployed(address(vrfConsumer));
        
        return address(vrfConsumer);
    }
    
    /**
     * @notice Deploy the DragonSwapTriggerV2 contract
     * @param _nativeTokenWrapper Address of wrapped native token (wS, WETH, etc.)
     * @param _dragonToken Address of DRAGON token
     * @param _vrfConsumer Address of VRF consumer
     * @param _minSwapAmount Minimum amount for lottery entry
     * @param _chainlinkFeed Chainlink price feed address
     * @param _pythOracle Pyth oracle address
     * @param _pythPriceId Pyth price ID for the native token
     * @param _chainName Name of the chain (e.g. "Sonic", "Base")
     * @param _payoutMethod Method to use for payout (ERC20 or unwrap to native)
     * @return Address of the deployed swap trigger
     */
    function deployDragonSwapTrigger(
        address _nativeTokenWrapper,
        address _dragonToken,
        address _vrfConsumer,
        uint256 _minSwapAmount,
        address _chainlinkFeed,
        address _pythOracle,
        bytes32 _pythPriceId,
        string memory _chainName,
        DragonSwapTriggerV2.PayoutMethod _payoutMethod
    ) internal returns (address) {
        require(_nativeTokenWrapper != address(0), "Native token wrapper cannot be zero address");
        require(_dragonToken != address(0), "Dragon token cannot be zero address");
        require(_vrfConsumer != address(0), "VRF consumer cannot be zero address");
        
        // Deploy the unified DragonSwapTriggerV2 contract
        DragonSwapTriggerV2 swapTrigger = new DragonSwapTriggerV2(
            _nativeTokenWrapper,
            _dragonToken,
            _vrfConsumer,
            _minSwapAmount,
            _chainlinkFeed,
            _pythOracle,
            _pythPriceId,
            owner(),
            _payoutMethod,
            _chainName
        );
        
        // Transfer ownership should be handled within the constructor
        // which grants roles to the admin address
        
        return address(swapTrigger);
    }
    
    /**
     * @notice Set permissions between components
     * @param _swapTrigger Swap trigger address
     * @param _vrfConsumer VRF consumer address
     */
    function setSonicPermissions(address _swapTrigger, address _vrfConsumer) internal {
        // Update the lottery contract in the VRF consumer
        ISonicVRFConsumer(_vrfConsumer).updateLotteryContract(_swapTrigger);
    }
    
    /**
     * @notice Update peer addresses for VRF contracts
     * @param _arbitrumVRFRequester Address of Arbitrum VRF requester
     * @param _sonicVRFConsumer Address of Sonic VRF consumer
     */
    function updateVRFPeers(address _arbitrumVRFRequester, address _sonicVRFConsumer) external onlyOwner {
        require(_arbitrumVRFRequester != address(0), "Arbitrum VRF requester cannot be zero address");
        require(_sonicVRFConsumer != address(0), "Sonic VRF consumer cannot be zero address");
        
        // Update the Sonic VRF consumer address in the Arbitrum VRF requester
        IArbitrumVRFRequester(_arbitrumVRFRequester).updateSonicVRFConsumer(_sonicVRFConsumer);
        
        // Update the Arbitrum VRF requester address in the Sonic VRF consumer
        ISonicVRFConsumer(_sonicVRFConsumer).updateArbitrumVRFRequester(_arbitrumVRFRequester);
    }
} 