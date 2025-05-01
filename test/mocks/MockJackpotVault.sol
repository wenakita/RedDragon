// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MockJackpotVault
 * @dev Mock implementation of Jackpot Vault for testing
 */
contract MockJackpotVault {
    // Track total received amount
    uint256 private totalReceived;
    
    /**
     * @dev Add funds to the jackpot
     * @param _amount Amount to add
     */
    function addToJackpot(uint256 _amount) external {
        totalReceived += _amount;
    }
    
    /**
     * @dev Get the current balance of the vault
     * @return Current balance
     */
    function getBalance() external view returns (uint256) {
        return totalReceived;
    }
    
    /**
     * @dev Mock a withdrawal from the jackpot
     * @param _token Token to withdraw
     * @param _to Recipient address
     * @param _amount Amount to withdraw
     */
    function withdraw(address _token, address _to, uint256 _amount) external {
        IERC20(_token).transfer(_to, _amount);
        if (_amount <= totalReceived) {
            totalReceived -= _amount;
        } else {
            totalReceived = 0;
        }
    }
} 