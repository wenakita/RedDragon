// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/Ive69LP.sol";
import "./partner/DragonPartnerRegistry.sol";

/**
 * @title ve69LPPoolVoting
 * @dev Allows ve69LP holders to vote on partner pools to receive probability boosts
 * The total probability boost across all pools is capped at 6.9%
 */
contract ve69LPPoolVoting is Ownable {
    // ve69LP token contract
    Ive69LP public ve69LP;
    
    // Partner registry
    DragonPartnerRegistry public partnerRegistry;
    
    // Voting period length in seconds
    uint256 public votingPeriodLength = 7 days;
    
    // Current voting period
    uint256 public currentPeriod;
    
    // Maximum total probability boost (6.9% expressed in basis points)
    uint256 public constant MAX_TOTAL_BOOST = 690;
    
    // Minimum voting power to participate
    uint256 public minVotingPower = 0.1 ether; // 0.1 ve69LP
    
    // Track votes for each partner in each period
    // period => partnerId => votes
    mapping(uint256 => mapping(uint256 => uint256)) public partnerVotes;
    
    // Track total votes in each period
    // period => totalVotes
    mapping(uint256 => uint256) public periodTotalVotes;
    
    // Track if a user has voted in current period
    // period => user => hasVoted
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    
    // Track votes by user
    // period => user => partnerId => votes
    mapping(uint256 => mapping(address => mapping(uint256 => uint256))) public userVotes;
    
    // Track allocated probability boost
    // partnerId => probabilityBoost (in basis points)
    mapping(uint256 => uint256) public partnerProbabilityBoost;
    
    // Last calculation timestamp
    uint256 public lastCalculation;
    
    // Events
    event VoteCast(address indexed user, uint256 indexed partnerId, uint256 votes, uint256 period);
    event VoteChanged(address indexed user, uint256 indexed oldPartnerId, uint256 indexed newPartnerId, uint256 votes, uint256 period);
    event VoteRemoved(address indexed user, uint256 indexed partnerId, uint256 votes, uint256 period);
    event BoostCalculated(uint256 period, uint256 totalVotes);
    event PartnerBoostUpdated(uint256 indexed partnerId, uint256 probabilityBoost);
    event VotingPeriodChanged(uint256 newPeriodLength);
    event MinVotingPowerChanged(uint256 newMinVotingPower);
    
    /**
     * @dev Constructor
     * @param _ve69LP Address of the ve69LP token
     * @param _partnerRegistry Address of the partner registry
     */
    constructor(address _ve69LP, address _partnerRegistry) {
        require(_ve69LP != address(0), "ve69LP cannot be zero address");
        require(_partnerRegistry != address(0), "Partner registry cannot be zero address");
        
        ve69LP = Ive69LP(_ve69LP);
        partnerRegistry = DragonPartnerRegistry(_partnerRegistry);
        
        // Initialize period and calculation timestamp
        currentPeriod = block.timestamp / votingPeriodLength;
        lastCalculation = block.timestamp;
    }
    
    /**
     * @dev Vote for a partner to receive probability boost
     * @param _partnerId ID of the partner to vote for
     */
    function vote(uint256 _partnerId) external {
        // Get partner address from ID
        address partnerAddress = partnerRegistry.partnerList(_partnerId);
        
        // Verify partner exists and is active
        bool isActive = partnerRegistry.isPartnerActive(partnerAddress);
        require(partnerAddress != address(0), "Partner does not exist");
        require(isActive, "Partner is not active");
        
        // Check if we need to move to a new period
        updatePeriodIfNeeded();
        
        // Get user's voting power
        uint256 votingPower = ve69LP.votingPowerOf(msg.sender);
        require(votingPower >= minVotingPower, "Insufficient voting power");
        
        // If user has already voted in this period, remove their previous vote
        if (hasVoted[currentPeriod][msg.sender]) {
            removeVote(msg.sender);
        }
        
        // Record the new vote
        partnerVotes[currentPeriod][_partnerId] += votingPower;
        periodTotalVotes[currentPeriod] += votingPower;
        hasVoted[currentPeriod][msg.sender] = true;
        userVotes[currentPeriod][msg.sender][_partnerId] = votingPower;
        
        emit VoteCast(msg.sender, _partnerId, votingPower, currentPeriod);
    }
    
    /**
     * @dev Change vote from one partner to another
     * @param _oldPartnerId Current partner ID the user is voting for
     * @param _newPartnerId New partner ID to vote for
     */
    function changeVote(uint256 _oldPartnerId, uint256 _newPartnerId) external {
        // Get partner address from ID
        address newPartnerAddress = partnerRegistry.partnerList(_newPartnerId);
        
        // Verify new partner exists and is active
        bool isActive = partnerRegistry.isPartnerActive(newPartnerAddress);
        require(newPartnerAddress != address(0), "New partner does not exist");
        require(isActive, "New partner is not active");
        
        // Check if we need to move to a new period
        updatePeriodIfNeeded();
        
        // Check if user has voted for the old partner
        uint256 oldVotes = userVotes[currentPeriod][msg.sender][_oldPartnerId];
        require(oldVotes > 0, "No votes for old partner");
        
        // Remove old vote
        partnerVotes[currentPeriod][_oldPartnerId] -= oldVotes;
        userVotes[currentPeriod][msg.sender][_oldPartnerId] = 0;
        
        // Add new vote
        partnerVotes[currentPeriod][_newPartnerId] += oldVotes;
        userVotes[currentPeriod][msg.sender][_newPartnerId] = oldVotes;
        
        emit VoteChanged(msg.sender, _oldPartnerId, _newPartnerId, oldVotes, currentPeriod);
    }
    
    /**
     * @dev Remove a user's vote
     * @param user Address of the user
     */
    function removeVote(address user) internal {
        // Find all partners the user voted for
        for (uint256 i = 0; i < partnerRegistry.getPartnerCount(); i++) {
            uint256 userVoteAmount = userVotes[currentPeriod][user][i];
            if (userVoteAmount > 0) {
                // Remove votes
                partnerVotes[currentPeriod][i] -= userVoteAmount;
                periodTotalVotes[currentPeriod] -= userVoteAmount;
                userVotes[currentPeriod][user][i] = 0;
                
                emit VoteRemoved(user, i, userVoteAmount, currentPeriod);
            }
        }
        
        // Mark user as not having voted
        hasVoted[currentPeriod][user] = false;
    }
    
    /**
     * @dev Calculate probability boosts based on votes
     * Can be called by anyone, but has a time restriction
     */
    function calculateBoosts() external {
        // Check if 24 hours have passed since last calculation
        require(block.timestamp >= lastCalculation + 1 days, "Too soon to recalculate");
        
        // Update period if needed
        updatePeriodIfNeeded();
        
        // Get total votes in the current period
        uint256 totalVotes = periodTotalVotes[currentPeriod];
        
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
                uint256 votes = partnerVotes[currentPeriod][i];
                
                // Calculate partner's share of the boost
                uint256 boost = votes * MAX_TOTAL_BOOST / totalVotes;
                
                // Update partner's probability boost if changed
                if (boost != partnerProbabilityBoost[i]) {
                    partnerProbabilityBoost[i] = boost;
                    emit PartnerBoostUpdated(i, boost);
                }
            }
        }
        
        // Update last calculation timestamp
        lastCalculation = block.timestamp;
        
        emit BoostCalculated(currentPeriod, totalVotes);
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
        if (calculatedPeriod > currentPeriod) {
            currentPeriod = calculatedPeriod;
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
} 