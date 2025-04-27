// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRedEnvelope
 * @dev Interface for the RedEnvelope contract that provides a fixed 0.69% probability boost
 */
interface IRedEnvelope {
    /**
     * @dev Calculate boost amount for a user - always returns the fixed 0.69% boost
     * @param user Address of the user to calculate boost for
     * @return boostAmount The fixed boost amount (69 = 0.69%)
     */
    function calculateBoost(address user) external view returns (uint256);

    /**
     * @dev Check if a user has a red envelope
     * @param user User to check
     * @return bool True if user has at least one envelope
     */
    function hasRedEnvelope(address user) external view returns (bool);
} 