// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Ive69LPUtilities
 * @dev Interface for the ve69LPUtilities contract which handles boost and voting functionality for ve69LP token holders
 * Previously known as Ive69LPPoolVoting - this interface combines all functionality
 * Used by the DragonShadowV3Swapper to get probability boosts for partners
 * Now with support for multi-gauge voting similar to vlCVX
 */
interface Ive69LPUtilities {
    // ============== BOOST FUNCTIONS ==============
    
    /**
     * @dev Calculate boost multiplier based on user's ve69LP balance
     * @param user Address of the user
     * @return boostMultiplier Boost multiplier in precision units (10000 = 100%)
     */
    function calculateBoost(address user) external view returns (uint256 boostMultiplier);
    
    /**
     * @dev Calculate boost and emit event (non-view version)
     * @param user Address of the user
     * @return boostMultiplier Boost multiplier
     */
    function getBoostWithEvent(address user) external returns (uint256 boostMultiplier);
    
    /**
     * @dev Enter jackpot with a boosted amount based on ve69LP holdings
     * @param user Address of the user entering the jackpot
     * @param amount Base amount for jackpot entry
     * @return boostedAmount The amount after applying the boost
     */
    function enterJackpotWithBoost(address user, uint256 amount) external returns (uint256 boostedAmount);
    
    /**
     * @dev Update boost parameters
     * @param _baseBoost New base boost (10000 = 100%)
     * @param _maxBoost New max boost (25000 = 250%)
     */
    function setBoostParameters(uint256 _baseBoost, uint256 _maxBoost) external;
    
    /**
     * @dev Update jackpot address
     * @param _jackpot New jackpot address
     */
    function setJackpot(address _jackpot) external;
    
    // ============== VOTING FUNCTIONS ==============
    
    /**
     * @dev Get the current voting period
     * @return Current period ID
     */
    function currentPeriod() external view returns (uint256);
    
    /**
     * @dev Vote for a partner to receive probability boost (single gauge vote)
     * @param _partnerId ID of the partner to vote for
     */
    function vote(uint256 _partnerId) external;
    
    /**
     * @dev Vote for multiple partners with different weights (multi-gauge vote)
     * @param _partnerIds Array of partner IDs to vote for
     * @param _weights Array of weights corresponding to each partner (in basis points, totaling 10000)
     */
    function voteMultiple(uint256[] calldata _partnerIds, uint256[] calldata _weights) external;
    
    /**
     * @dev Reset all votes for the caller
     */
    function resetVotes() external;
    
    /**
     * @dev Get all gauges and weights a user has voted for
     * @param _user User address to check
     * @return _partnerIds Array of partner IDs the user has voted for
     * @return _weights Array of weights corresponding to each partner
     */
    function getUserVotes(address _user) external view returns (uint256[] memory _partnerIds, uint256[] memory _weights);
    
    /**
     * @dev Get the maximum number of gauges a user can vote for
     * @return The maximum number of partners a user can distribute votes across
     */
    function getMaxVotesPerUser() external view returns (uint256);
    
    /**
     * @dev Set the maximum number of gauges a user can vote for
     * @param _maxVotes New maximum value
     */
    function setMaxVotesPerUser(uint256 _maxVotes) external;
    
    /**
     * @dev Change vote from one partner to another (legacy single-gauge vote function)
     * @param _oldPartnerId Current partner ID the user is voting for
     * @param _newPartnerId New partner ID to vote for
     */
    function changeVote(uint256 _oldPartnerId, uint256 _newPartnerId) external;
    
    /**
     * @dev Calculate probability boosts based on votes
     * Can be called by anyone, but has a time restriction
     * This is equivalent to the calculateBoosts function in the old Ive69LPPoolVoting interface
     */
    function calculatePartnersBoost() external;
    
    /**
     * @dev Get probability boost for a partner
     * @param _partnerId ID of the partner
     * @return Probability boost in basis points (e.g., 100 = 1%)
     */
    function getPartnerProbabilityBoost(uint256 _partnerId) external view returns (uint256);
    
    /**
     * @dev Get probability boost for a partner address
     * @param _partner Address of the partner
     * @return Probability boost in basis points (e.g., 100 = 1%)
     */
    function getPartnerProbabilityBoostByAddress(address _partner) external view returns (uint256);
    
    /**
     * @dev Set minimum voting power required to participate
     * @param _minVotingPower New minimum voting power
     */
    function setMinVotingPower(uint256 _minVotingPower) external;
    
    /**
     * @dev Set voting period length
     * @param _votingPeriodLength New voting period length in seconds
     */
    function setVotingPeriodLength(uint256 _votingPeriodLength) external;
    
    /**
     * @dev Update partner registry address
     * @param _partnerRegistry New partner registry address
     */
    function setPartnerRegistry(address _partnerRegistry) external;
} 