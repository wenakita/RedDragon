// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IVe8020FeeDistributor
 * @dev Interface for Ve8020FeeDistributor that distributes wS tokens to ve8020 holders
 */
interface IVe8020FeeDistributor {
    /**
     * @dev Add rewards for the current epoch
     * @param _amount Amount of rewards to add
     */
    function addRewards(uint256 _amount) external;
    
    /**
     * @dev Receive rewards directly (e.g., from the token contract)
     * @param _amount Amount of rewards received
     */
    function receiveRewards(uint256 _amount) external;
    
    /**
     * @dev Claims rewards for a specific epoch
     * @param _epoch Epoch to claim rewards for
     */
    function claimRewards(uint256 _epoch) external;
} 