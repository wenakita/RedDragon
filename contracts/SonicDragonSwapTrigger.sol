// SPDX-License-Identifier: MIT

/**
 *   =============================
 *     SONIC DRAGON SWAP TRIGGER
 *   =============================
 *   Sonic-specific lottery trigger
 *   =============================
 *
 * // "The OG lottery, Sonic style." - Carter
 * // https://x.com/sonicreddragon
 * // https://t.me/sonicreddragon
 */

pragma solidity ^0.8.20;

import "./ChainSpecificSwapTrigger.sol";
import "./interfaces/ISonicVRFConsumer.sol";

/**
 * @title SonicDragonSwapTrigger
 * @dev Sonic-specific implementation of the Dragon Swap Trigger that handles
 * lottery entries when users swap wS (Wrapped Sonic) for DRAGON
 */
contract SonicDragonSwapTrigger is ChainSpecificSwapTrigger {
    /**
     * @dev Constructor
     * @param _wrappedSonic Address of wS token
     * @param _dragonToken Address of DRAGON token
     * @param _sonicVRFConsumer Address of Sonic VRF consumer
     * @param _minSwapAmount Minimum amount for lottery entry
     * @param _chainRegistry Address of the chain registry
     */
    constructor(
        address _wrappedSonic,
        address _dragonToken,
        address _sonicVRFConsumer,
        uint256 _minSwapAmount,
        address _chainRegistry
    ) ChainSpecificSwapTrigger(
        _wrappedSonic,
        _dragonToken,
        _sonicVRFConsumer,
        _minSwapAmount,
        _chainRegistry,
        146, // Sonic Chain ID
        "Sonic"
    ) {}
    
    /**
     * @notice Request randomness using Sonic VRF Consumer
     * @param _user User address for randomness request
     * @return requestId The request ID
     */
    function requestRandomness(address _user) internal override returns (uint256) {
        // Request randomness from Sonic VRF Consumer
        uint64 requestId = ISonicVRFConsumer(vrfConsumer).requestRandomness(_user);
        
        // Return request ID as uint256 for compatibility with the base contract
        return uint256(requestId);
    }
} 