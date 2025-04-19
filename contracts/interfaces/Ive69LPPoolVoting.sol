// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Ive69LPPoolVoting
 * @dev Interface for the ve69LPPoolVoting contract
 * Used by the DragonShadowV3Swapper to get probability boosts for partners
 */
interface Ive69LPPoolVoting {
    /**
     * @dev Get the probability boost for a partner by their ID
     * @param _partnerId ID of the partner
     * @return Probability boost in basis points (e.g., 100 = 1%)
     */
    function getPartnerProbabilityBoost(uint256 _partnerId) external view returns (uint256);
    
    /**
     * @dev Get the probability boost for a partner address
     * @param _partner Address of the partner
     * @return Probability boost in basis points (e.g., 100 = 1%)
     */
    function getPartnerProbabilityBoostByAddress(address _partner) external view returns (uint256);
    
    /**
     * @dev Get the current voting period
     * @return Current period ID
     */
    function currentPeriod() external view returns (uint256);
    
    /**
     * @dev Calculate probability boosts based on votes
     * This can only be called once per day
     */
    function calculateBoosts() external;
} 