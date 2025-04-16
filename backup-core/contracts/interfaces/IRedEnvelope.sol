// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRedEnvelope
 * @dev Interface for the RedEnvelope contract
 */
interface IRedEnvelope {
    /**
     * @dev Calculate boost amount for a user based on their red envelope rarity
     * @param user Address of the user to calculate boost for
     * @return boostAmount The boost amount in BOOST_PRECISION units
     */
    function calculateBoost(address user) external view returns (uint256);

    /**
     * @dev Check if a user has a red envelope
     * @param user User to check
     * @return bool True if user has at least one envelope
     */
    function hasRedEnvelope(address user) external view returns (bool);
} 