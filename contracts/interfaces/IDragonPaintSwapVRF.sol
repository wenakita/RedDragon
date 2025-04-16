// SPDX-License-Identifier: MIT
// Fair, Verifiable, Simple: Ape the Dragon
// https://x.com/sonicreddragon
// https://t.me/sonicreddragon

pragma solidity ^0.8.9;

/**
 * @title IDragonPaintSwapVRF
 * @dev Interface for the DragonPaintSwapVRF contract
 */
interface IDragonPaintSwapVRF {
    /**
     * @dev Request random number
     * @return requestId The ID of the random number request
     */
    function requestRandomness() external returns (bytes32);
    function randomnessToRange(bytes32 requestId, uint256 range) external view returns (uint256);
    function checkThreshold(bytes32 requestId, uint256 denominator, uint256 threshold) external view returns (bool);
    function fulfillRandomWords(bytes32 requestId, uint256[] memory randomWords) external;
    
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

    function isVrfEnabled() external view returns (bool);
} 