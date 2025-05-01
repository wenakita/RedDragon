// SPDX-License-Identifier: MIT

/**
 *   =============================
 *     BASE DRAGON SWAP TRIGGER
 *   =============================
 *    Base chain-specific lottery trigger
 *   =============================
 *
 * // "Gas-efficient lottery on Base." - Carter
 * // https://x.com/sonicreddragon
 * // https://t.me/sonicreddragon
 */

pragma solidity ^0.8.20;

import "./ChainSpecificSwapTrigger.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";

/**
 * @title BaseDragonSwapTrigger
 * @dev Base chain-specific implementation of the Dragon Swap Trigger 
 * that handles lottery entries when users swap ETH for DRAGON on Base
 */
contract BaseDragonSwapTrigger is ChainSpecificSwapTrigger, VRFConsumerBaseV2 {
    // Chainlink VRF variables
    VRFCoordinatorV2Interface public immutable COORDINATOR;
    bytes32 public immutable keyHash;
    uint64 public immutable subscriptionId;
    uint16 public constant REQUEST_CONFIRMATIONS = 3;
    uint32 public immutable callbackGasLimit;
    uint32 public constant NUM_WORDS = 1;
    
    /**
     * @dev Constructor
     * @param _weth Address of WETH token on Base
     * @param _dragonToken Address of DRAGON token
     * @param _vrfCoordinator Address of Chainlink VRF Coordinator on Base
     * @param _keyHash VRF key hash to use
     * @param _subscriptionId VRF subscription ID
     * @param _callbackGasLimit Gas limit for VRF callback
     * @param _minSwapAmount Minimum amount for lottery entry
     * @param _chainRegistry Address of the chain registry
     */
    constructor(
        address _weth,
        address _dragonToken,
        address _vrfCoordinator,
        bytes32 _keyHash,
        uint64 _subscriptionId,
        uint32 _callbackGasLimit,
        uint256 _minSwapAmount,
        address _chainRegistry
    ) ChainSpecificSwapTrigger(
        _weth,
        _dragonToken,
        address(this), // This contract is the VRF consumer on Base
        _minSwapAmount,
        _chainRegistry,
        184, // Base Chain ID
        "Base"
    ) VRFConsumerBaseV2(_vrfCoordinator) {
        COORDINATOR = VRFCoordinatorV2Interface(_vrfCoordinator);
        keyHash = _keyHash;
        subscriptionId = _subscriptionId;
        callbackGasLimit = _callbackGasLimit;
    }
    
    /**
     * @notice Request randomness using Chainlink VRF directly on Base
     * @param _user User address for randomness request
     * @return requestId The request ID
     */
    function requestRandomness(address _user) internal override returns (uint256) {
        // Directly request randomness from Chainlink
        uint256 requestId = COORDINATOR.requestRandomWords(
            keyHash,
            subscriptionId,
            REQUEST_CONFIRMATIONS,
            callbackGasLimit,
            NUM_WORDS
        );
        
        return requestId;
    }
    
    /**
     * @notice Callback function for Chainlink VRF
     * @param requestId The request ID
     * @param randomWords The random words from VRF
     */
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        // Forward to the base contract's fulfillRandomness function
        this.fulfillRandomness(requestId, randomWords[0]);
    }
    
    /**
     * @notice Override setVRFConsumer to prevent changes since VRF is handled internally
     * @param _vrfConsumerAddress Unused parameter
     */
    function setVRFConsumer(address _vrfConsumerAddress) external override onlyOwner {
        revert("VRF consumer cannot be changed on Base");
    }
} 