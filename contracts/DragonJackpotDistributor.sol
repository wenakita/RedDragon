// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./math/HermesMath.sol";

/**
 * @title DragonJackpotDistributor
 * @dev Contract responsible for distributing jackpot rewards using the Hermès formula
 * to dynamically adjust prize distribution based on jackpot size and participation
 */
contract DragonJackpotDistributor is Ownable {
    using SafeERC20 for IERC20;
    
    // Token addresses
    address public immutable wrappedSonic;
    
    // Jackpot state
    uint256 public totalJackpot;
    uint256 public undistributedJackpot;
    uint256 public lastWinTime;
    
    // Distribution parameters
    uint256 public baseDistributionPercentage; // Base percentage of jackpot to distribute (scaled by 1e18)
    uint256 public minDistributionPercentage;  // Minimum percentage of jackpot to distribute (scaled by 1e18)
    uint256 public maxDistributionPercentage;  // Maximum percentage of jackpot to distribute (scaled by 1e18)
    
    // Factors affecting adaptive distribution
    uint256 public recentTradingVolume;        // Recent trading volume to influence distribution
    uint256 public participantWeightFactor;    // How much to weight participant count (scaled by 1e18)
    uint256 public timeSinceLastWinFactor;     // How much to weight time since last win (scaled by 1e18)
    uint256 public jackpotSizeFactor;          // How much to weight jackpot size (scaled by 1e18)
    
    // Hermes formula parameters
    uint256 public paramD;
    uint256 public paramN;
    uint256 public minMainPrize; // Minimum percentage for main prize (scaled by 1e18)
    uint256 public maxMainPrize; // Maximum percentage for main prize (scaled by 1e18)
    
    // Lottery participation tracking
    mapping(uint256 => address[]) public roundParticipants;
    mapping(address => bool) public isParticipant;
    uint256 public currentRound;
    
    // Events
    event JackpotIncreased(uint256 amount, uint256 newTotal);
    event PrizesDistributed(
        uint256 indexed round, 
        address mainWinner, 
        uint256 mainPrize,
        uint256 secondaryPrizePool,
        uint256 participationPool,
        uint256 totalParticipants,
        uint256 remainingJackpot,
        uint256 distributionPercentage
    );
    event SecondaryPrizeAwarded(uint256 indexed round, address indexed winner, uint256 amount);
    event ParticipationRewardDistributed(uint256 indexed round, uint256 participantsCount, uint256 amountPerParticipant);
    event HermesParamsUpdated(uint256 paramD, uint256 paramN, uint256 minMainPrize, uint256 maxMainPrize);
    event DistributionParamsUpdated(
        uint256 baseDistributionPercentage,
        uint256 minDistributionPercentage,
        uint256 maxDistributionPercentage
    );
    event AdaptiveFactorsUpdated(
        uint256 participantWeightFactor,
        uint256 timeSinceLastWinFactor,
        uint256 jackpotSizeFactor
    );
    event TradingVolumeUpdated(uint256 newVolume);
    
    /**
     * @dev Constructor
     * @param _wrappedSonic Address of the wS token
     */
    constructor(address _wrappedSonic) Ownable() {
        require(_wrappedSonic != address(0), "Invalid wS address");
        
        wrappedSonic = _wrappedSonic;
        
        // Initialize distribution parameters
        baseDistributionPercentage = 69 * 1e18 / 100; // Default 69%
        minDistributionPercentage = 59 * 1e18 / 100;  // Minimum 59%
        maxDistributionPercentage = 79 * 1e18 / 100;  // Maximum 79%
        
        // Initialize adaptive factors
        participantWeightFactor = 30 * 1e18 / 100;    // 30% weight for participant count
        timeSinceLastWinFactor = 30 * 1e18 / 100;     // 30% weight for time since last win
        jackpotSizeFactor = 40 * 1e18 / 100;          // 40% weight for jackpot size
        
        // Initialize Hermes formula parameters
        paramD = 100 * 1e18; // Default value
        paramN = 10 * 1e18;  // Default value
        minMainPrize = 70 * 1e18 / 100; // 70%
        maxMainPrize = 95 * 1e18 / 100; // 95%
        
        currentRound = 1;
    }
    
    /**
     * @notice Add funds to the jackpot
     * @param _amount Amount to add to jackpot
     */
    function addToJackpot(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        
        // Transfer tokens from sender to this contract
        IERC20(wrappedSonic).safeTransferFrom(msg.sender, address(this), _amount);
        
        // Update jackpot
        totalJackpot += _amount;
        undistributedJackpot += _amount;
        
        emit JackpotIncreased(_amount, totalJackpot);
    }
    
    /**
     * @notice Register a lottery participant
     * @param _participant Address of the participant
     */
    function registerParticipant(address _participant) external onlyOwner {
        if (!isParticipant[_participant]) {
            roundParticipants[currentRound].push(_participant);
            isParticipant[_participant] = true;
        }
    }
    
    /**
     * @notice Update trading volume information
     * @param _volume New trading volume value
     */
    function updateTradingVolume(uint256 _volume) external onlyOwner {
        recentTradingVolume = _volume;
        emit TradingVolumeUpdated(_volume);
    }
    
    /**
     * @notice Calculate the adaptive distribution percentage based on current conditions
     * @return distributionPercentage The percentage of jackpot to distribute (scaled by 1e18)
     */
    function calculateDistributionPercentage() public view returns (uint256) {
        // If no jackpot or no participants, return the base percentage
        if (undistributedJackpot == 0 || roundParticipants[currentRound].length == 0) {
            return baseDistributionPercentage;
        }
        
        // Calculate factors that influence distribution percentage
        
        // 1. Participant factor: More participants = higher distribution
        uint256 participantCount = roundParticipants[currentRound].length;
        uint256 participantFactor = 0;
        if (participantCount > 100) {
            participantFactor = 1e18; // Max factor
        } else if (participantCount > 0) {
            participantFactor = participantCount * 1e18 / 100;
        }
        
        // 2. Time factor: Longer time since last win = higher distribution
        uint256 timeFactor = 0;
        if (lastWinTime > 0) {
            uint256 timeSinceLastWin = block.timestamp - lastWinTime;
            // Cap at 30 days
            uint256 maxTime = 30 days;
            timeFactor = timeSinceLastWin >= maxTime ? 1e18 : (timeSinceLastWin * 1e18 / maxTime);
        }
        
        // 3. Jackpot size factor: Larger jackpot = higher distribution
        uint256 targetJackpotSize = 1_000_000 * 1e18; // Example: 1 million wS tokens
        uint256 sizeFactor = undistributedJackpot >= targetJackpotSize ? 
                            1e18 : 
                            undistributedJackpot * 1e18 / targetJackpotSize;
        
        // Combine factors using weights
        uint256 combinedFactor = (participantFactor * participantWeightFactor + 
                                timeFactor * timeSinceLastWinFactor + 
                                sizeFactor * jackpotSizeFactor) / 1e18;
        
        // Use Hermès formula to smooth the factor
        uint256[4] memory hermesParams;
        hermesParams[0] = paramD;
        hermesParams[1] = paramN;
        hermesParams[2] = 0;
        hermesParams[3] = 0;
        uint256 smoothedFactor = HermesMath.calculateHermesValue(combinedFactor, paramD, paramN);
        
        // Calculate the adaptive percentage between min and max
        uint256 range = maxDistributionPercentage - minDistributionPercentage;
        uint256 adaptivePercentage = minDistributionPercentage + (smoothedFactor * range / 1e18);
        
        // Ensure within bounds
        if (adaptivePercentage < minDistributionPercentage) {
            return minDistributionPercentage;
        } else if (adaptivePercentage > maxDistributionPercentage) {
            return maxDistributionPercentage;
        }
        
        return adaptivePercentage;
    }
    
    /**
     * @notice Distribute jackpot to winners using dynamic distribution
     * @param _mainWinner Address of the main winner (selected by VRF)
     * @param _secondaryWinners Array of addresses of secondary winners
     * @param _secondaryShares Array of percentages for each secondary winner (scaled by 1e18)
     */
    function distributeJackpot(
        address _mainWinner,
        address[] calldata _secondaryWinners,
        uint256[] calldata _secondaryShares
    ) external onlyOwner {
        require(undistributedJackpot > 0, "No jackpot to distribute");
        require(_mainWinner != address(0), "Invalid main winner");
        
        if (_secondaryWinners.length > 0) {
            require(_secondaryWinners.length == _secondaryShares.length, "Arrays length mismatch");
        }
        
        // Get distribution parameters using the Hermès formula
        address[] memory participants = roundParticipants[currentRound];
        uint256 participantsCount = participants.length;
        
        // Calculate the actual amount to distribute using adaptive distribution percentage
        uint256 distributionPercentage = calculateDistributionPercentage();
        uint256 amountToDistribute = (undistributedJackpot * distributionPercentage) / 1e18;
        
        // Prepare parameters array for HermesMath library
        uint256[4] memory params = [paramD, paramN, minMainPrize, maxMainPrize];
        
        // Calculate prize distribution using Hermès formula
        (
            uint256 mainPrizePercentage,
            uint256 secondaryPrizePercentage,
            uint256 participationRewardsPercentage
        ) = HermesMath.calculateJackpotDistribution(
            amountToDistribute,
            participantsCount,
            params
        );
        
        // Calculate actual prize amounts
        uint256 mainPrizeAmount = (amountToDistribute * mainPrizePercentage) / 1e18;
        uint256 secondaryPrizePool = (amountToDistribute * secondaryPrizePercentage) / 1e18;
        uint256 participationPool = amountToDistribute - mainPrizeAmount - secondaryPrizePool;
        
        // Update undistributed jackpot (keeping the remainder for the next round)
        uint256 remainingJackpot = undistributedJackpot - amountToDistribute;
        undistributedJackpot = remainingJackpot;
        
        // Distribute main prize
        IERC20(wrappedSonic).safeTransfer(_mainWinner, mainPrizeAmount);
        
        // Emit prize distribution event
        emit PrizesDistributed(
            currentRound,
            _mainWinner,
            mainPrizeAmount,
            secondaryPrizePool,
            participationPool,
            participantsCount,
            remainingJackpot,
            distributionPercentage
        );
        
        // Distribute secondary prizes if applicable
        if (_secondaryWinners.length > 0 && secondaryPrizePool > 0) {
            _distributeSecondaryPrizes(
                _secondaryWinners,
                _secondaryShares,
                secondaryPrizePool
            );
        }
        
        // Distribute participation rewards
        if (participantsCount > 0 && participationPool > 0) {
            _distributeParticipationRewards(participants, participationPool);
        }
        
        // Update state
        lastWinTime = block.timestamp;
        currentRound++;
        
        // Reset participant tracking for next round
        for (uint256 i = 0; i < participants.length; i++) {
            isParticipant[participants[i]] = false;
        }
    }
    
    /**
     * @notice Internal function to distribute secondary prizes
     * @param _winners Array of secondary winner addresses
     * @param _shares Array of percentage shares (scaled by 1e18)
     * @param _totalPool Total secondary prize pool
     */
    function _distributeSecondaryPrizes(
        address[] calldata _winners,
        uint256[] calldata _shares,
        uint256 _totalPool
    ) internal {
        // Calculate total shares to normalize
        uint256 totalShares = 0;
        for (uint256 i = 0; i < _shares.length; i++) {
            totalShares += _shares[i];
        }
        
        // Distribute to each winner based on their share
        for (uint256 i = 0; i < _winners.length; i++) {
            if (_winners[i] != address(0) && _shares[i] > 0) {
                uint256 prize = (_totalPool * _shares[i]) / totalShares;
                if (prize > 0) {
                    IERC20(wrappedSonic).safeTransfer(_winners[i], prize);
                    emit SecondaryPrizeAwarded(currentRound, _winners[i], prize);
                }
            }
        }
    }
    
    /**
     * @notice Internal function to distribute participation rewards
     * @param _participants Array of all participants
     * @param _totalPool Total participation reward pool
     */
    function _distributeParticipationRewards(
        address[] memory _participants,
        uint256 _totalPool
    ) internal {
        uint256 participantsCount = _participants.length;
        if (participantsCount == 0 || _totalPool == 0) return;
        
        // Calculate amount per participant
        uint256 amountPerParticipant = _totalPool / participantsCount;
        if (amountPerParticipant == 0) return;
        
        // Distribute evenly to all participants
        for (uint256 i = 0; i < participantsCount; i++) {
            if (_participants[i] != address(0)) {
                IERC20(wrappedSonic).safeTransfer(_participants[i], amountPerParticipant);
            }
        }
        
        emit ParticipationRewardDistributed(currentRound, participantsCount, amountPerParticipant);
    }
    
    /**
     * @notice Update Hermès formula parameters
     * @param _paramD New value for D parameter
     * @param _paramN New value for N parameter
     * @param _minMainPrize Minimum percentage for main prize (scaled by 1e18)
     * @param _maxMainPrize Maximum percentage for main prize (scaled by 1e18)
     */
    function updateHermesParams(
        uint256 _paramD,
        uint256 _paramN,
        uint256 _minMainPrize,
        uint256 _maxMainPrize
    ) external onlyOwner {
        require(_paramD > 0, "D parameter must be greater than 0");
        require(_paramN > 0, "N parameter must be greater than 0");
        require(_minMainPrize < _maxMainPrize, "Min must be less than max");
        require(_maxMainPrize <= 1e18, "Max prize must be <= 100%");
        
        paramD = _paramD;
        paramN = _paramN;
        minMainPrize = _minMainPrize;
        maxMainPrize = _maxMainPrize;
        
        emit HermesParamsUpdated(_paramD, _paramN, _minMainPrize, _maxMainPrize);
    }
    
    /**
     * @notice Get the current round participant count
     * @return count Number of participants in current round
     */
    function getCurrentParticipantCount() external view returns (uint256) {
        return roundParticipants[currentRound].length;
    }
    
    /**
     * @notice Update distribution parameters
     * @param _basePercentage Base percentage (scaled by 1e18)
     * @param _minPercentage Minimum percentage (scaled by 1e18)
     * @param _maxPercentage Maximum percentage (scaled by 1e18)
     */
    function updateDistributionParameters(
        uint256 _basePercentage,
        uint256 _minPercentage,
        uint256 _maxPercentage
    ) external onlyOwner {
        require(_minPercentage <= _basePercentage, "Min must be <= base");
        require(_basePercentage <= _maxPercentage, "Base must be <= max");
        require(_minPercentage >= 10 * 1e18 / 100, "Min too low");
        require(_maxPercentage <= 90 * 1e18 / 100, "Max too high");
        
        baseDistributionPercentage = _basePercentage;
        minDistributionPercentage = _minPercentage;
        maxDistributionPercentage = _maxPercentage;
        
        emit DistributionParamsUpdated(_basePercentage, _minPercentage, _maxPercentage);
    }
    
    /**
     * @notice Update adaptive factors
     * @param _participantWeightFactor Participant weight factor (scaled by 1e18)
     * @param _timeSinceLastWinFactor Time factor (scaled by 1e18)
     * @param _jackpotSizeFactor Jackpot size factor (scaled by 1e18)
     */
    function updateAdaptiveFactors(
        uint256 _participantWeightFactor,
        uint256 _timeSinceLastWinFactor,
        uint256 _jackpotSizeFactor
    ) external onlyOwner {
        require(
            _participantWeightFactor + _timeSinceLastWinFactor + _jackpotSizeFactor == 1e18,
            "Factors must sum to 100%"
        );
        
        participantWeightFactor = _participantWeightFactor;
        timeSinceLastWinFactor = _timeSinceLastWinFactor;
        jackpotSizeFactor = _jackpotSizeFactor;
        
        emit AdaptiveFactorsUpdated(
            _participantWeightFactor,
            _timeSinceLastWinFactor,
            _jackpotSizeFactor
        );
    }
    
    /**
     * @notice Calculate the projected prize distribution with current parameters
     * @return mainPrize Projected main prize percentage
     * @return secondaryPrize Projected secondary prize percentage
     * @return participationRewards Projected participation rewards percentage
     * @return distributionAmount Amount to be distributed
     * @return remainingAmount Amount to be kept for next round
     * @return distributionPercentage Percentage of jackpot to be distributed
     */
    function getProjectedDistribution() external view returns (
        uint256 mainPrize,
        uint256 secondaryPrize,
        uint256 participationRewards,
        uint256 distributionAmount,
        uint256 remainingAmount,
        uint256 distributionPercentage
    ) {
        uint256 participantsCount = roundParticipants[currentRound].length;
        uint256[4] memory params = [paramD, paramN, minMainPrize, maxMainPrize];
        
        // Calculate adaptive distribution percentage
        distributionPercentage = calculateDistributionPercentage();
        
        // Calculate amount to distribute
        uint256 amount = undistributedJackpot > 0 ? undistributedJackpot : 1e18;
        distributionAmount = (amount * distributionPercentage) / 1e18;
        remainingAmount = amount - distributionAmount;
        
        // Calculate distribution percentages
        (mainPrize, secondaryPrize, participationRewards) = HermesMath.calculateJackpotDistribution(
            distributionAmount,
            participantsCount,
            params
        );
        
        return (mainPrize, secondaryPrize, participationRewards, distributionAmount, remainingAmount, distributionPercentage);
    }
    
    /**
     * @notice Emergency recover tokens sent to the contract
     * @param _token Address of the token to recover
     * @param _amount Amount to recover
     */
    function emergencyRecoverTokens(address _token, uint256 _amount) external onlyOwner {
        require(_token != wrappedSonic || _amount < totalJackpot, "Cannot recover jackpot");
        
        IERC20(_token).safeTransfer(owner(), _amount);
    }
} 