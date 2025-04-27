// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IVRFProvider
 * @dev Interface for VRF (Verifiable Random Function) providers
 */
interface IVRFProvider {
    /**
     * @dev Request random numbers from the VRF provider
     * @return A request ID
     */
    function requestRandomness() external returns (bytes32);
    
    /**
     * @dev Set callback address for randomness fulfillment
     * @param callback The address to send the randomness to
     */
    function setCallbackAddress(address callback) external;
    
    /**
     * @dev Get the current VRF configuration
     * @return coordinator The VRF coordinator address
     * @return keyHash The key hash for the VRF
     * @return subscriptionId The subscription ID for VRF
     * @return callbackGasLimit Gas limit for the callback
     * @return requestConfirmations Number of confirmations to wait
     * @return numWords Number of random words to request
     */
    function getVrfConfiguration() external view returns (
        address coordinator,
        bytes32 keyHash,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        uint16 requestConfirmations,
        uint32 numWords
    );
} 