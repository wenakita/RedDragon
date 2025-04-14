// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev Interface for contracts with emergency withdrawal functionality
 * This interface defines a standard method for emergency token withdrawals
 */
interface IEmergencyWithdrawable {
    /**
     * @dev Emergency withdrawal in case of issues
     * Only callable by owner
     * @param token Address of the token to withdraw
     * @param to Address to send tokens to
     * @param amount Amount to withdraw (0 for full balance)
     */
    function emergencyWithdraw(address token, address to, uint256 amount) external;
    
    /**
     * @dev Event emitted when tokens are withdrawn in an emergency
     */
    event EmergencyWithdrawal(address indexed to, uint256 amount, address token);
} 