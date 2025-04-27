// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title ISonicVRFReceiver
 * @dev Interface for the SonicVRFReceiver contract
 */
interface ISonicVRFReceiver {
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
    ) external;
    
    /**
     * @notice Receive randomness directly (for testing or manual submission)
     * @param requestId The ID of the request
     * @param randomness The random value
     */
    function receiveRandomness(uint256 requestId, uint256 randomness) external;
    
    /**
     * @notice Set the DragonChainlinkVRF contract address
     * @param _dragonChainlinkVRF The new contract address
     */
    function setDragonChainlinkVRF(address _dragonChainlinkVRF) external;
    
    /**
     * @notice Set the endpoint for a specific chain
     * @param chainId The chain ID
     * @param endpoint The endpoint address
     */
    function setEndpoint(uint16 chainId, address endpoint) external;
    
    /**
     * @notice Request randomness from Arbitrum
     * @param requestId The ID of the request
     */
    function requestRandomness(uint256 requestId) external;
    
    /**
     * @notice Set the DragonSwapTrigger contract address
     * @param _dragonSwapTrigger The address of the DragonSwapTrigger contract
     */
    function setDragonSwapTrigger(address _dragonSwapTrigger) external;
} 