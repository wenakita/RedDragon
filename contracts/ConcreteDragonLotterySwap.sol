// SPDX-License-Identifier: MIT

/**
 *                                              
 *         ======== CONCRETE DRAGON ========
 *         Lottery Implementation for Testing
 *
 * // "This is the worst vacation ever!" - Carter
 * // https://x.com/sonicreddragon
 * // https://t.me/sonicreddragon
 */

pragma solidity ^0.8.20;

import "./DragonLotterySwap.sol";

/**
 * @title ConcreteDragonLotterySwap
 * @dev Concrete implementation of the DragonLotterySwap abstract contract for testing
 */
contract ConcreteDragonLotterySwap is DragonLotterySwap {
    constructor(
        address _wrappedSonic,
        address _verifier,
        address _registry,
        address _goldScratcher
    ) DragonLotterySwap(_wrappedSonic, _verifier, _registry, _goldScratcher) {
        // Constructor is called by parent
    }
    
    /**
     * @dev Request random numbers from the VRF provider
     * @return A request ID
     */
    function requestRandomness() external returns (bytes32) {
        return bytes32(0); // Mock implementation
    }
    
    /**
     * @dev Process the random values from the VRF provider
     * @param requestId The request ID
     * @param randomWords The random values
     */
    function fulfillRandomness(bytes32 requestId, uint256[] memory randomWords) external {
        // Mock implementation
    }
    
    /**
     * @dev Check if VRF is enabled for this contract
     * @return True if VRF is enabled
     */
    function isVrfEnabled() external view returns (bool) {
        return false; // Mock implementation
    }
} 