// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RedDragonSwapLottery.sol";
import "./PromotionalItemRegistry.sol";
import "./interfaces/IPromotionalItem.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title RedDragonSwapLotteryWithPromotions
 * @dev Enhanced lottery contract that supports multiple promotional items
 * This contract handles two distinct types of boosts:
 * 1. JACKPOT boosts (e.g., GoldScratcher) - Increase the jackpot payout percentage
 * 2. PROBABILITY boosts (e.g., RedEnvelope) - Increase the chance of winning
 */
contract RedDragonSwapLotteryWithPromotions is RedDragonSwapLottery {
    using SafeERC20 for IERC20;
    
    // Registry for promotional items
    PromotionalItemRegistry public promotionalItemRegistry;
    
    // Default jackpot percentage (69%)
    uint256 public constant DEFAULT_JACKPOT_PERCENTAGE = 6900; // 69% in basis points
    
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
    
    // Events
    event PromotionalItemRegistrySet(address indexed registryAddress);
    event PromotionApplied(address indexed user, string itemType, uint256 itemId, uint256 boostAmount, IPromotionalItem.BoostType boostType);
    event PromotionUsed(address indexed user, string itemType, uint256 itemId, uint256 boostedAmount);
    event JackpotDistributed(address indexed winner, uint256 amount);
    event BoostCapped(address indexed user, uint256 requestedBoost, uint256 cappedBoost, IPromotionalItem.BoostType boostType);
    
    /**
     * @dev Constructor
     * @param _wrappedSonic Address of the wrapped Sonic token
     * @param _verifier Address of the PaintSwap verifier
     * @param _registry Address of the promotional item registry
     */
    constructor(
        address _wrappedSonic, 
        address _verifier,
        address _registry
    ) RedDragonSwapLottery(_wrappedSonic, _verifier) {
        require(_registry != address(0), "Registry cannot be zero address");
        promotionalItemRegistry = PromotionalItemRegistry(_registry);
    }
    
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
     * @dev Get the current total jackpot boost for a user
     * @param user User address to check
     * @return Total jackpot boost amount in basis points
     */
    function getCurrentJackpotBoost(address user) public view returns (uint256) {
        uint256 totalBoost = 0;
        
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
     * @dev Get the current total boost for a user (all types)
     * @param user User address to check
     * @return Total boost amount in basis points
     */
    function getCurrentBoost(address user) public view returns (uint256) {
        uint256 totalBoost = 0;
        
        AppliedPromotion[] storage promotions = userPromotions[user];
        for (uint i = 0; i < promotions.length; i++) {
            if (promotions[i].isActive) {
                totalBoost += promotions[i].boostAmount;
            }
        }
        
        return totalBoost;
    }
    
    /**
     * @dev Calculate total jackpot percentage including promotional boosts
     * @param _user Address of the user
     * @return percentage Total jackpot percentage in basis points
     */
    function calculateJackpotPercentage(address _user) public view returns (uint256) {
        // Default jackpot percentage is 69%
        uint256 percentage = DEFAULT_JACKPOT_PERCENTAGE;
        
        // Add boosts from all active promotions
        uint256 boostAmount = getCurrentBoost(_user);
        
        // Apply boost amount (which is already capped by MAX_PROMO_BOOST)
        percentage += boostAmount;
        
        return percentage;
    }
    
    /**
     * @dev Override the applyBoosts function to cap probability boosts
     * @param user The user to calculate boosts for
     * @param baseProbability Base probability before boosts
     * @return finalProbability The effective probability after all boosts (capped)
     */
    function applyBoosts(address user, uint256 baseProbability) internal override view returns (uint256) {
        // First get the probability with regular boosts from the parent contract
        uint256 regularlyBoostedProbability = super.applyBoosts(user, baseProbability);
        
        // Calculate the maximum allowed probability after boost
        uint256 maxBoostedProbability = baseProbability * MAX_PROBABILITY_BOOST_MULTIPLIER / 100;
        
        // Return the lower of the two values to respect the cap
        return regularlyBoostedProbability > maxBoostedProbability ? 
               maxBoostedProbability : 
               regularlyBoostedProbability;
    }
    
    /**
     * @dev Override the distributeJackpot function to support promotional boosts
     * @param winner Address of the lottery winner
     * @param amount Base amount they would win without boost
     */
    function distributeJackpot(address winner, uint256 amount) external override {
        // Only callable by owner or this contract
        require(
            msg.sender == owner() || msg.sender == address(this),
            "Only owner or this contract can distribute jackpot"
        );
        
        if (winner == address(0)) return;
        
        // Calculate boost
        uint256 percentage = calculateJackpotPercentage(winner);
        uint256 boostedAmount = (amount * percentage) / 10000; // Apply percentage (basis points)
        
        // Deactivate all promotions after use
        deactivateAllPromotions(winner);
        
        // Transfer the tokens
        wrappedSonic.safeTransfer(winner, boostedAmount);
        
        // Update stats
        totalWinners++;
        totalPayouts += boostedAmount;
        
        emit JackpotDistributed(winner, boostedAmount);
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
    ) external {
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
    
    /**
     * @dev Get all active promotions for a user
     * @param user User address
     * @return itemTypes Array of item types for active promotions
     * @return itemIds Array of item IDs for active promotions
     * @return boostAmounts Array of boost amounts for active promotions
     * @return boostTypes Array of boost types for active promotions
     * @return transferTypes Array of transfer types for active promotions
     */
    function getUserActivePromotions(address user) external view returns (
        string[] memory itemTypes,
        uint256[] memory itemIds,
        uint256[] memory boostAmounts,
        IPromotionalItem.BoostType[] memory boostTypes,
        IPromotionalItem.TransferType[] memory transferTypes
    ) {
        // Count active promotions
        uint256 activeCount = 0;
        AppliedPromotion[] storage promotions = userPromotions[user];
        for (uint i = 0; i < promotions.length; i++) {
            if (promotions[i].isActive) {
                activeCount++;
            }
        }
        
        // Create arrays of the right size
        itemTypes = new string[](activeCount);
        itemIds = new uint256[](activeCount);
        boostAmounts = new uint256[](activeCount);
        boostTypes = new IPromotionalItem.BoostType[](activeCount);
        transferTypes = new IPromotionalItem.TransferType[](activeCount);
        
        // Fill arrays
        uint256 index = 0;
        for (uint i = 0; i < promotions.length; i++) {
            if (promotions[i].isActive) {
                itemTypes[index] = promotions[i].itemType;
                itemIds[index] = promotions[i].itemId;
                boostAmounts[index] = promotions[i].boostAmount;
                boostTypes[index] = promotions[i].boostType;
                transferTypes[index] = promotions[i].transferType;
                
                index++;
            }
        }
        
        return (itemTypes, itemIds, boostAmounts, boostTypes, transferTypes);
    }
    
    /**
     * @dev Get the maximum possible boost values
     * @return maxJackpotBoost Maximum jackpot boost in basis points
     * @return maxProbabilityMultiplier Maximum probability multiplier in percentage
     */
    function getBoostLimits() external pure returns (uint256 maxJackpotBoost, uint256 maxProbabilityMultiplier) {
        return (MAX_PROMO_BOOST, MAX_PROBABILITY_BOOST_MULTIPLIER);
    }
    
    /**
     * @dev Implement getVRFConfiguration to satisfy the interface requirement
     */
    function getVRFConfiguration() external view override returns (
        address vrfCoordinator_,
        bytes32 keyHash_,
        uint64 subscriptionId_
    ) {
        if (address(verifier) != address(0)) {
            return verifier.getVRFConfiguration();
        }
        return (address(0), bytes32(0), 0);
    }
} 