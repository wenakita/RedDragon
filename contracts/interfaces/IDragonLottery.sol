// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title IDragonLottery
 * @notice Interface for the Dragon Lottery contract
 */
interface IDragonLottery {
    /**
     * @notice Triggered when lottery results are received from cross-chain
     * @param requestId The ID of the lottery request
     * @param randomness The random value used for determining winners
     */
    function receiveRandomness(uint256 requestId, uint256 randomness) external;
    
    /**
     * @notice Requests randomness for a lottery when a user swaps wS for DRAGON
     * @param user The address of the user who triggered the lottery
     * @return requestId The ID of the randomness request
     */
    function requestRandomnessForSwap(address user) external returns (uint256 requestId);
} 