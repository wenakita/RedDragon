// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MockVe69LPFeeDistributor
 * @dev Mock implementation of ve69LP Fee Distributor for testing
 */
contract MockVe69LPFeeDistributor {
    // Track total received amount
    uint256 private totalReceived;
    
    /**
     * @dev Receive fees
     * @param _token Token address
     * @param _amount Amount to transfer
     */
    function depositFees(address _token, uint256 _amount) external {
        IERC20(_token).transferFrom(msg.sender, address(this), _amount);
        totalReceived += _amount;
    }
    
    /**
     * @dev Get the current balance of the distributor
     * @return Current balance
     */
    function getBalance() external view returns (uint256) {
        return totalReceived;
    }
    
    /**
     * @dev Update reward amount (no-op in mock)
     * @param _token Token address
     * @param _amount Amount
     */
    function updateRewardAmount(address _token, uint256 _amount) external {
        // No-op in this mock
    }
    
    /**
     * @dev Claim rewards (no-op in mock)
     * @param _user User address
     * @param _tokens Token addresses
     */
    function claim(address _user, address[] calldata _tokens) external {
        // No-op in this mock
    }
    
    /**
     * @dev Receive tokens and update total
     */
    function notifyReward(address _token, uint256 _amount) external {
        IERC20(_token).transferFrom(msg.sender, address(this), _amount);
        totalReceived += _amount;
    }
} 