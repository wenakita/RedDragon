// SPDX-License-Identifier: MIT

/**
 *   ============================
 *         ve69LP UTILITIES
 *   ============================
 *    Boost & Voting Management
 *      for ve69LP Token Holders
 *   ============================
 *
 * // https://x.com/sonicreddragon
 * // https://t.me/sonic_reddragon_bot
 */

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./interfaces/Ive69LP.sol";
import "./interfaces/IJackpot.sol";
import "./interfaces/Ive69LPUtilities.sol";
import "./interfaces/IDragonPartnerRegistry.sol";
import "./math/DragonMathLib.sol";

/**
 * @title ve69LPUtilities
 * @dev Unified contract for ve69LP boost and voting functionality
 * Combines boost calculation for jackpot entries and partner pool voting
 * Supports multi-gauge voting similar to vlCVX
 */
contract ve69LPUtilities is Ownable, ReentrancyGuard, Ive69LPUtilities {
    // Core contract references
    Ive69LP public immutable ve69LP;
    IJackpot public jackpot;
    IDragonPartnerRegistry public partnerRegistry;
    
    // ===== BOOST PARAMETERS =====
    uint256 public constant BOOST_PRECISION = 10000;
    uint256 public baseBoost = 10000;        // 100% = 10000 (can be adjusted)
    uint256 public maxBoost = 25000;         // 250% = 25000 (can be adjusted)
    
    // Optional parameters for refined boost calculation
    uint256 public minLockDuration = 7 days; // Minimum lock duration for boost
    uint256 public maxLockDuration = 4 * 365 days; // Maximum lock duration (4 years)
    
    // ===== VOTING PARAMETERS =====
    // Voting period length in seconds
    uint256 public votingPeriodLength = 7 days;
    
    // Current voting period
    uint256 private _currentPeriod;
    
    // Maximum total probability boost (6.9% expressed in basis points)
    uint256 public constant MAX_TOTAL_BOOST = 690;
    
    // Minimum voting power to participate
    uint256 public minVotingPower = 0.1 ether; // 0.1 ve69LP
    
    // Maximum number of partners a user can vote for at once
    uint256 public maxVotesPerUser = 10;
    
    // ===== MULTI-GAUGE VOTING =====
    // Track votes for each partner in each period
    // period => partnerId => votes
    mapping(uint256 => mapping(uint256 => uint256)) public partnerVotes;
    
    // Track total votes in each period
    // period => totalVotes
    mapping(uint256 => uint256) public periodTotalVotes;
    
    // Track if a user has voted in current period
    // period => user => hasVoted
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    
    // Track votes by user (used for single-gauge voting)
    // period => user => partnerId => votes
    mapping(uint256 => mapping(address => mapping(uint256 => uint256))) public userVotes;
    
    // Track user's multi-gauge votes
    // user => period => partnerId => weight (basis points, out of 10000)
    mapping(address => mapping(uint256 => mapping(uint256 => uint256))) public userGaugeVotes;
    
    // Track number of gauges a user has voted for
    // user => number of gauges
    mapping(address => uint256) public userVoteCount;
    
    // Track allocated probability boost
    // partnerId => probabilityBoost (in basis points)
    mapping(uint256 => uint256) public partnerProbabilityBoost;
    
    // Last calculation timestamp
    uint256 public lastCalculation;
    
    // ===== EVENTS =====
    // Boost Events
    event BoostCalculated(address indexed user, uint256 boost);
    event BoostParametersUpdated(uint256 baseBoost, uint256 maxBoost);
    event JackpotAddressUpdated(address indexed newJackpot);
    event JackpotEntryWithBoost(address indexed user, uint256 amount, uint256 boostedAmount);
    
    // Voting Events
    event VoteCast(address indexed user, uint256 indexed partnerId, uint256 votes, uint256 period);
    event VoteChanged(address indexed user, uint256 indexed oldPartnerId, uint256 indexed newPartnerId, uint256 votes, uint256 period);
    event VoteRemoved(address indexed user, uint256 indexed partnerId, uint256 votes, uint256 period);
    event PartnersBoostCalculated(uint256 period, uint256 totalVotes);
    event PartnerBoostUpdated(uint256 indexed partnerId, uint256 probabilityBoost);
    event VotingPeriodChanged(uint256 newPeriodLength);
    event MinVotingPowerChanged(uint256 newMinVotingPower);
    event PartnerRegistryUpdated(address indexed newRegistry);
    event MaxVotesPerUserChanged(uint256 newMaxVotes);
    
    // Multi-gauge voting events
    event GaugeVote(address indexed user, uint256 indexed partnerId, uint256 weight, uint256 weightedAmount, uint256 period);
    event GaugeVotesReset(address indexed user, uint256 period);
    
    /**
     * @dev Constructor
     * @param _ve69LP Address of the ve69LP token
     * @param _jackpot Address of the jackpot contract
     * @param _partnerRegistry Address of the partner registry
     */
    constructor(address _ve69LP, address _jackpot, address _partnerRegistry) {
        require(_ve69LP != address(0), "ve69LP address cannot be zero");
        require(_jackpot != address(0), "Jackpot address cannot be zero");
        require(_partnerRegistry != address(0), "Partner registry cannot be zero");
        
        ve69LP = Ive69LP(_ve69LP);
        jackpot = IJackpot(_jackpot);
        partnerRegistry = IDragonPartnerRegistry(_partnerRegistry);
        
        // Initialize period and calculation timestamp
        _currentPeriod = block.timestamp / votingPeriodLength;
        lastCalculation = block.timestamp;
    }
    
    /**
     * @dev Get the current voting period
     * @return Current period ID
     */
    function currentPeriod() external view returns (uint256) {
        return _currentPeriod;
    }
    
    // ============================================================
    // ==================== BOOST FUNCTIONS =======================
    // ============================================================
    
    /**
     * @dev Calculate boost multiplier based on user's share with cubic root normalization
     * @param userBalance User's token balance
     * @param totalSupply Total token supply
     * @param _baseBoost Base boost value (e.g., 10000 = 100%)
     * @param _maxBoost Maximum boost value (e.g., 25000 = 250%)
     * @return multiplier The calculated boost multiplier
     */
    function calculateBoostMultiplier(
        uint256 userBalance,
        uint256 totalSupply,
        uint256 _baseBoost,
        uint256 _maxBoost
    ) internal pure returns (uint256 multiplier) {
        return DragonMathLib.calculateBoostMultiplier(
            userBalance,
            totalSupply,
            _baseBoost,
            _maxBoost,
       );
    }
    
    /**
     * @dev Calculate boost multiplier based on user's ve69LP balance with cubic root normalization
     * @param user Address of the user
     * @return boostMultiplier Boost multiplier in BOOST_PRECISION (10000 = 100%)
     */
    function calculateBoost(address user) public view returns (uint256 boostMultiplier) {
        // Get user's ve69LP voting power
        uint256 userVe69LPBalance = ve69LP.votingPowerOf(user);
        
        // Get total ve69LP voting power
        uint256 totalVe69LPSupply = ve69LP.getTotalVotingPower();
        
        // Use the internal boost calculation with our precision values
        return calculateBoostMultiplier(
            userVe69LPBalance,
            totalVe69LPSupply,
            baseBoost,
            maxBoost
        );
    }
    
    /**
     * @dev Calculate boost and emit event (non-view version)
     * @param user Address of the user
     * @return boostMultiplier Boost multiplier
     */
    function getBoostWithEvent(address user) public returns (uint256 boostMultiplier) {
        boostMultiplier = calculateBoost(user);
        emit BoostCalculated(user, boostMultiplier);
        return boostMultiplier;
    }
    
    /**
     * @dev Enter jackpot with a boosted amount based on ve69LP holdings
     * @param user Address of the user entering the jackpot
     * @param amount Base amount for jackpot entry
     * @return boostedAmount The amount after applying the boost
     */
    function enterJackpotWithBoost(address user, uint256 amount) external returns (uint256 boostedAmount) {
        // Only authorized integrators can call this function
        require(msg.sender == owner() || msg.sender == address(jackpot), "Unauthorized caller");
        
        // Calculate boost
        uint256 boostMultiplier = calculateBoost(user);
        
        // Apply boost to amount
        boostedAmount = DragonMathLib.applyBoost(amount, boostMultiplier, BOOST_PRECISION);
        
        // Enter jackpot with boosted amount
        jackpot.enterJackpotWithWrappedSonic(user, boostedAmount);
        
        // Emit events
        emit BoostCalculated(user, boostMultiplier);
        emit JackpotEntryWithBoost(user, amount, boostedAmount);
        
        return boostedAmount;
    }
    
    /**
     * @dev Update boost parameters
     * @param _baseBoost New base boost (10000 = 100%)
     * @param _maxBoost New max boost (25000 = 250%)
     */
    function setBoostParameters(uint256 _baseBoost, uint256 _maxBoost) external onlyOwner {
        require(_baseBoost > 0, "Base boost must be > 0");
        require(_maxBoost > _baseBoost, "Max boost must be > base boost");
        
        baseBoost = _baseBoost;
        maxBoost = _maxBoost;
        
        emit BoostParametersUpdated(_baseBoost, _maxBoost);
    }
    
    /**
     * @dev Update jackpot address
     * @param _jackpot New jackpot address
     */
    function setJackpot(address _jackpot) external onlyOwner {
        require(_jackpot != address(0), "Jackpot address cannot be zero");
        jackpot = IJackpot(_jackpot);
        emit JackpotAddressUpdated(_jackpot);
    }
    
    // ============================================================
    // ================= MULTI-GAUGE VOTING ======================
    // ============================================================
    
    /**
     * @dev Vote for multiple partners with different weights
     * @param _partnerIds Array of partner IDs to vote for
     * @param _weights Array of weights corresponding to each partner (in basis points, totaling 10000)
     */
    function voteMultiple(uint256[] calldata _partnerIds, uint256[] calldata _weights) external {
        // Validate input arrays
        require(_partnerIds.length == _weights.length, "Array length mismatch");
        require(_partnerIds.length > 0, "Empty vote array");
        require(_partnerIds.length <= maxVotesPerUser, "Too many votes");
        
        // Validate partners and get normalized weights
        uint256[] memory normalizedWeights = validateAndNormalizeWeights(_partnerIds, _weights);
        
        // Check voting power
        uint256 votingPower = ve69LP.votingPowerOf(msg.sender);
        require(votingPower >= minVotingPower, "Insufficient voting power");
        
        // Update period if needed
        updatePeriodIfNeeded();
        
        // Clear previous votes if any
        if (hasVoted[_currentPeriod][msg.sender]) {
            removeVoteInternal(msg.sender);
        }
        
        // Record votes with weights
        for (uint256 i = 0; i < _partnerIds.length; i++) {
            uint256 partnerId = _partnerIds[i];
            uint256 weight = normalizedWeights[i];
            uint256 weightedVotingPower = (votingPower * weight) / BOOST_PRECISION;
            
            userGaugeVotes[msg.sender][_currentPeriod][partnerId] = weight;
            partnerVotes[_currentPeriod][partnerId] += weightedVotingPower;
            
            emit GaugeVote(msg.sender, partnerId, weight, weightedVotingPower, _currentPeriod);
        }
        
        // Update vote counts and status
        userVoteCount[msg.sender] = _partnerIds.length;
        periodTotalVotes[_currentPeriod] += votingPower;
        hasVoted[_currentPeriod][msg.sender] = true;
    }
    
    /**
     * @dev Vote for a single partner (simplified interface for single votes)
     * @param _partnerId ID of the partner to vote for
     */
    function vote(uint256 _partnerId) external {
        // Get partner address from ID
        address partnerAddress = partnerRegistry.partnerList(_partnerId);
        
        // Verify partner exists and is active
        bool isActive = partnerRegistry.isPartnerActive(partnerAddress);
        require(partnerAddress != address(0), "Partner does not exist");
        require(isActive, "Partner is not active");
        
        // Create arrays for single vote
        uint256[] memory partnerIds = new uint256[](1);
        uint256[] memory weights = new uint256[](1);
        
        partnerIds[0] = _partnerId;
        weights[0] = BOOST_PRECISION; // 100% weight
        
        // Use the multi-vote function
        voteMultiple(partnerIds, weights);
    }
    
    /**
     * @dev Reset all votes for the caller
     */
    function resetVotes() external {
        require(hasVoted[_currentPeriod][msg.sender], "No active votes");
        updatePeriodIfNeeded();
        removeVoteInternal(msg.sender);
        emit GaugeVotesReset(msg.sender, _currentPeriod);
    }
    
    /**
     * @dev Change vote from one partner to another
     * Legacy function, maintained for backwards compatibility
     * @param _oldPartnerId Current partner ID the user is voting for
     * @param _newPartnerId New partner ID to vote for
     */
    function changeVote(uint256 _oldPartnerId, uint256 _newPartnerId) external {
        // Create arrays for the new vote
        uint256[] memory partnerIds = new uint256[](1);
        uint256[] memory weights = new uint256[](1);
        
        partnerIds[0] = _newPartnerId;
        weights[0] = BOOST_PRECISION; // 100% weight
        
        // Use the multi-vote function
        voteMultiple(partnerIds, weights);
        
        // Emit the legacy event
        emit VoteChanged(
            msg.sender, 
            _oldPartnerId, 
            _newPartnerId, 
            ve69LP.votingPowerOf(msg.sender), 
            _currentPeriod
        );
    }
    
    /**
     * @dev Remove a user's vote
     * @param user Address of the user
     */
    function removeVoteInternal(address user) internal {
        uint256 votingPower = ve69LP.votingPowerOf(user);
        uint256 totalVotesRemoved = 0;
        
        // Process all potential partner IDs the user might have voted for
        for (uint256 i = 0; i < partnerRegistry.getPartnerCount(); i++) {
            uint256 weight = userGaugeVotes[user][_currentPeriod][i];
            if (weight > 0) {
                uint256 weightedVotingPower = (votingPower * weight) / BOOST_PRECISION;
                totalVotesRemoved += weightedVotingPower;
                
                // Remove from partner votes
                partnerVotes[_currentPeriod][i] = partnerVotes[_currentPeriod][i] > weightedVotingPower ?
                    partnerVotes[_currentPeriod][i] - weightedVotingPower : 0;
                
                // Clear user's vote weight for this gauge
                userGaugeVotes[user][_currentPeriod][i] = 0;
                
                // Emit legacy event for backward compatibility
                emit VoteRemoved(user, i, weightedVotingPower, _currentPeriod);
            }
        }
        
        // Clear user's status and count
        userVoteCount[user] = 0;
        hasVoted[_currentPeriod][user] = false;
        
        // Update total votes for period
        periodTotalVotes[_currentPeriod] = periodTotalVotes[_currentPeriod] > totalVotesRemoved ?
            periodTotalVotes[_currentPeriod] - totalVotesRemoved : 0;
    }
    
    /**
     * @dev Legacy function for backward compatibility
     */
    function removeVote(address user) internal {
        removeVoteInternal(user);
    }
    
    /**
     * @dev Validate partner IDs and normalize weights to sum to BOOST_PRECISION (10000)
     */
    function validateAndNormalizeWeights(
        uint256[] calldata _partnerIds, 
        uint256[] calldata _weights
    ) internal view returns (uint256[] memory) {
        // Use DragonMathLib for weights normalization
        uint256[] memory normalizedWeights = new uint256[](_weights.length);
        for (uint256 i = 0; i < _weights.length; i++) {
            normalizedWeights[i] = _weights[i];
        }
        
        // Verify partners and check for duplicates
        for (uint256 i = 0; i < _partnerIds.length; i++) {
            address partnerAddress = partnerRegistry.partnerList(_partnerIds[i]);
            require(partnerAddress != address(0), "Partner does not exist");
            require(partnerRegistry.isPartnerActive(partnerAddress), "Partner is not active");
            
            // Check for duplicate partner IDs
            for (uint256 j = 0; j < i; j++) {
                require(_partnerIds[j] != _partnerIds[i], "Duplicate partner ID");
            }
        }
        
        // Normalize the weights using DragonMathLib
        return DragonMathLib.normalizeWeights(normalizedWeights, BOOST_PRECISION);
    }
    
    /**
     * @dev Get all gauges and weights a user has voted for
     * @param _user User address to check
     * @return _partnerIds Array of partner IDs the user has voted for
     * @return _weights Array of weights corresponding to each partner
     */
    function getUserVotes(address _user) external view returns (uint256[] memory _partnerIds, uint256[] memory _weights) {
        uint256 voteCount = userVoteCount[_user];
        _partnerIds = new uint256[](voteCount);
        _weights = new uint256[](voteCount);
        
        if (voteCount == 0) return (_partnerIds, _weights);
        
        uint256 counter = 0;
        for (uint256 i = 0; i < partnerRegistry.getPartnerCount() && counter < voteCount; i++) {
            uint256 weight = userGaugeVotes[_user][_currentPeriod][i];
            if (weight > 0) {
                _partnerIds[counter] = i;
                _weights[counter] = weight;
                counter++;
            }
        }
        
        return (_partnerIds, _weights);
    }
    
    /**
     * @dev Get the maximum number of gauges a user can vote for
     */
    function getMaxVotesPerUser() external view returns (uint256) {
        return maxVotesPerUser;
    }
    
    /**
     * @dev Set the maximum number of gauges a user can vote for
     * @param _maxVotes New maximum value
     */
    function setMaxVotesPerUser(uint256 _maxVotes) external onlyOwner {
        require(_maxVotes > 0, "Max votes must be > 0");
        maxVotesPerUser = _maxVotes;
        emit MaxVotesPerUserChanged(_maxVotes);
    }
    
    /**
     * @dev Calculate probability boosts based on votes
     * Can be called by anyone, but has a time restriction
     */
    function calculatePartnersBoost() external {
        // Check if 24 hours have passed since last calculation
        require(block.timestamp >= lastCalculation + 1 days, "Too soon to recalculate");
        
        // Update period if needed
        updatePeriodIfNeeded();
        
        // Get total votes in the current period
        uint256 totalVotes = periodTotalVotes[_currentPeriod];
        
        // If no votes, reset all boosts
        if (totalVotes == 0) {
            for (uint256 i = 0; i < partnerRegistry.getPartnerCount(); i++) {
                if (partnerProbabilityBoost[i] > 0) {
                    partnerProbabilityBoost[i] = 0;
                    emit PartnerBoostUpdated(i, 0);
                }
            }
        } else {
            // Calculate boost for each partner
            for (uint256 i = 0; i < partnerRegistry.getPartnerCount(); i++) {
                uint256 votes = partnerVotes[_currentPeriod][i];
                
                // Calculate partner's share of the boost
                uint256 boost = DragonMathLib.calculatePercentage(
                    votes,
                    totalVotes,
                    MAX_TOTAL_BOOST
                );
                
                // Update partner's probability boost if changed
                if (boost != partnerProbabilityBoost[i]) {
                    partnerProbabilityBoost[i] = boost;
                    emit PartnerBoostUpdated(i, boost);
                }
            }
        }
        
        // Update last calculation timestamp
        lastCalculation = block.timestamp;
        
        emit PartnersBoostCalculated(_currentPeriod, totalVotes);
    }
    
    /**
     * @dev Get probability boost for a partner
     * @param _partnerId ID of the partner
     * @return Probability boost in basis points (e.g., 100 = 1%)
     */
    function getPartnerProbabilityBoost(uint256 _partnerId) external view returns (uint256) {
        return partnerProbabilityBoost[_partnerId];
    }
    
    /**
     * @dev Get probability boost for a partner address
     * @param _partner Address of the partner
     * @return Probability boost in basis points (e.g., 100 = 1%)
     */
    function getPartnerProbabilityBoostByAddress(address _partner) external view returns (uint256) {
        // Iterate through partner list to find matching address
        for (uint256 i = 0; i < partnerRegistry.getPartnerCount(); i++) {
            if (partnerRegistry.partnerList(i) == _partner) {
                return partnerProbabilityBoost[i];
            }
        }
        return 0;
    }
    
    /**
     * @dev Update current period if needed
     */
    function updatePeriodIfNeeded() internal {
        uint256 calculatedPeriod = block.timestamp / votingPeriodLength;
        if (calculatedPeriod > _currentPeriod) {
            _currentPeriod = calculatedPeriod;
        }
    }
    
    /**
     * @dev Set minimum voting power required to participate
     * @param _minVotingPower New minimum voting power
     */
    function setMinVotingPower(uint256 _minVotingPower) external onlyOwner {
        minVotingPower = _minVotingPower;
        emit MinVotingPowerChanged(_minVotingPower);
    }
    
    /**
     * @dev Set voting period length
     * @param _votingPeriodLength New voting period length in seconds
     */
    function setVotingPeriodLength(uint256 _votingPeriodLength) external onlyOwner {
        require(_votingPeriodLength >= 1 days, "Period must be at least 1 day");
        votingPeriodLength = _votingPeriodLength;
        emit VotingPeriodChanged(_votingPeriodLength);
    }
    
    /**
     * @dev Update partner registry address
     * @param _partnerRegistry New partner registry address
     */
    function setPartnerRegistry(address _partnerRegistry) external onlyOwner {
        require(_partnerRegistry != address(0), "Partner registry cannot be zero");
        partnerRegistry = IDragonPartnerRegistry(_partnerRegistry);
        emit PartnerRegistryUpdated(_partnerRegistry);
    }
} 
