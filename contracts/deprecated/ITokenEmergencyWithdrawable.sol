// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev Interface for contracts with token-specific emergency withdrawal functionality
 * This interface defines a standard method for emergency token withdrawals
 * where the token is fixed and only specified in the implementation
 */
interface ITokenEmergencyWithdrawable {
    /**
     * @dev Emergency withdrawal in case of issues
     * Only callable by owner
     * @param to Address to send tokens to
     * @param amount Amount to withdraw (0 for full balance)
     */
    function emergencyWithdraw(address to, uint256 amount) external;
    
    /**
     * @dev Event emitted when tokens are withdrawn in an emergency
     */
    event EmergencyWithdrawal(address indexed to, uint256 amount);
} 