// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IVe8020FeeDistributor.sol";

/**
 * @title MockVe8020FeeDistributor
 * @dev Mock implementation of Ve8020FeeDistributor for testing
 */
contract MockVe8020FeeDistributor is IVe8020FeeDistributor {
    IERC20 public rewardToken;
    uint256 public lastRewardsAmount;
    uint256 public lastReceiveAmount;
    bool public shouldAddRewardsRevert;
    
    /**
     * @dev Constructor
     * @param _rewardToken The reward token address
     */
    constructor(address _rewardToken) {
        rewardToken = IERC20(_rewardToken);
    }
    
    /**
     * @dev Mock implementation of addRewards
     * @param _amount Amount of rewards to add
     */
    function addRewards(uint256 _amount) external override {
        if (shouldAddRewardsRevert) {
            revert("addRewards reverted");
        }
        
        lastRewardsAmount = _amount;
        require(rewardToken.transferFrom(msg.sender, address(this), _amount), "Transfer failed");
    }
    
    /**
     * @dev Mock implementation of receiveRewards
     * @param _amount Amount of rewards received
     */
    function receiveRewards(uint256 _amount) external override {
        lastReceiveAmount = _amount;
    }
    
    /**
     * @dev Mock function to set whether addRewards should revert
     * @param _shouldRevert Whether addRewards should revert
     */
    function setAddRewardsRevert(bool _shouldRevert) external {
        shouldAddRewardsRevert = _shouldRevert;
    }
} 