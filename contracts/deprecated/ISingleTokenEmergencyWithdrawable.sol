// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev Interface for contracts with single-token emergency withdrawal functionality
 * This interface defines a standard method for emergency single token withdrawals
 * where the recipient is fixed (typically the contract owner)
 */
interface ISingleTokenEmergencyWithdrawable {
    /**
     * @dev Emergency withdrawal in case of issues
     * Only callable by owner
     * @param token Address of the token to withdraw
     * @param amount Amount to withdraw (0 for full balance)
     */
    function emergencyWithdraw(address token, uint256 amount) external;
    
    /**
     * @dev Event emitted when tokens are withdrawn in an emergency
     */
    event EmergencyWithdrawal(address indexed token, uint256 amount);
} 