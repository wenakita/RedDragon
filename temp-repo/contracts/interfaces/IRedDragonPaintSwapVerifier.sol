// SPDX-License-Identifier: MIT
// Fair, Verifiable, Simple: Ape the Dragon
// https://x.com/sonicreddragon
// https://t.me/sonicreddragon

pragma solidity ^0.8.20;

/**
 * @title IRedDragonPaintSwapVerifier
 * @dev Interface for the PaintSwap VRF verifier
 */
interface IRedDragonPaintSwapVerifier {
    /**
     * @dev Request random number
     * @return requestId The ID of the random number request
     */
    function requestRandomness() external returns (bytes32);
    function randomnessToRange(bytes32 requestId, uint256 range) external view returns (uint256);
    function checkThreshold(bytes32 requestId, uint256 denominator, uint256 threshold) external view returns (bool);
    function fulfillRandomWords(bytes32 requestId, uint256[] memory randomWords) external;
} 