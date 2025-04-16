// SPDX-License-Identifier: MIT

/**
 *                                                   
 *                 /\    ^\                 /^\
 *                / /\  /  \               /   \
 *               / /  \/ /\ \             /  /\ \
 *              / /    \/ /\ \           /  /__\_\
 *             / / /|    \/ /\ \         |  |    
 *            / / / |     \/ /\ \        |  |  
 *           / / /__|      \/ /\ \      /__/  
 *          / / /    \______\/ /\ \____/   \
 *          \/  \____/       /__/     \____/
 *                                           
 *         ===== RED DRAGON LOTTERY SWAP =====
 *          The Ultimate DeFi Lottery System
 *
 * // "Do you understand the words that are coming out of my mouth?" - Detective James Carter
 * // https://x.com/sonicreddragon
 * // https://t.me/sonicreddragon
 */

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/IDragonPaintSwapVRF.sol";
import "./interfaces/IDragonLPBooster.sol";
import "./interfaces/IPriceOracle.sol";
import "./interfaces/IVRFConsumer.sol";
import "./interfaces/IVRFCoordinator.sol";
import "./interfaces/IRedEnvelope.sol";
import "./interfaces/IGoldScratcher.sol";
import "./PromotionalItemRegistry.sol";
import "./interfaces/IPromotionalItem.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/**
 * @title DragonLotterySwap
 * @dev Comprehensive lottery contract with all features consolidated:
 * - Base lottery functionality
 * - GoldScratcher integration for jackpot boosts
 * - Promotional item support for various boosts
 */
