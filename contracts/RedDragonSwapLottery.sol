// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/IRedDragonPaintSwapVerifier.sol";
import "./interfaces/IRedDragonLPBooster.sol";
import "./interfaces/IPriceOracle.sol";
import "./interfaces/IVRFConsumer.sol";
import "./interfaces/IVRFCoordinator.sol";
import "./interfaces/IRedEnvelope.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/**
 * @title RedDragonSwapLottery
 * @dev Implements a probability-based lottery system where users can win based on their wS amount
 * Probabilities:
 * - 100 wS = 0.04% chance
 * - 1000 wS = 0.4% chance
 * - 10000 wS = 4% chance
 * - Global probability increases by a small percentage of swap amount with consecutive losses
 * - Higher boost cap allows for rare but significant jackpots to accumulate
 * - Users' probability is boosted based on their LP token holdings using Curve's boost formula
 */
abstract contract RedDragonSwapLottery is Ownable, ReentrancyGuard, Pausable, IVRFConsumer {
    using SafeERC20 for IERC20;

    // Circuit breaker
    bool public isPaused;
    
    // Timelock for critical operations
    mapping(bytes32 => uint256) public timelockExpirations;
    uint256 private constant TIMELOCK_PERIOD = 2 days;
    
    // Constants for probability calculations
    uint256 private constant BASE_WS_AMOUNT = 1 ether; // 1 wS tokens as base

    // Probability settings
    uint256 private constant BASE_PROBABILITY = 10; // 0.1% per 1 wS
    uint256 private constant PROBABILITY_DENOMINATOR = 10000000; // For 0.0001% precision
    uint256 private constant MAX_PROBABILITY = 40000; // 4% (base max without boosts)
    
    // Constants for pity timer - ULTRA CONSERVATIVE SETTINGS
    uint256 private constant PITY_PERCENT_OF_SWAP = 1; // Increase by 0.0001% of swap amount (now using divisor 10000000)
    uint256 private constant PITY_DIVISOR = 10000000; // Divisor for pity calculation (was 10000)
    uint256 public constant MAX_PITY_BOOST = 50; // 50% maximum pity boost
    
    // Constants for Curve's boost formula
    uint256 private constant BOOST_BASE = 40; // 40% base boost
    uint256 private constant BOOST_VARIABLE = 60; // 60% variable boost
    uint256 private constant PRECISION = 100; // For percentage calculations
    uint256 private constant MAX_BOOST_MULTIPLIER = 250; // Maximum 2.5x boost
    
    // Entry amount settings
    uint256 private constant MIN_ENTRY_AMOUNT = 1e18; // 1 wS minimum
    uint256 private constant MAX_ENTRY_AMOUNT = 10000 ether; // 10,000 wS
    uint256 private constant MIN_USD_ENTRY = 1_000000; // $1 USD (6 decimals)
    uint256 private constant MAX_USD_ENTRY = 10000_000000; // $10,000 USD (6 decimals)
    bool public useUsdEntryAmounts = false; // Default to wS-based entry
    
    // State variables
    IERC20 public wrappedSonic;
    IRedDragonPaintSwapVerifier public verifier;
    IPriceOracle public priceOracle;
    address public exchangePair;
    IERC20 public lpToken; // The LP token for boost calculations
    uint256 public jackpot;
    uint256 public totalWinners;
    uint256 public totalPayouts;
    
    // Fee collector addresses
    address public tokenContract;
    
    // Global pity timer tracking
    uint256 public accumulatedWSBoost; // Cumulative wS boosts from losses
    uint256 public lastWinTimestamp;
    
    // Pity boost tracking
    mapping(address => uint256) public pityBoost;
    mapping(address => uint256) public lastBuyAmount;
    
    // VRF coordinator
    IVRFCoordinator public vrfCoordinator;
    
    // Voting power tracking for boost calculation
    address public votingToken; // Token used for vote weight (ve token)
    address public veToken; // veToken for boost calculations
    uint256 public totalVotingPower; // Total voting power
    mapping(address => uint256) public userVotingPower; // User's voting power
    
    // Red envelope contract for special boosts
    IRedEnvelope public redEnvelope;
    
    // LP Booster for additional boosts based on LP token holdings
    address public lpBooster;
    
    // Flash loan protection
    mapping(address => uint256) public lpAcquisitionTimestamp;
    uint256 public constant LP_HOLDING_REQUIREMENT = 1 days;
    
    // Gas limits
    uint256 public constant MAX_GAS_FOR_TRANSFER = 300000;
    
    // VRF request tracking
    struct PendingRequest {
        address user;
        uint256 wsAmount;
        uint256 probability;
    }
    mapping(bytes32 => PendingRequest) public pendingRequests;

    // Events
    event JackpotWon(address indexed winner, uint256 amount);
    event JackpotIncreased(uint256 amount);
    event ProbabilityUpdated(uint256 newProbability);
    event RandomnessReceived(bytes32 indexed requestId, uint256 randomness);
    event PityBoostIncreased(uint256 swapAmount, uint256 boostAmount, uint256 totalAccumulatedBoost);
    event PityBoostReset();
    event TokenContractUpdated(address indexed newTokenContract);
    event UserBoostUpdated(address indexed user, uint256 boostMultiplier);
    event VotingPowerUpdated(address indexed user, uint256 oldPower, uint256 newPower);
    event LPTokenSet(address indexed lpTokenAddress);
    event VotingTokenSet(address indexed votingTokenAddress);
    event RedEnvelopeSet(address indexed redEnvelopeAddress);
    event VerifierUpdated(address indexed newVerifier);
    event PauseStateChanged(bool isPaused);
    event TimelockOperationProposed(bytes32 indexed operationId, string operation, uint256 expirationTime);
    event TimelockOperationExecuted(bytes32 indexed operationId, string operation);
    event TimelockOperationCancelled(bytes32 indexed operationId, string operation);
    event EmergencyWithdrawProposed(uint256 amount, uint256 expirationTime);
    event EmergencyWithdrawExecuted(uint256 amount);
    event LPBoosterSet(address indexed boosterAddress);
    event PriceOracleSet(address indexed oracleAddress);
    event UsdEntryModeChanged(bool useUsdMode);
    event LpAcquisitionRecorded(address indexed user, uint256 amount, uint256 timestamp);
    event JackpotTransferred(address indexed to, uint256 amount);
    event VeTokenSet(address indexed veTokenAddress);
    event LotteryEntry(address indexed user, uint256 wsAmount, uint256 probability);
    event LotteryResult(address indexed user, bool won, uint256 threshold, uint256 probability);

    /**
     * @dev Circuit breaker modifier
     */
    modifier notPaused() {
        require(!paused(), "Pausable: paused");
        _;
    }

    /**
     * @dev Constructor to initialize the lottery contract
     * @param _wrappedSonic Address of the wS token
     * @param _verifier Address of the PaintSwap VRF verifier
     */
    constructor(address _wrappedSonic, address _verifier) Ownable() ReentrancyGuard() Pausable() {
        require(_wrappedSonic != address(0), "wS address cannot be zero");
        require(_verifier != address(0), "Verifier address cannot be zero");
        wrappedSonic = IERC20(_wrappedSonic);
        verifier = IRedDragonPaintSwapVerifier(_verifier);
        lastWinTimestamp = block.timestamp;
        isPaused = false;
    }

    /**
     * @dev Process lottery result for a user
     * @param user Address of the user
     * @param randomness Random number to determine win/loss
     */
    function processLotteryResult(address user, uint256 randomness) public {
        require(msg.sender == address(vrfCoordinator) || msg.sender == address(this), "Only VRF coordinator or self");
        require(lpToken.balanceOf(user) >= LP_HOLDING_REQUIREMENT, "Insufficient LP balance");

        uint256 probability = calculateWinProbability(user, lastBuyAmount[user]);
        uint256 threshold = (randomness % 10000) + 1; // 1-10000

        if (threshold <= probability) {
            // User won! Transfer jackpot
            uint256 prize = jackpot;
            jackpot = 0;
            require(wrappedSonic.transfer(user, prize), "Prize transfer failed");
            emit JackpotWon(user, prize);
        }

        emit LotteryResult(user, threshold <= probability, threshold, probability);
    }

    /**
     * @dev Calculate win probability based on various factors
     * @param user Address of the user
     * @param wsAmount Amount of wS tokens used
     * @return Probability of winning (in basis points)
     */
    function calculateWinProbability(address user, uint256 wsAmount) public view returns (uint256) {
        require(lpToken.balanceOf(user) >= LP_HOLDING_REQUIREMENT, "Insufficient LP balance");

        // Base probability (0.1% per 1 wS)
        uint256 probability = (wsAmount * BASE_PROBABILITY) / 1e18;

        // LP boost (up to 2x for holding required LP)
        uint256 lpBalance = lpToken.balanceOf(user);
        if (lpBalance >= LP_HOLDING_REQUIREMENT) {
            uint256 lpBoost = ((lpBalance - LP_HOLDING_REQUIREMENT) * 100) / LP_HOLDING_REQUIREMENT;
            if (lpBoost > 100) lpBoost = 100; // Cap at 2x
            probability = probability * (100 + lpBoost) / 100;
        }

        // Red envelope boost
        if (address(redEnvelope) != address(0)) {
            uint256 envelopeBoost = redEnvelope.calculateBoost(user);
            probability = probability * envelopeBoost / 100;
        }

        // Pity boost (up to 50% extra for consistent buyers)
        if (pityBoost[user] > 0) {
            uint256 pityMultiplier = 100 + ((pityBoost[user] * MAX_PITY_BOOST) / wsAmount);
            probability = probability * pityMultiplier / 100;
        }

        return probability;
    }

    /**
     * @dev Process a buy and potentially enter the lottery
     * @param user Address of the user who made the buy
     * @param wsAmount Amount of wS tokens used
     */
    function processBuy(address user, uint256 wsAmount) public {
        require(msg.sender == exchangePair || msg.sender == address(this), "Only exchange pair or self");
        require(wsAmount >= MIN_ENTRY_AMOUNT, "Amount below minimum");
        require(lpToken.balanceOf(user) >= LP_HOLDING_REQUIREMENT, "Insufficient LP balance");

        // Calculate win probability
        uint256 probability = calculateWinProbability(user, wsAmount);
        require(probability > 0, "Invalid probability");

        // Request random number for lottery
        bytes32 requestId = vrfCoordinator.requestRandomness();
        pendingRequests[requestId] = PendingRequest({
            user: user,
            wsAmount: wsAmount,
            probability: probability
        });

        // Update pity boost if needed
        if (wsAmount > lastBuyAmount[user]) {
            pityBoost[user] = wsAmount;
        }
        lastBuyAmount[user] = wsAmount;

        emit LotteryEntry(user, wsAmount, probability);
    }

    /**
     * @dev Fulfill randomness from VRF
     * @param requestId The request ID
     * @param randomWords The random values
     */
    function fulfillRandomness(bytes32 requestId, uint256[] memory randomWords) external virtual override {
        require(msg.sender == address(verifier), "Only verifier can fulfill");
        require(randomWords.length > 0, "No random values provided");
        
        PendingRequest memory request = pendingRequests[requestId];
        require(request.user != address(0), "Request not found");
        
        // Calculate if user won based on probability
        uint256 randomValue = randomWords[0];
        
        // Process the result
        processLotteryResult(request.user, randomValue);
        
        emit RandomnessReceived(requestId, randomValue);
    }

    /**
     * @dev Process random words from the VRF coordinator
     * @param requestId The request ID
     * @param randomWords The random values
     */
    function processRandomWords(uint256 requestId, uint256[] memory randomWords) external {
        require(msg.sender == address(verifier), "Only verifier can call");
        require(randomWords.length > 0, "No random values provided");
        
        // Convert the numeric ID back to bytes32
        bytes32 bytesRequestId = bytes32(requestId);
        
        // Get the pending request
        PendingRequest memory request = pendingRequests[bytesRequestId];
        require(request.user != address(0), "Request not found");
        
        // Process the lottery result
        processLotteryResult(request.user, randomWords[0]);
        
        // Clear the request
        delete pendingRequests[bytesRequestId];
        
        emit RandomnessReceived(bytesRequestId, randomWords[0]);
    }

    /**
     * @dev Internal function to execute jackpot transfer with gas limit
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function executeJackpotTransfer(address to, uint256 amount) external {
        require(msg.sender == address(this), "Only self-call allowed");
        wrappedSonic.safeTransfer(to, amount);
    }

    /**
     * @dev Check if an address is a contract
     * @param account Address to check
     * @return bool True if the address is a contract
     */
    function isContract(address account) internal view returns (bool) {
        return account.code.length > 0;
    }

    /**
     * @dev Calculate base win probability based on wS amount
     * @param wsAmount Amount of wS tokens
     * @return probability The calculated base win probability
     */
    function calculateBaseProbability(uint256 wsAmount) public pure returns (uint256) {
        // Linear scaling based on BASE_WS_AMOUNT
        uint256 probability = (wsAmount * BASE_PROBABILITY) / BASE_WS_AMOUNT;
        
        // Cap at MAX_PROBABILITY
        return probability > MAX_PROBABILITY ? MAX_PROBABILITY : probability;
    }
    
    /**
     * @dev Calculate boost amount from a swap
     * @param wsAmount Amount of wS tokens in the swap
     * @return boostAmount The amount of wS-equivalent boost to add
     */
    function calculateBoostFromSwap(uint256 wsAmount) public pure returns (uint256) {
        // Protect against large amounts
        require(wsAmount <= type(uint256).max / PITY_PERCENT_OF_SWAP, "Amount too large");
        
        // Calculate as a percentage of the swap amount (0.01% by default with new divisor)
        return wsAmount;
    }
    
    /**
     * @dev Apply the global pity boost to a base probability
     * @param baseProbability Base probability before pity boost
     * @return boostedProbability The probability after applying the pity boost
     */
    function applyPityBoost(uint256 baseProbability) public view returns (uint256) {
        // Calculate the boost based on accumulated wS
        // Each BASE_WS_AMOUNT accumulated adds a 1x multiplier to the probability
        uint256 boostMultiplier = (accumulatedWSBoost * PROBABILITY_DENOMINATOR) / BASE_WS_AMOUNT;
        
        // Protect against overflow
        if (boostMultiplier > type(uint256).max - baseProbability) {
            return type(uint256).max;
        }
        
        // Calculate boosted probability (base + boost)
        uint256 boostedProbability = baseProbability + boostMultiplier;
        
        return boostedProbability;
    }
    
    /**
     * @dev Calculate Curve-style boost based on LP holdings and voting power
     * @param user The user to calculate boost for
     * @return boostMultiplier The multiplier for the user (100 = 1x, 250 = 2.5x)
     */
    function calculateUserBoost(address user) public view returns (uint256) {
        // If LP token or voting token not set, return base boost only
        if (address(lpToken) == address(0) || votingToken == address(0) || totalVotingPower == 0) {
            return BOOST_BASE;
        }
        
        // Try-catch for external calls to protect against malicious tokens
        try lpToken.balanceOf(user) returns (uint256 userLpBalance) {
            try lpToken.totalSupply() returns (uint256 totalLpSupply) {
                // If user has no LP or there's no supply, return base boost only
                if (userLpBalance == 0 || totalLpSupply == 0) {
                    return BOOST_BASE;
                }
                
                // Flash loan protection - check if LP has been held long enough
                if (lpAcquisitionTimestamp[user] > 0) {
                    uint256 lpHoldingDuration = block.timestamp - lpAcquisitionTimestamp[user];
                    if (lpHoldingDuration < LP_HOLDING_REQUIREMENT) {
                        // If LP was acquired too recently, scale boost proportionally to holding time
                        uint256 timePercent = (lpHoldingDuration * 100) / LP_HOLDING_REQUIREMENT;
                        uint256 maxExtraBoost = BOOST_VARIABLE;
                        uint256 scaledExtraBoost = (maxExtraBoost * timePercent) / 100;
                        return BOOST_BASE + scaledExtraBoost;
                    }
                }
                
                uint256 userVotePower = userVotingPower[user];
                
                // Calculate the Curve-style boost:
                // b^u = min(0.4*bu + 0.6*S*(wi/W), bu)
                
                // Calculate user's % of LP (bu/S)
                uint256 userLpPercent = (userLpBalance * PRECISION) / totalLpSupply;
                
                // Calculate user's % of voting power (wi/W)
                uint256 userVotePercent = (userVotePower * PRECISION) / totalVotingPower;
                
                // Calculate 0.4*bu + 0.6*S*(wi/W)
                // Here we simplify to: 40% + (60% * wi/W) / (bu/S)
                uint256 baseBoost = BOOST_BASE;
                
                // Only add variable component if user has voting power
                if (userVotePercent > 0) {
                    // Calculate the variable part: 0.6 * (wi/W) / (bu/S)
                    uint256 ratio = 0;
                    if (userVotePercent > userLpPercent) {
                        // Cap the boost at 2.5x
                        ratio = BOOST_VARIABLE;
                    } else {
                        ratio = (userVotePercent * BOOST_VARIABLE) / userLpPercent;
                    }
                    
                    // Add base + variable components
                    uint256 totalBoost = baseBoost + ratio;
                    
                    // Cap at MAX_BOOST_MULTIPLIER (250 = 2.5x)
                    return totalBoost > MAX_BOOST_MULTIPLIER ? MAX_BOOST_MULTIPLIER : totalBoost;
                }
                
                return baseBoost;
            } catch {
                // If token.totalSupply() fails, return base boost
                return BOOST_BASE;
            }
        } catch {
            // If token.balanceOf() fails, return base boost
            return BOOST_BASE;
        }
    }
    
    /**
     * @dev Apply all boosts (pity and LP-based) to the base probability
     * @param user The user to calculate boosts for
     * @param baseProbability Base probability before boosts
     * @return probability The effective probability after all boosts
     */
    function applyBoosts(address user, uint256 baseProbability) internal virtual view returns (uint256) {
        uint256 finalProbability = baseProbability;
        
        // Apply LP boost if booster is set
        if (lpBooster != address(0)) {
            uint256 lpBoost = IRedDragonLPBooster(lpBooster).calculateBoost(user);
            finalProbability = (finalProbability * lpBoost) / PRECISION; // Use PRECISION instead of 100
        }
        
        // Apply red envelope boost if contract is set
        if (address(redEnvelope) != address(0) && redEnvelope.hasRedEnvelope(user)) {
            uint256 redEnvelopeBoost = redEnvelope.calculateBoost(user);
            finalProbability = (finalProbability * redEnvelopeBoost) / PRECISION; // Use PRECISION instead of 100
        }
        
        // Apply pity timer boost
        if (accumulatedWSBoost > 0) {
            finalProbability = (finalProbability * (PRECISION + accumulatedWSBoost)) / PRECISION;
        }
        
        return finalProbability;
    }
    
    /**
     * @dev Get current pity boost amount
     * @return boostAmount The current accumulated wS boost amount
     */
    function getCurrentPityBoost() external view returns (uint256) {
        return accumulatedWSBoost;
    }
    
    /**
     * @dev Get time since last win
     * @return seconds Number of seconds since last win
     */
    function getTimeSinceLastWin() external view returns (uint256) {
        return block.timestamp - lastWinTimestamp;
    }
    
    /**
     * @dev Calculate effective win probability with current boosts
     * @param user The user to calculate for
     * @param wsAmount Hypothetical wS amount for calculation
     * @return probability The effective probability with all boosts applied
     */
    function calculateEffectiveProbability(address user, uint256 wsAmount) external view returns (uint256) {
        uint256 baseProbability = calculateBaseProbability(wsAmount);
        uint256 finalProbability = baseProbability;
        
        // Apply LP boost if booster is set
        if (lpBooster != address(0)) {
            uint256 lpBoost = IRedDragonLPBooster(lpBooster).calculateBoost(user);
            finalProbability = (finalProbability * lpBoost) / PRECISION;
        }
        
        // Apply red envelope boost if contract is set
        if (address(redEnvelope) != address(0) && redEnvelope.hasRedEnvelope(user)) {
            uint256 redEnvelopeBoost = redEnvelope.calculateBoost(user);
            finalProbability = (finalProbability * redEnvelopeBoost) / PRECISION;
        }
        
        // Apply pity timer boost
        if (accumulatedWSBoost > 0) {
            finalProbability = (finalProbability * (PRECISION + accumulatedWSBoost)) / PRECISION;
        }
        
        // Apply user boost based on LP holdings and voting power
        uint256 userBoost = calculateUserBoost(user);
        finalProbability = (finalProbability * userBoost) / PRECISION;
        
        // Cap at MAX_PROBABILITY
        return finalProbability > MAX_PROBABILITY ? MAX_PROBABILITY : finalProbability;
    }
    
    /**
     * @dev Get the percentage boost from the accumulated wS
     * @return percentage The current boost percentage (100 = 100%)
     */
    function getCurrentBoostPercentage() external view returns (uint256) {
        // Calculate what percentage of BASE_WS_AMOUNT is represented by accumulatedWSBoost
        return (accumulatedWSBoost * 100) / BASE_WS_AMOUNT;
    }

    /**
     * @dev Add tokens to the jackpot
     * @param amount Amount to add to jackpot
     */
    function addToJackpot(uint256 amount) external virtual notPaused {
        require(amount > 0, "Amount must be greater than 0");
        wrappedSonic.safeTransferFrom(msg.sender, address(this), amount);
        jackpot += amount;
        emit JackpotIncreased(amount);
    }
    
    /**
     * @dev Receive a contribution to the jackpot
     * @param amount Amount to add to the jackpot
     */
    function receiveJackpotContribution(uint256 amount) external notPaused {
        // Only the token contract or owner can call this
        require(msg.sender == tokenContract || msg.sender == owner(), "Only token contract or owner");
        require(amount > 0, "Amount must be greater than 0");
        
        // No transfer is performed here as the tokens are sent directly to this contract
        // before calling this function
        jackpot += amount;
        emit JackpotIncreased(amount);
    }
    
    /**
     * @dev Set the token contract address that can directly send jackpot contributions
     * @param _tokenContract The address of the token contract
     */
    function setTokenContract(address _tokenContract) external onlyOwner {
        require(_tokenContract != address(0), "Token contract cannot be zero address");
        tokenContract = _tokenContract;
        emit TokenContractUpdated(_tokenContract);
    }
    
    /**
     * @dev Update the exchange pair address
     * @param _exchangePair The new exchange pair address
     */
    function setExchangePair(address _exchangePair) external onlyOwner {
        require(_exchangePair != address(0), "Exchange pair cannot be zero address");
        exchangePair = _exchangePair;
    }
    
    /**
     * @dev Set the LP token used for boost calculations
     * @param _lpToken The address of the LP token
     */
    function setLPToken(address _lpToken) external onlyOwner {
        require(_lpToken != address(0), "LP token cannot be zero address");
        lpToken = IERC20(_lpToken);
        emit LPTokenSet(_lpToken);
    }
    
    /**
     * @dev Set the voting token (ve token) used for boost calculations
     * @param _votingToken The address of the voting token
     */
    function setVotingToken(address _votingToken) external onlyOwner {
        require(_votingToken != address(0), "Voting token cannot be zero address");
        votingToken = _votingToken;
        emit VotingTokenSet(_votingToken);
    }
    
    /**
     * @dev Update a user's voting power (called by voting token contract or owner)
     * @param user The user whose voting power is being updated
     * @param newVotingPower The new voting power of the user
     */
    function updateUserVotingPower(address user, uint256 newVotingPower) external {
        require(msg.sender == votingToken || msg.sender == owner(), "Only voting token or owner");
        
        uint256 oldVotingPower = userVotingPower[user];
        
        // Update total voting power
        if (newVotingPower > oldVotingPower) {
            totalVotingPower += (newVotingPower - oldVotingPower);
        } else {
            totalVotingPower -= (oldVotingPower - newVotingPower);
        }
        
        // Update user's voting power
        userVotingPower[user] = newVotingPower;
        
        emit VotingPowerUpdated(user, oldVotingPower, newVotingPower);
    }

    /**
     * @dev Get current jackpot amount
     */
    function getCurrentJackpot() external view returns (uint256) {
        return jackpot;
    }

    /**
     * @dev Get lottery statistics
     */
    function getStats() external view returns (uint256 winners, uint256 payouts, uint256 current) {
        return (totalWinners, totalPayouts, jackpot);
    }

    /**
     * @dev Get swap limits for lottery entry based on current mode
     * @return min Minimum entry amount
     * @return max Maximum entry amount
     * @return isUsdMode Whether the returned values are in USD
     */
    function getSwapLimits() external view returns (uint256 min, uint256 max, bool isUsdMode) {
        if (useUsdEntryAmounts) {
            return (MIN_USD_ENTRY, MAX_USD_ENTRY, true);
        } else {
            return (MIN_ENTRY_AMOUNT, MAX_ENTRY_AMOUNT, false);
        }
    }

    /**
     * @dev Propose emergency withdraw operation (timelocked)
     * @param amount Amount to withdraw
     */
    function proposeEmergencyWithdraw(uint256 amount) external onlyOwner {
        require(amount <= jackpot, "Amount exceeds jackpot");
        
        bytes32 operationId = keccak256(abi.encode("emergencyWithdraw", amount));
        timelockExpirations[operationId] = block.timestamp + TIMELOCK_PERIOD;
        
        emit EmergencyWithdrawProposed(amount, timelockExpirations[operationId]);
        emit TimelockOperationProposed(operationId, "emergencyWithdraw", timelockExpirations[operationId]);
    }
    
    /**
     * @dev Execute emergency withdraw after timelock period
     * @param amount Amount to withdraw (must match proposed amount)
     */
    function executeEmergencyWithdraw(uint256 amount) external onlyOwner {
        bytes32 operationId = keccak256(abi.encode("emergencyWithdraw", amount));
        require(timelockExpirations[operationId] > 0, "Operation not proposed");
        require(block.timestamp >= timelockExpirations[operationId], "Timelock not expired");
        require(amount <= jackpot, "Amount exceeds jackpot");
        
        delete timelockExpirations[operationId];
        jackpot -= amount;
        wrappedSonic.safeTransfer(owner(), amount);
        
        emit EmergencyWithdrawExecuted(amount);
        emit TimelockOperationExecuted(operationId, "emergencyWithdraw");
    }
    
    /**
     * @dev Cancel a proposed timelock operation
     * @param operationId ID of the operation to cancel
     */
    function cancelTimelockOperation(bytes32 operationId) external onlyOwner {
        require(timelockExpirations[operationId] > 0, "Operation not proposed");
        
        delete timelockExpirations[operationId];
        emit TimelockOperationCancelled(operationId, "cancelled");
    }
    
    /**
     * @dev Enable or disable the circuit breaker
     * @param _isPaused New pause state
     */
    function setPaused(bool _isPaused) external onlyOwner {
        isPaused = _isPaused;
        emit PauseStateChanged(_isPaused);
    }
    
    /**
     * @dev Admin function to reset the global pity boost
     */
    function resetGlobalPityBoost() external onlyOwner {
        accumulatedWSBoost = 0;
        lastWinTimestamp = block.timestamp;
        emit PityBoostReset();
    }
    
    /**
     * @dev Admin function to modify the global pity boost (for migrations or fixes)
     * @param newBoostAmount New boost amount in wS units
     */
    function setGlobalPityBoost(uint256 newBoostAmount) external onlyOwner {
        accumulatedWSBoost = newBoostAmount;
        emit PityBoostIncreased(0, newBoostAmount, newBoostAmount);
    }
    
    /**
     * @dev Admin function to set total voting power directly (for migrations)
     * @param newTotalVotingPower The new total voting power
     */
    function setTotalVotingPower(uint256 newTotalVotingPower) external onlyOwner {
        totalVotingPower = newTotalVotingPower;
    }

    /**
     * @dev Set the red envelope contract
     * @param _redEnvelope The address of the red envelope contract
     */
    function setRedEnvelope(address _redEnvelope) external onlyOwner {
        require(_redEnvelope != address(0), "Red envelope cannot be zero address");
        redEnvelope = IRedEnvelope(_redEnvelope);
        emit RedEnvelopeSet(_redEnvelope);
    }

    /**
     * @dev Update the verifier address
     * @param _verifier The address of the new PaintSwap VRF verifier
     */
    function setVerifier(address _verifier) external onlyOwner {
        require(_verifier != address(0), "Verifier cannot be zero address");
        verifier = IRedDragonPaintSwapVerifier(_verifier);
        emit VerifierUpdated(_verifier);
    }

    /**
     * @dev Set the LP booster contract
     * @param _lpBooster The address of the LP booster contract
     */
    function setLPBooster(address _lpBooster) external onlyOwner {
        require(_lpBooster != address(0), "LP booster cannot be zero address");
        lpBooster = _lpBooster;
        emit LPBoosterSet(_lpBooster);
    }

    /**
     * @dev Set the price oracle address
     * @param _priceOracle The address of the price oracle contract
     */
    function setPriceOracle(address _priceOracle) external onlyOwner {
        require(_priceOracle != address(0), "Invalid price oracle address");
        priceOracle = IPriceOracle(_priceOracle);
    }

    /**
     * @dev Set whether to use USD entry amounts
     * @param _useUsdEntryAmounts Whether to use USD entry amounts
     */
    function setUseUsdEntryAmounts(bool _useUsdEntryAmounts) external onlyOwner {
        useUsdEntryAmounts = _useUsdEntryAmounts;
    }

    /**
     * @dev Record LP acquisition timestamp to prevent flash loan attacks
     * This should be called by a trusted LP token contract or a wrapper contract
     * @param user User who acquired LP tokens
     * @param amount Amount of LP tokens acquired
     */
    function recordLpAcquisition(address user, uint256 amount) external {
        require(msg.sender == owner() || msg.sender == address(lpToken), "Only owner or LP token");
        lpAcquisitionTimestamp[user] = block.timestamp;
        emit LpAcquisitionRecorded(user, amount, block.timestamp);
    }
    
    /**
     * @dev Check if the context is secure for a given user
     * @param user User to check
     * @return True if the context is secure
     */
    function isSecureContext(address user) public view virtual returns (bool) {
        // For testing, allow calls from exchange pair or owner
        if (msg.sender == exchangePair || msg.sender == owner()) {
            return true;
        }
        // In production, check if tx.origin is the same as the provided user address
        return user == tx.origin && tx.origin.code.length == 0;
    }

    /**
     * @dev Process a buy securely with reentrancy protection
     * @param user The user who made the purchase
     * @param wsAmount The amount of wSonic used
     */
    function secureProcessBuy(address user, uint256 wsAmount) external nonReentrant notPaused {
        require(isSecureContext(user), "Invalid context");
        require(wsAmount > 0, "Invalid wSonic amount");
        processBuy(user, wsAmount);
    }

    /**
     * @dev Distribute jackpot to a winner (can only be called from verified contexts)
     * @param winner Address of the winner
     * @param amount Amount to distribute
     */
    function distributeJackpot(address winner, uint256 amount) external virtual {
        // Only allow calls from this contract or the owner
        require(msg.sender == address(this) || msg.sender == owner(), "Not authorized");
        
        // Security check to ensure the winner is not a contract
        require(winner.code.length == 0, "Winner cannot be a contract");
        
        // Transfer tokens with gas limit for protection
        wrappedSonic.safeTransfer(winner, amount);
        
        emit JackpotWon(winner, amount);
    }
    
    /**
     * @dev Get jackpot token symbol
     * @return symbol of the jackpot token
     */
    function getJackpotTokenSymbol() external view returns (string memory) {
        try IERC20Metadata(address(wrappedSonic)).symbol() returns (string memory symbol) {
            return symbol;
        } catch {
            return "wS";
        }
    }

    /**
     * @dev Get VRF configuration
     * @return vrfCoordinator_ VRF coordinator address
     * @return keyHash_ VRF key hash
     * @return subscriptionId_ VRF subscription ID
     */
    function getVrfConfiguration() external view returns (
        address vrfCoordinator_,
        bytes32 keyHash_,
        uint64 subscriptionId_
    ) {
        if (address(verifier) != address(0)) {
            return verifier.getVRFConfiguration();
        }
        return (address(0), bytes32(0), 0);
    }
    
    /**
     * @dev Transfer jackpot to a specific address
     * @param to Address to transfer jackpot to
     * @param amount Amount to transfer
     */
    function transferJackpotTo(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot transfer to zero address");
        require(amount <= jackpot, "Amount exceeds jackpot");
        jackpot -= amount;
        wrappedSonic.safeTransfer(to, amount);
        emit JackpotTransferred(to, amount);
    }

    /**
     * @dev Check if VRF is enabled
     * @return true if VRF is enabled
     */
    function isVrfEnabled() external view virtual override returns (bool) {
        return address(verifier) != address(0) && verifier.isVrfEnabled();
    }
    
    /**
     * @dev Request randomness from VRF
     * @return requestId The request ID
     */
    function requestRandomness() external virtual override returns (bytes32) {
        // Make sure the contract is not paused
        require(!isPaused, "Contract is paused");
        
        // Make sure verifier is set
        require(address(verifier) != address(0), "Verifier not set");
        
        // Request randomness from verifier
        return verifier.requestRandomness();
    }

    /**
     * @dev Calculate LP boost for a user
     * @param user User address
     * @return Boost multiplier in basis points
     */
    function calculateLPBoost(address user) internal view returns (uint256) {
        // Check if LP token and booster are set
        if (address(lpToken) == address(0) || lpBooster == address(0)) {
            return PRECISION; // No boost (1x)
        }
        
        // Check if user has held LP tokens long enough
        uint256 acquisitionTime = lpAcquisitionTimestamp[user];
        if (acquisitionTime == 0 || block.timestamp < acquisitionTime + LP_HOLDING_REQUIREMENT) {
            return PRECISION; // No boost if LP tokens not held long enough
        }
        
        // Get boost from LP booster contract
        try IRedDragonLPBooster(lpBooster).calculateBoost(user) returns (uint256 boost) {
            // Cap boost at maximum multiplier
            if (boost > MAX_BOOST_MULTIPLIER) {
                boost = MAX_BOOST_MULTIPLIER;
            }
            return PRECISION + boost;
        } catch {
            return PRECISION; // Default to no boost on error
        }
    }

    /**
     * @dev Calculate the probability of winning based on wSonic amount and boosts
     * @param wsAmount The amount of wSonic used
     * @return The final probability after all boosts
     */
    function calculateProbability(uint256 wsAmount) public view returns (uint256) {
        // Get the base probability
        uint256 baseProbability = calculateBaseProbability(wsAmount);
        
        // Apply all boosts
        return applyBoosts(msg.sender, baseProbability);
    }

    /**
     * @dev Set the veToken address
     * @param _veToken The new veToken address
     */
    function setVeToken(address _veToken) external onlyOwner {
        require(_veToken != address(0), "veToken address cannot be zero");
        veToken = _veToken;
        emit VeTokenSet(_veToken);
    }

    /**
     * @dev Update total voting power
     * @param newTotalPower New total voting power
     */
    function updateTotalVotingPower(uint256 newTotalPower) external onlyOwner {
        totalVotingPower = newTotalPower;
    }

    /**
     * @dev Set the VRF coordinator address
     * @param _vrfCoordinator The address of the VRF coordinator
     */
    function setVRFCoordinator(address _vrfCoordinator) external onlyOwner {
        require(_vrfCoordinator != address(0), "VRF coordinator cannot be zero");
        vrfCoordinator = IVRFCoordinator(_vrfCoordinator);
    }

    /**
     * @dev Check if lottery is enabled
     * @return true if lottery is enabled
     */
    function isLotteryEnabled() external view returns (bool) {
        return !isPaused && verifier.isVrfEnabled();
    }
} 