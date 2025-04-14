// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev Interface for contracts that consume VRF (Verifiable Random Function) services
 * This provides a standardized way for contracts to request and receive randomness
 */
interface IVRFConsumer {
    /**
     * @dev Request randomness from the VRF service
     * @return requestId The ID of the randomness request
     */
    function requestRandomness() external returns (bytes32);
    
    /**
     * @dev Callback function called when randomness is fulfilled
     * @param requestId The request ID of the randomness request
     * @param randomWords The random values generated
     */
    function fulfillRandomness(bytes32 requestId, uint256[] memory randomWords) external;
    
    /**
     * @dev Get the VRF configuration
     * @return vrfCoordinator Address of the VRF coordinator
     * @return keyHash VRF key hash
     * @return subscriptionId VRF subscription ID
     */
    function getVRFConfiguration() external view returns (
        address vrfCoordinator,
        bytes32 keyHash,
        uint64 subscriptionId
    );
    
    /**
     * @dev Check if VRF is enabled for this contract
     * @return True if VRF is enabled
     */
    function isVrfEnabled() external view returns (bool);
    
    /**
     * @dev Event emitted when randomness is requested
     */
    event RandomnessRequested(bytes32 indexed requestId);
    
    /**
     * @dev Event emitted when randomness is fulfilled
     */
    event RandomnessFulfilled(bytes32 indexed requestId, uint256 firstRandomValue);
    
    /**
     * @dev Event emitted when VRF configuration is updated
     */
    event VRFConfigUpdated(address indexed vrfCoordinator, bytes32 keyHash, uint64 subscriptionId);
} 