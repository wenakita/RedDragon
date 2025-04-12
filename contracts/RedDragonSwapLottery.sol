// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IRedDragonPaintSwapVerifier.sol";
import "./interfaces/IRedDragonLPBooster.sol";

/**
 * @dev Interface for the thank you token that grants special boosts
 */
interface IRedDragonThankYouToken {
    function hasThankYouToken(address user) external view returns (bool);
    function calculateBoost(address user) external view returns (uint256);
}

/**
 * @title RedDragonSwapLottery
 * @dev Implements a probability-based lottery system where users can win based on their wS amount
 * Probabilities:
 * - 100 wS = 0.1% chance
 * - 1000 wS = 1% chance
 * - 10000 wS = 10% chance
 * - Global probability increases by a small percentage of swap amount with consecutive losses
 * - Higher boost cap allows for rare but significant jackpots to accumulate
 * - Users' probability is boosted based on their LP token holdings using Curve's boost formula
 */
contract RedDragonSwapLottery is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Circuit breaker
    bool public isPaused;
    
    // Timelock for critical operations
    mapping(bytes32 => uint256) private timelockExpirations;
    uint256 private constant TIMELOCK_PERIOD = 2 days;
    
    // Constants for probability calculations
    uint256 private constant BASE_WS_AMOUNT = 100 ether; // 100 wS
    uint256 private constant BASE_PROBABILITY = 1; // 0.1%
    uint256 private constant PROBABILITY_DENOMINATOR = 1000; // For 0.1% precision
    uint256 private constant MAX_PROBABILITY = 100; // 10%
    
    // Constants for pity timer - ULTRA CONSERVATIVE SETTINGS
    uint256 private constant PITY_PERCENT_OF_SWAP = 1; // Increase by 0.1% of swap amount (1 = 0.1%)
    uint256 private constant MAX_PITY_BOOST = 10000; // Maximum 10000% boost (100x)
    
    // Constants for Curve's boost formula
    uint256 private constant BOOST_BASE = 40; // 40% base boost
    uint256 private constant BOOST_VARIABLE = 60; // 60% variable boost
    uint256 private constant PRECISION = 100; // For percentage calculations
    uint256 private constant MAX_BOOST_MULTIPLIER = 250; // Maximum 2.5x boost
    
    // State variables
    IERC20 public wrappedSonic;
    IRedDragonPaintSwapVerifier public verifier;
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
    
    // Voting power tracking for boost calculation
    address public votingToken; // Token used for vote weight (ve token)
    uint256 public totalVotingPower; // Total voting power
    mapping(address => uint256) public userVotingPower; // User's voting power
    
    // Thank you token contract for special boosts
    IRedDragonThankYouToken public thankYouToken;
    
    // LP Booster for additional boosts based on LP token holdings
    address public lpBooster;
    
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
    event RandomnessRequested(bytes32 indexed requestId, address indexed user, uint256 wsAmount);
    event RandomnessReceived(bytes32 indexed requestId, uint256 randomness);
    event PityBoostIncreased(uint256 swapAmount, uint256 boostAmount, uint256 totalAccumulatedBoost);
    event PityBoostReset();
    event TokenContractUpdated(address indexed newTokenContract);
    event UserBoostUpdated(address indexed user, uint256 boostMultiplier);
    event VotingPowerUpdated(address indexed user, uint256 oldPower, uint256 newPower);
    event LPTokenSet(address indexed lpTokenAddress);
    event VotingTokenSet(address indexed votingTokenAddress);
    event ThankYouTokenSet(address indexed thankYouTokenAddress);
    event VerifierUpdated(address indexed newVerifier);
    event PauseStateChanged(bool isPaused);
    event TimelockOperationProposed(bytes32 indexed operationId, string operation, uint256 expirationTime);
    event TimelockOperationExecuted(bytes32 indexed operationId, string operation);
    event TimelockOperationCancelled(bytes32 indexed operationId, string operation);
    event EmergencyWithdrawProposed(uint256 amount, uint256 expirationTime);
    event EmergencyWithdrawExecuted(uint256 amount);
    event LPBoosterSet(address indexed boosterAddress);

    /**
     * @dev Circuit breaker modifier
     */
    modifier whenNotPaused() {
        require(!isPaused, "Contract is paused");
        _;
    }

    /**
     * @dev Constructor to initialize the lottery contract
     * @param _wrappedSonic Address of the wS token
     * @param _verifier Address of the PaintSwap VRF verifier
     */
    constructor(address _wrappedSonic, address _verifier) {
        require(_wrappedSonic != address(0), "wS address cannot be zero");
        require(_verifier != address(0), "Verifier address cannot be zero");
        wrappedSonic = IERC20(_wrappedSonic);
        verifier = IRedDragonPaintSwapVerifier(_verifier);
        lastWinTimestamp = block.timestamp;
        isPaused = false;
    }

    /**
     * @dev Process a buy and check for lottery win
     * @param user Address of the user (ignored in favor of tx.origin for safety)
     * @param wsAmount Amount of wS tokens involved
     */
    function processBuy(address user, uint256 wsAmount) external nonReentrant whenNotPaused {
        require(msg.sender == exchangePair || msg.sender == owner(), "Only exchange pair or owner can process");
        
        // Get the original trader (tx.origin) instead of using the user parameter
        address actualTrader = tx.origin;
        
        // Double verify the user parameter matches tx.origin to prevent intermediaries
        require(user == actualTrader, "User must be original sender");
        require(actualTrader != address(0), "Invalid trader address");
        require(!isContract(actualTrader), "Contracts cannot participate");
        require(wsAmount >= BASE_WS_AMOUNT, "Amount too small for lottery");

        // Calculate base win probability based on wS amount
        uint256 baseProbability = calculateBaseProbability(wsAmount);
        
        // Apply global pity boost and user-specific LP boost
        uint256 probability = applyBoosts(actualTrader, baseProbability);
        
        // Request randomness from PaintSwap VRF
        bytes32 requestId = verifier.requestRandomness();
        
        // Store request details
        pendingRequests[requestId] = PendingRequest({
            user: actualTrader,
            wsAmount: wsAmount,
            probability: probability
        });

        emit RandomnessRequested(requestId, actualTrader, wsAmount);
    }

    /**
     * @dev Callback function called by PaintSwap VRF when randomness is ready
     * @param requestId The ID of the randomness request
     * @param randomWords The random values generated
     */
    function fulfillRandomness(bytes32 requestId, uint256[] memory randomWords) external whenNotPaused {
        require(msg.sender == address(verifier), "Only verifier can fulfill");
        require(randomWords.length > 0, "No random values provided");

        PendingRequest memory request = pendingRequests[requestId];
        require(request.user != address(0), "Request not found");
        
        // Verify user is still a valid EOA and not a contract
        require(!isContract(request.user), "Winner cannot be a contract");

        emit RandomnessReceived(requestId, randomWords[0]);

        // Calculate if user won based on probability
        uint256 randomValue = randomWords[0] % PROBABILITY_DENOMINATOR;
        bool isWinner = randomValue < request.probability;

        if (isWinner && jackpot > 0) {
            uint256 winAmount = jackpot;
            jackpot = 0;
            totalWinners++;
            totalPayouts += winAmount;
            
            // Reset global pity boost on win
            accumulatedWSBoost = 0;
            lastWinTimestamp = block.timestamp;
            emit PityBoostReset();
            
            // Use SafeERC20
            wrappedSonic.safeTransfer(request.user, winAmount);
            emit JackpotWon(request.user, winAmount);
        } else {
            // Increase global pity boost on loss based on swap amount
            uint256 boostAmount = calculateBoostFromSwap(request.wsAmount);
            accumulatedWSBoost += boostAmount;
            
            // Cap the accumulated boost
            if (accumulatedWSBoost > MAX_PITY_BOOST * BASE_WS_AMOUNT) {
                accumulatedWSBoost = MAX_PITY_BOOST * BASE_WS_AMOUNT;
            }
            
            emit PityBoostIncreased(request.wsAmount, boostAmount, accumulatedWSBoost);
        }

        // Clean up
        delete pendingRequests[requestId];
    }

    /**
     * @dev Check if an address is a contract
     * @param account Address to check
     * @return bool True if the address is a contract
     */
    function isContract(address account) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }

    /**
     * @dev Calculate base win probability based on wS amount
     * @param wsAmount Amount of wS tokens
     * @return probability The calculated base win probability
     */
    function calculateBaseProbability(uint256 wsAmount) public pure returns (uint256) {
        // Prevent overflow by checking maximum input
        require(wsAmount <= type(uint256).max / BASE_PROBABILITY, "Amount too large");
        
        uint256 probability = (wsAmount * BASE_PROBABILITY) / BASE_WS_AMOUNT;
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
        
        // Calculate as a percentage of the swap amount (0.1% by default)
        return (wsAmount * PITY_PERCENT_OF_SWAP) / 1000;
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
            return MAX_PROBABILITY;
        }
        
        // Calculate boosted probability (base + boost)
        uint256 boostedProbability = baseProbability + boostMultiplier;
        
        // Cap at maximum probability
        return boostedProbability > MAX_PROBABILITY ? MAX_PROBABILITY : boostedProbability;
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
    function applyBoosts(address user, uint256 baseProbability) public view returns (uint256) {
        // First apply pity boost based on global consecutive losses
        uint256 pityBoostedProbability = applyPityBoost(baseProbability);
        
        // Then apply user-specific boost based on LP holdings and voting power
        uint256 boostMultiplier = calculateUserBoost(user);
        
        // Calculate boosted probability (applying the curve-style boost)
        uint256 finalProbability = (pityBoostedProbability * boostMultiplier) / PRECISION;
        
        // Apply special thank you token boost if applicable
        if (address(thankYouToken) != address(0)) {
            try thankYouToken.calculateBoost(user) returns (uint256 thankYouBoost) {
                if (thankYouBoost > 0) {
                    // The thank you boost is in units of BOOST_PRECISION (10000)
                    // 69 = 0.69%
                    finalProbability += (finalProbability * thankYouBoost) / 10000;
                }
            } catch {
                // If token calculation fails, continue without thank you boost
            }
        }
        
        // Apply LP Booster if configured
        if (lpBooster != address(0)) {
            try IRedDragonLPBooster(lpBooster).calculateBoost(user) returns (uint256 lpBoost) {
                if (lpBoost > 0) {
                    // The LP boost is in percentage points of probability (units of 10000)
                    finalProbability += (finalProbability * lpBoost) / 10000;
                }
            } catch {
                // If booster calculation fails, continue without LP boost
            }
        }
        
        // Cap at maximum probability
        return finalProbability > MAX_PROBABILITY ? MAX_PROBABILITY : finalProbability;
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
        return applyBoosts(user, baseProbability);
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
    function addToJackpot(uint256 amount) external whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        wrappedSonic.safeTransferFrom(msg.sender, address(this), amount);
        jackpot += amount;
        emit JackpotIncreased(amount);
    }
    
    /**
     * @dev Directly receive tokens into the jackpot from token contract
     * Called by the token contract during transfers to automatically add to jackpot
     * @param amount Amount to add to the jackpot
     */
    function receiveJackpotContribution(uint256 amount) external whenNotPaused {
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
     * @dev Get swap limits for lottery entry
     */
    function getSwapLimits() external pure returns (uint256 min, uint256 max) {
        return (BASE_WS_AMOUNT, type(uint256).max);
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
     * @dev Set the thank you token contract
     * @param _thankYouToken The address of the thank you token contract
     */
    function setThankYouToken(address _thankYouToken) external onlyOwner {
        require(_thankYouToken != address(0), "Thank you token cannot be zero address");
        thankYouToken = IRedDragonThankYouToken(_thankYouToken);
        emit ThankYouTokenSet(_thankYouToken);
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
} 