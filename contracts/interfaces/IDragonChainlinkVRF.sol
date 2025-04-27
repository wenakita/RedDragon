// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IDragonChainlinkVRF
 * @dev Interface for the Dragon Chainlink VRF service
 */
interface IDragonChainlinkVRF {
    /**
     * @dev Gets the VRF configuration parameters
     * @return subscriptionId The Chainlink VRF subscription ID
     * @return keyHash The key hash for the VRF request
     * @return requestConfirmations The number of confirmations to wait for
     * @return callbackGasLimit The gas limit for the callback
     * @return numWords The number of random words to request
     */
    function getVRFConfiguration() external view returns (
        uint64 subscriptionId,
        bytes32 keyHash,
        uint16 requestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords
    );
    
    /**
     * @dev Requests randomness from the VRF service
     * @param numWords Number of random words to request
     * @return requestId The ID of the randomness request
     */
    function requestRandomness(uint32 numWords) external payable returns (bytes32 requestId);
    
    /**
     * @dev Fulfills a randomness request with the result from Arbitrum VRF
     * @param requestId The ID of the randomness request
     * @param randomness The random value generated
     */
    function fulfillRandomness(uint256 requestId, uint256 randomness) external;
} 