abstract contract DragonLotterySwap is Ownable, ReentrancyGuard, Pausable, IVRFConsumer {
    using SafeERC20 for IERC20;
    // Wrapped Sonic token (used for jackpot)
    IERC20 public wrappedSonic;
    
    // Verifier for random number generation
    IDragonPaintSwapVRF public verifier;
    
    // Random number storage
    uint256 public randomNumber;
    
    // Jackpot pool
    uint256 public jackpot;
    
    // Stats tracking
    uint256 public totalWinners;
    uint256 public totalPayouts;
    uint256 public totalEntries;
    
    // Exchange pair (for detecting buys/sells)
    address public exchangePair;
    
    // Min/max swap limits in wS tokens
    uint256 public minSwapAmount = 1 ether;    // 1 wS
    uint256 public maxSwapAmount = 10000 ether; // 10,000 wS
    
    // Win chance settings
    uint256 public baseWinChance = 4; // 0.04% (expressed as 4/10000)
    uint256 public maximumWinChance = 400; // 4% (expressed as 400/10000)
    
    // Utility variables
    address public votingToken;         // ve8020 voting token for boosts
    IDragonLPBooster public lpBooster; // LP booster for additional incentives
    
    // ------ SCRATCHER VARIABLES ------
    
    // GoldScratcher contract
    IGoldScratcher public goldScratcher;
    
    // Default jackpot percentage (69%)
    uint256 public constant DEFAULT_JACKPOT_PERCENTAGE = 6900; // 69% in basis points
    
    // Track winning scratcher token IDs for users
    mapping(address => uint256) public userWinningScratchers;
    
    // ------ PROMOTION VARIABLES ------
    
    // Registry for promotional items
    PromotionalItemRegistry public promotionalItemRegistry;
    
    // Maximum additional boost from promotional items (15% on top of the default 69%)
    uint256 public constant MAX_PROMO_BOOST = 1500; // 15% in basis points
    
    // Maximum win probability boost from promotional items (5x)
    uint256 public constant MAX_PROBABILITY_BOOST_MULTIPLIER = 500; // 5x in percentage points
    
    // Track applied promotions for users
    struct AppliedPromotion {
        string itemType;
        uint256 itemId;
        bool isActive;
        uint256 boostAmount;  // in basis points
        IPromotionalItem.BoostType boostType; // Type of boost this promotion provides
        IPromotionalItem.TransferType transferType; // Transfer restrictions for this promotion
    }
    
    // Mapping of user address to their applied promotions
    mapping(address => AppliedPromotion[]) public userPromotions;
    
    // ------ COMMON VARIABLES ------
    
    // Voting power for users
    mapping(address => uint256) public userVotingPower;
    
    // Entry timestamps for rate limiting
    mapping(address => uint256) public lastEntryTimestamp;
    
    // Entry rate limit in seconds
    uint256 public entryRateLimit = 60; // 1 minute
    
    // USD-based entry mode
    bool public useUsdEntryAmounts = false;
    IPriceOracle public priceOracle;
    uint256 public minEntryUsd = 100 ether; // $100
    uint256 public maxEntryUsd = 10000 ether; // $10,000
    
    // Jackpot withdrawals
    bool public jackpotWithdrawEnabled = false;
    
    // Price update timelock
    uint256 public constant PRICE_UPDATE_TIMELOCK = 48 hours;
    address public priceUpdateGovernance;
    mapping(bytes32 => uint256) public pendingPriceUpdates;
    
    // ------ EVENTS ------
    
    // Base lottery events
    event JackpotAdded(uint256 amount);
    event EntryRegistered(address indexed user, uint256 wsAmount, uint256 winChance);
    event Winner(address indexed user, uint256 amount);
    event VotingTokenChanged(address indexed votingToken);
    event UserVotingPowerUpdated(address indexed user, uint256 amount);
    event EntryLimitsChanged(uint256 minAmount, uint256 maxAmount);
    event WinChanceChanged(uint256 baseWinChance, uint256 maximumWinChance);
    event PriceOracleUpdated(address indexed priceOracle);
    event UsdModeToggled(bool useUsd);
    event JackpotWithdrawUpdated(bool enabled);
    event PriceUpdateProposed(address indexed oracle, uint256 timestamp);
    event PriceUpdateExecuted(address indexed oracle);
    event PendingPriceUpdateCancelled(address indexed oracle);
    event PriceUpdateGovernanceChanged(address indexed governance);
    
    // Scratcher events
    event GoldScratcherSet(address indexed scratcherAddress);
    event ScratcherBoostApplied(address indexed winner, uint256 boostAmount);
    event JackpotDistributed(address indexed winner, uint256 amount);
    
    // Promotion events
    event PromotionalItemRegistrySet(address indexed registryAddress);
    event PromotionApplied(address indexed user, string itemType, uint256 itemId, uint256 boostAmount, IPromotionalItem.BoostType boostType);
    event PromotionUsed(address indexed user, string itemType, uint256 itemId, uint256 boostedAmount);
    event BoostCapped(address indexed user, uint256 requestedBoost, uint256 cappedBoost, IPromotionalItem.BoostType boostType);
    
    /**
     * @dev Constructor with all features enabled
     * @param _wrappedSonic Address of the wrapped Sonic token
     * @param _verifier Address of the PaintSwap verifier
     * @param _registry Address of the promotional item registry (optional, can be zero address)
     * @param _goldScratcher Address of the gold scratcher (optional, can be zero address)
     */
    constructor(
        address _wrappedSonic,
        address _verifier,
        address _registry,
        address _goldScratcher
    ) {
        require(_wrappedSonic != address(0), "wSonic cannot be zero address");
        
        wrappedSonic = IERC20(_wrappedSonic);
        
        // Set the verifier if provided
        if (_verifier != address(0)) {
            verifier = IDragonPaintSwapVRF(_verifier);
        }
        
        // Set the promotional item registry if provided
        if (_registry != address(0)) {
            promotionalItemRegistry = PromotionalItemRegistry(_registry);
        }
        
        // Set the gold scratcher if provided
        if (_goldScratcher != address(0)) {
            goldScratcher = IGoldScratcher(_goldScratcher);
        }
    }
    
    // ------ BASE LOTTERY FUNCTIONALITY ------
    
    /**
     * @dev Add to the jackpot
     * @param _amount Amount to add to the jackpot
     */
    function addToJackpot(uint256 _amount) external {
        jackpot += _amount;
        emit JackpotAdded(_amount);
    }
    
    /**
     * @dev Set the exchange pair address
     * @param _exchangePair Address of the exchange pair
     */
    function setExchangePair(address _exchangePair) external onlyOwner {
        require(_exchangePair != address(0), "Exchange pair cannot be zero address");
        exchangePair = _exchangePair;
    }
    
    /**
     * @dev Set the voting token address
     * @param _votingToken Address of the voting token
     */
    function setVotingToken(address _votingToken) external onlyOwner {
        require(_votingToken != address(0), "Voting token cannot be zero address");
        votingToken = _votingToken;
        emit VotingTokenChanged(_votingToken);
    }
    
    /**
     * @dev Update a user's voting power
     * @param _user User address
     * @param _amount New voting power amount
     */
    function updateUserVotingPower(address _user, uint256 _amount) external {
        require(
            msg.sender == votingToken || msg.sender == owner(),
            "Only voting token contract or owner can update voting power"
        );
        userVotingPower[_user] = _amount;
        emit UserVotingPowerUpdated(_user, _amount);
    }
    
    /**
     * @dev Set entry limits
     * @param _minAmount Minimum entry amount in wS
     * @param _maxAmount Maximum entry amount in wS
     */
    function setEntryLimits(uint256 _minAmount, uint256 _maxAmount) external onlyOwner {
        require(_minAmount > 0, "Min amount must be greater than 0");
        require(_maxAmount > _minAmount, "Max amount must be greater than min amount");
        
        minSwapAmount = _minAmount;
        maxSwapAmount = _maxAmount;
        
        emit EntryLimitsChanged(_minAmount, _maxAmount);
    }
    
    /**
     * @dev Set win chance parameters
     * @param _baseWinChance Base win chance (in basis points)
     * @param _maximumWinChance Maximum win chance (in basis points)
     */
    function setWinChance(uint256 _baseWinChance, uint256 _maximumWinChance) external onlyOwner {
        require(_baseWinChance > 0, "Base win chance must be greater than 0");
        require(_maximumWinChance > _baseWinChance, "Max win chance must be greater than base win chance");
        require(_maximumWinChance <= 1000, "Max win chance cannot exceed 10%");
        
        baseWinChance = _baseWinChance;
        maximumWinChance = _maximumWinChance;
        
        emit WinChanceChanged(_baseWinChance, _maximumWinChance);
    }
    
    /**
     * @dev Process a buy transaction
     * @param user User address
     * @param wsAmount wSonic amount
     */
    function processBuy(address user, uint256 wsAmount) public whenNotPaused {
        require(
            msg.sender == owner() || msg.sender == address(this),
            "Only owner or self can process buy"
        );
        
        // Check rate limits
        require(
            block.timestamp > lastEntryTimestamp[user] + entryRateLimit,
            "Rate limit: Wait before next entry"
        );
        
        // Check entry amounts
        uint256 minEntry = getMinEntryAmount();
        uint256 maxEntry = getMaxEntryAmount();
        
        require(wsAmount >= minEntry, "Amount below minimum entry");
        require(wsAmount <= maxEntry, "Amount above maximum entry");
        
        // Record entry timestamp
        lastEntryTimestamp[user] = block.timestamp;
        
        // Calculate win chance
        uint256 winChance = calculateWinChance(user, wsAmount);
        
        // Determine if user won
        uint256 randNum = getRandomNumber();
        bool isWinner = randNum % 10000 < winChance;
        
        if (isWinner && jackpot > 0) {
            // User won the jackpot!
            distributeJackpot(user, jackpot);
            
            // Reset jackpot
            jackpot = 0;
        }
        
        // Update stats
        totalEntries++;
        
        // Emit entry event
        emit EntryRegistered(user, wsAmount, winChance);
    }
    
    /**
     * @dev Calculate win chance based on amount and user's voting power
     * @param user User address
     * @param wsAmount wSonic amount
     * @return winChance Win chance in basis points (e.g., 100 = 1%)
     */
    function calculateWinChance(address user, uint256 wsAmount) public view returns (uint256) {
        uint256 chance = baseWinChance;
        
        // Apply boosts from LP stakes, voting power, etc.
        chance = applyBoosts(user, chance);
        
        // Cap at maximum win chance
        if (chance > maximumWinChance) {
            chance = maximumWinChance;
        }
        
        return chance;
    }
    
    /**
     * @dev Apply boosts to the base win chance
     * @param user User address
     * @param baseProbability Base win chance
     * @return boostedProbability Boosted win chance
     */
    function applyBoosts(address user, uint256 baseProbability) internal view returns (uint256) {
        uint256 lpBoostMultiplier = 100; // 1x by default
        if (address(lpBooster) != address(0)) {
            lpBoostMultiplier = IDragonLPBooster(lpBooster).calculateBoost(user);
        }
        uint256 votingPowerMultiplier = calculateVotingPowerMultiplier(user);
        
        // Initialize total multiplier with LP and VP boosts
        uint256 totalMultiplier = lpBoostMultiplier + votingPowerMultiplier;
        
        // Apply probability boosts from promotional items (if any)
        uint256 probabilityBoost = getCurrentProbabilityBoost(user);
        if (probabilityBoost > 0) {
            // For probability boosts, we add the boost percentage to the multiplier
            totalMultiplier += probabilityBoost;
        }
        
        uint256 boostedProbability = (baseProbability * totalMultiplier) / 100;
        
        return boostedProbability;
    }
    
    /**
     * @dev Calculate the voting power multiplier
     * @param user User address
     * @return multiplier Multiplier in percentage (100 = 1x)
     */
    function calculateVotingPowerMultiplier(address user) public view returns (uint256) {
        uint256 userVP = userVotingPower[user];
        if (userVP == 0) return 100; // Default 1x multiplier
        
        // Linear scaling from 1x to 2.5x based on voting power
        // For simplicity, max out at 1M voting power
        uint256 maxVP = 1000000 ether;
        if (userVP > maxVP) userVP = maxVP;
        
        // Calculate: 100% + (150% * userVP / maxVP)
        uint256 extraMultiplier = (150 * userVP) / maxVP;
        return 100 + extraMultiplier; // 100% to 250%
    }
    
    /**
     * @dev Get the current jackpot amount
     * @return Current jackpot amount
     */
    function getCurrentJackpot() external view returns (uint256) {
        return jackpot;
    }
    
    /**
     * @dev Get lottery statistics
     * @return winners Total number of winners
     * @return payouts Total amount paid out
     * @return current Current jackpot amount
     */
    function getStats() external view returns (uint256 winners, uint256 payouts, uint256 current) {
        return (totalWinners, totalPayouts, jackpot);
    }
    
    /**
     * @dev Get entry limits
     * @return min Minimum entry amount
     * @return max Maximum entry amount
     * @return isUsdMode Whether USD mode is enabled
     */
    function getSwapLimits() external view returns (uint256 min, uint256 max, bool isUsdMode) {
        return (getMinEntryAmount(), getMaxEntryAmount(), useUsdEntryAmounts);
    }
    
    /**
     * @dev Get the jackpot token symbol
     * @return Token symbol
     */
    function getJackpotTokenSymbol() external view returns (string memory) {
        return IERC20Metadata(address(wrappedSonic)).symbol();
    }
    
    /**
     * @dev Get minimum entry amount considering USD mode
     * @return Minimum entry amount in wS
     */
    function getMinEntryAmount() public view returns (uint256) {
        if (useUsdEntryAmounts && address(priceOracle) != address(0)) {
            // Convert USD to wS tokens
            return priceOracle.usdToWSonic(minEntryUsd);
        }
        return minSwapAmount;
    }
    
    /**
     * @dev Get maximum entry amount considering USD mode
     * @return Maximum entry amount in wS
     */
    function getMaxEntryAmount() public view returns (uint256) {
        if (useUsdEntryAmounts && address(priceOracle) != address(0)) {
            // Convert USD to wS tokens
            return priceOracle.usdToWSonic(maxEntryUsd);
        }
        return maxSwapAmount;
    }
    
    /**
     * @dev Set price oracle with timelock
     * @param _priceOracle New price oracle address
     */
    function proposePriceOracle(address _priceOracle) external onlyOwner {
        require(_priceOracle != address(0), "Oracle cannot be zero address");
        
        bytes32 updateId = keccak256(abi.encodePacked("priceOracle", _priceOracle));
        pendingPriceUpdates[updateId] = block.timestamp + PRICE_UPDATE_TIMELOCK;
        
        emit PriceUpdateProposed(_priceOracle, pendingPriceUpdates[updateId]);
    }
    
    /**
     * @dev Execute price oracle update after timelock
     * @param _priceOracle New price oracle address
     */
    function executePriceOracle(address _priceOracle) external {
        require(
            msg.sender == owner() || 
            (priceUpdateGovernance != address(0) && msg.sender == priceUpdateGovernance),
            "Not authorized"
        );
        
        bytes32 updateId = keccak256(abi.encodePacked("priceOracle", _priceOracle));
        require(pendingPriceUpdates[updateId] > 0, "No pending update");
        require(block.timestamp >= pendingPriceUpdates[updateId], "Timelock not expired");
        
        // Update the oracle
        priceOracle = IPriceOracle(_priceOracle);
        
        // Clear the pending update
        delete pendingPriceUpdates[updateId];
        
        emit PriceUpdateExecuted(_priceOracle);
    }
    
    /**
     * @dev Toggle USD entry mode
     */
    function toggleUsdMode() external onlyOwner {
        useUsdEntryAmounts = !useUsdEntryAmounts;
        emit UsdModeToggled(useUsdEntryAmounts);
    }
    
    /**
     * @dev Set jackpot withdrawal permission
     * @param enable Whether to enable jackpot withdrawals
     */
    function setJackpotWithdraw(bool enable) external onlyOwner {
        jackpotWithdrawEnabled = enable;
        emit JackpotWithdrawUpdated(enable);
    }
    
    /**
     * @dev Set price update governance address
     * @param governance New governance address
     */
    function setPriceUpdateGovernance(address governance) external onlyOwner {
        priceUpdateGovernance = governance;
        emit PriceUpdateGovernanceChanged(governance);
    }
    
    /**
     * @dev Get a random number (with fallback)
     */
    function getRandomNumber() internal returns (uint256) {
        // If we have a stored random number, use it and reset
        if (randomNumber > 0) {
            uint256 result = randomNumber;
            randomNumber = 0;
            return result;
        }
        
        // Try to get VRF random number
        if (address(verifier) != address(0)) {
            try verifier.requestRandomness() returns (bytes32) {
                // For now, return a fallback random number since the actual random number
                // will be delivered via fulfillRandomWords callback
                return uint256(keccak256(abi.encodePacked(
                    blockhash(block.number - 1),
                    block.timestamp,
                    msg.sender,
                    totalEntries
                )));
            } catch {
                // Fallback to pseudo-random
                return uint256(keccak256(abi.encodePacked(
                    blockhash(block.number - 1),
                    block.timestamp,
                    msg.sender,
                    totalEntries
                )));
            }
        }
        
        // Final fallback
        return uint256(keccak256(abi.encodePacked(
            blockhash(block.number - 1),
            block.timestamp,
            msg.sender,
            totalEntries
        )));
    }
    
    /**
     * @dev Callback for VRF random number generation
     * @param requestId VRF request ID
     * @param randomWords Random values from VRF
     */
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external {
        require(
            msg.sender == address(verifier),
            "Only verifier can call fulfillRandomWords"
        );
        
        // Store the random number for next use
        if (randomWords.length > 0) {
            randomNumber = randomWords[0];
        }
    }
    
    // ------ SCRATCHER FUNCTIONALITY ------
    
    /**
     * @dev Set the GoldScratcher contract address
     * @param _goldScratcher Address of the GoldScratcher contract
     */
    function setGoldScratcher(address _goldScratcher) external onlyOwner {
        require(_goldScratcher != address(0), "GoldScratcher cannot be zero address");
        goldScratcher = IGoldScratcher(_goldScratcher);
        emit GoldScratcherSet(_goldScratcher);
    }
    
    /**
     * @dev Register a winning scratcher for a user
     * @param user User's address
     * @param tokenId Token ID of the winning scratcher
     */
    function registerWinningScratcher(address user, uint256 tokenId) external {
        require(
            msg.sender == owner() || msg.sender == address(this) || msg.sender == address(goldScratcher),
            "Only owner, self, or scratcher"
        );
        require(user != address(0), "Cannot register for zero address");
        require(goldScratcher.hasWinningScratcher(user, tokenId), "Not a winning scratcher");
        userWinningScratchers[user] = tokenId;
    }
    
    /**
     * @dev Process a swap with an optional GoldScratcher boost
     * @param user User address
     * @param wsAmount Base wSonic amount
     * @param scratcherId Optional tokenId of GoldScratcher to apply (0 if none)
     */
    function processSwapWithScratcher(address user, uint256 wsAmount, uint256 scratcherId) external whenNotPaused {
        require(msg.sender == owner() || msg.sender == address(this), "Not authorized");
        
        uint256 finalAmount = wsAmount;
        
        // If scratcherId is provided, apply the scratcher
        if (scratcherId > 0 && address(goldScratcher) != address(0)) {
            try goldScratcher.applyToSwap(scratcherId, wsAmount) returns (bool isWinner, uint256 boostedAmount) {
                if (isWinner) {
                    finalAmount = boostedAmount;
                    // Directly set the winning scratcher for this user instead of calling registerWinningScratcher
                    userWinningScratchers[user] = scratcherId;
                }
            } catch {
                // If applying the scratcher fails, continue with the original amount
            }
        }
        
        // Process the swap with the potentially boosted amount
        processBuy(user, finalAmount);
    }
    
    // ------ PROMOTIONAL FUNCTIONALITY ------
    
    /**
     * @dev Set the promotional item registry
     * @param _registry Address of the new registry
     */
    function setPromotionalItemRegistry(address _registry) external onlyOwner {
        require(_registry != address(0), "Registry cannot be zero address");
        promotionalItemRegistry = PromotionalItemRegistry(_registry);
        emit PromotionalItemRegistrySet(_registry);
    }
    
    /**
     * @dev Apply a promotional item to a user's account
     * @param user User address
     * @param itemType Type of promotional item
     * @param itemId ID of the specific item
     */
    function applyPromotion(address user, string calldata itemType, uint256 itemId) external onlyOwner {
        require(user != address(0), "Cannot apply to zero address");
        
        // Get the promotional item contract
        address itemContract = promotionalItemRegistry.getPromotionalItem(itemType);
        require(itemContract != address(0), "Item type not registered");
        
        // Check if the user has the item
        IPromotionalItem item = IPromotionalItem(itemContract);
        require(item.hasItem(user, itemId), "User does not have this item");
        
        // Get the boost type (jackpot or probability)
        IPromotionalItem.BoostType boostType = item.getBoostType();
        
        // Calculate the boost amount
        uint256 boostAmount = item.calculateBoost(user, itemId);
        
        // Apply the maximum boost limit if necessary based on boost type
        uint256 maxBoost;
        uint256 currentBoost;
        
        if (boostType == IPromotionalItem.BoostType.JACKPOT) {
            // Get current jackpot boost
            currentBoost = getCurrentJackpotBoost(user);
            maxBoost = MAX_PROMO_BOOST;
        } else {
            // PROBABILITY boost
            currentBoost = getCurrentProbabilityBoost(user);
            // For probability, we don't use basis points, but full percentages
            // MAX_PROBABILITY_BOOST_MULTIPLIER is 500 (500%), so convert to basis points
            maxBoost = MAX_PROBABILITY_BOOST_MULTIPLIER * 100;
        }
        
        uint256 totalBoostAmount = currentBoost + boostAmount;
        
        // Cap the total boost if it exceeds the maximum
        if (totalBoostAmount > maxBoost) {
            boostAmount = maxBoost > currentBoost ? maxBoost - currentBoost : 0;
            emit BoostCapped(user, totalBoostAmount, maxBoost, boostType);
        }
        
        // If there's a non-zero boost to apply, record it
        if (boostAmount > 0) {
            userPromotions[user].push(AppliedPromotion({
                itemType: itemType,
                itemId: itemId,
                isActive: true,
                boostAmount: boostAmount,
                boostType: boostType,
                transferType: IPromotionalItem(itemContract).getTransferType()
            }));
            
            emit PromotionApplied(user, itemType, itemId, boostAmount, boostType);
        }
    }
    
    /**
     * @dev Process a swap with an optional promotional item
     * @param user User address
     * @param wsAmount Base wSonic amount
     * @param itemType Type of promotional item to apply (empty string if none)
     * @param itemId ID of the promotional item to apply (0 if none)
     */
    function processSwapWithPromotion(
        address user, 
        uint256 wsAmount, 
        string calldata itemType, 
        uint256 itemId
    ) external whenNotPaused {
        require(msg.sender == owner() || msg.sender == address(this), "Not authorized");
        
        uint256 finalAmount = wsAmount;
        
        // If itemType is provided, apply the promotion
        if (bytes(itemType).length > 0 && itemId > 0) {
            address itemContract = promotionalItemRegistry.getPromotionalItem(itemType);
            if (itemContract != address(0)) {
                IPromotionalItem item = IPromotionalItem(itemContract);
                IPromotionalItem.BoostType boostType = item.getBoostType();
                
                try item.applyItem(itemId, user, wsAmount) returns (bool isSuccess, uint256 boostedAmount) {
                    if (isSuccess) {
                        // Only apply amount boost for jackpot-type items
                        if (boostType == IPromotionalItem.BoostType.JACKPOT) {
                            // Apply boost cap by checking how much the boost actually adds
                            uint256 boostAmount = boostedAmount > wsAmount ? boostedAmount - wsAmount : 0;
                            uint256 maxBoost = (wsAmount * MAX_PROMO_BOOST) / 10000;
                            
                            if (boostAmount > maxBoost) {
                                // Cap the boost
                                finalAmount = wsAmount + maxBoost;
                                emit BoostCapped(user, boostAmount, maxBoost, boostType);
                            } else {
                                finalAmount = boostedAmount;
                            }
                        }
                        
                        emit PromotionUsed(user, itemType, itemId, finalAmount);
                    }
                } catch {
                    // If applying the promotion fails, continue with the original amount
                }
            }
        }
        
        // Process the swap with the potentially boosted amount
        processBuy(user, finalAmount);
    }
    
    /**
     * @dev Get the current total jackpot boost for a user
     * @param user User address to check
     * @return Total jackpot boost amount in basis points
     */
    function getCurrentJackpotBoost(address user) public view returns (uint256) {
        uint256 totalBoost = 0;
        
        // First add boost from GoldScratcher if any
        if (address(goldScratcher) != address(0)) {
            uint256 tokenId = userWinningScratchers[user];
            if (tokenId > 0) {
                totalBoost += goldScratcher.calculateBoost(user, tokenId);
            }
        }
        
        // Then add boosts from other promotional items
        AppliedPromotion[] storage promotions = userPromotions[user];
        for (uint i = 0; i < promotions.length; i++) {
            if (promotions[i].isActive && promotions[i].boostType == IPromotionalItem.BoostType.JACKPOT) {
                totalBoost += promotions[i].boostAmount;
            }
        }
        
        return totalBoost;
    }
    
    /**
     * @dev Get the current total probability boost for a user
     * @param user User address to check
     * @return Total probability boost amount in basis points
     */
    function getCurrentProbabilityBoost(address user) public view returns (uint256) {
        uint256 totalBoost = 0;
        
        AppliedPromotion[] storage promotions = userPromotions[user];
        for (uint i = 0; i < promotions.length; i++) {
            if (promotions[i].isActive && promotions[i].boostType == IPromotionalItem.BoostType.PROBABILITY) {
                totalBoost += promotions[i].boostAmount;
            }
        }
        
        return totalBoost;
    }
    
    /**
     * @dev Calculate total jackpot percentage including all boosts
     * @param _user Address of the user
     * @return percentage Total jackpot percentage in basis points
     */
    function calculateJackpotPercentage(address _user) public view returns (uint256) {
        // Default jackpot percentage is 69%
        uint256 percentage = DEFAULT_JACKPOT_PERCENTAGE;
        
        // Add all jackpot boosts
        percentage += getCurrentJackpotBoost(_user);
        
        return percentage;
    }
    
    /**
     * @dev Deactivate all promotions for a user after they're used
     * @param user User address
     */
    function deactivateAllPromotions(address user) internal {
        AppliedPromotion[] storage promotions = userPromotions[user];
        for (uint i = 0; i < promotions.length; i++) {
            if (promotions[i].isActive) {
                promotions[i].isActive = false;
            }
        }
    }
    
    // ------ COMBINED FUNCTIONALITY ------
    
    /**
     * @dev Distribute jackpot to winner, applying all boosts
     * @param winner Address of the lottery winner
     * @param amount Base amount they would win without boost
     */
    function distributeJackpot(address winner, uint256 amount) public {
        // Only callable by owner or this contract
        require(
            msg.sender == owner() || msg.sender == address(this),
            "Only owner or this contract can distribute jackpot"
        );
        
        if (winner == address(0)) return;
        
        // Calculate boost
        uint256 percentage = calculateJackpotPercentage(winner);
        uint256 boostedAmount = (amount * percentage) / 10000; // Apply percentage (basis points)
        
        // Emit boost event if applicable
        if (percentage > DEFAULT_JACKPOT_PERCENTAGE) {
            uint256 boostAmount = boostedAmount - ((amount * DEFAULT_JACKPOT_PERCENTAGE) / 10000);
            emit ScratcherBoostApplied(winner, boostAmount);
        }
        
        // Deactivate all promotions after use
        deactivateAllPromotions(winner);
        
        // Transfer the tokens
        wrappedSonic.safeTransfer(winner, boostedAmount);
        
        // Update stats
        totalWinners++;
        totalPayouts += boostedAmount;
        
        emit JackpotDistributed(winner, boostedAmount);
        emit Winner(winner, boostedAmount);
    }
    
    /**
     * @dev Process an entry in the lottery with all types of boosts
     * This function serves as a unified entry point for all features
     * @param user User address
     * @param wsAmount Amount of wSonic tokens
     * @param scratcherId Optional scratcher ID (0 if none)
     * @param itemType Optional promotion type (empty if none)
     * @param itemId Optional promotion ID (0 if none)
     */
    function processEntry(
        address user,
        uint256 wsAmount,
        uint256 scratcherId,
        string calldata itemType,
        uint256 itemId
    ) external whenNotPaused {
        require(msg.sender == owner() || msg.sender == address(this), "Not authorized");
        
        uint256 finalAmount = wsAmount;
        bool boostApplied = false;
        
        // Apply scratcher boost if provided
        if (scratcherId > 0 && address(goldScratcher) != address(0)) {
            try goldScratcher.applyToSwap(scratcherId, wsAmount) returns (bool isWinner, uint256 boostedAmount) {
                if (isWinner) {
                    finalAmount = boostedAmount;
                    userWinningScratchers[user] = scratcherId;
                    boostApplied = true;
                }
            } catch {}
        }
        
        // Apply promotional item boost if provided and no scratcher boost was applied
        if (!boostApplied && bytes(itemType).length > 0 && itemId > 0) {
            address itemContract = promotionalItemRegistry.getPromotionalItem(itemType);
            if (itemContract != address(0)) {
                IPromotionalItem item = IPromotionalItem(itemContract);
                IPromotionalItem.BoostType boostType = item.getBoostType();
                
                try item.applyItem(itemId, user, wsAmount) returns (bool isSuccess, uint256 boostedAmount) {
                    if (isSuccess) {
                        // Only apply amount boost for jackpot-type items
                        if (boostType == IPromotionalItem.BoostType.JACKPOT) {
                            // Apply boost cap by checking how much the boost actually adds
                            uint256 boostAmount = boostedAmount > wsAmount ? boostedAmount - wsAmount : 0;
                            uint256 maxBoost = (wsAmount * MAX_PROMO_BOOST) / 10000;
                            
                            if (boostAmount > maxBoost) {
                                // Cap the boost
                                finalAmount = wsAmount + maxBoost;
                                emit BoostCapped(user, boostAmount, maxBoost, boostType);
                            } else {
                                finalAmount = boostedAmount;
                            }
                        }
                        
                        emit PromotionUsed(user, itemType, itemId, finalAmount);
                    }
                } catch {}
            }
        }
        
        // Process the entry with the potentially boosted amount
        processBuy(user, finalAmount);
    }
    
    /**
     * @dev Get information about VRF configuration
     */
    function getVRFConfiguration() external view returns (
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
     * @dev Check if the lottery is enabled
     */
    function isLotteryEnabled() external view returns (bool) {
        return !paused();
    }
} 