// SPDX-License-Identifier: MIT

/**
 *                                              
 *         ======== DRAGON LOTTERY SWAP ========
 *         Abstract Contract for Lottery System
 *
 * // https://x.com/sonicreddragon
 * // https://t.me/sonicreddragon
 */

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "../interfaces/IPromotionalItem.sol";
import "../interfaces/IPromotionalItemRegistry.sol";
import "../interfaces/IVRFProvider.sol";
import "../interfaces/IGoldScratcher.sol";

/**
 * @title DragonLotterySwap
 * @dev Abstract contract providing the base lottery swap mechanism
 */
abstract contract DragonLotterySwap is Ownable, Pausable {
    // Core contract references
    address public wrappedSonic;
    IVRFProvider public verifier;
    IPromotionalItemRegistry public promotionalItemRegistry;
    IGoldScratcher public goldScratcher;
    
    // Exchange configuration
    address public exchangePair;
    
    // Lottery state
    uint256 public randomNumber;
    uint256 public jackpotBalance;
    
    // Events
    event JackpotUpdated(uint256 newBalance);
    event LotteryWinner(address indexed winner, uint256 amount);
    event EntryProcessed(address indexed user, uint256 amount);
    
    /**
     * @dev Constructor
     * @param _wrappedSonic Address of the wrapped Sonic token
     * @param _verifier Address of the VRF provider
     * @param _registry Address of the promotional item registry
     * @param _goldScratcher Address of the gold scratcher contract
     */
    constructor(
        address _wrappedSonic,
        address _verifier,
        address _registry,
        address _goldScratcher
    ) Ownable() {
        wrappedSonic = _wrappedSonic;
        verifier = IVRFProvider(_verifier);
        promotionalItemRegistry = IPromotionalItemRegistry(_registry);
        goldScratcher = IGoldScratcher(_goldScratcher);
    }
    
    /**
     * @dev Set the exchange pair address
     * @param _exchangePair Address of the exchange pair
     */
    function setExchangePair(address _exchangePair) external onlyOwner {
        exchangePair = _exchangePair;
    }
    
    /**
     * @dev Add funds to the jackpot
     * @param amount Amount to add
     */
    function addToJackpot(uint256 amount) external {
        jackpotBalance += amount;
        emit JackpotUpdated(jackpotBalance);
    }
    
    /**
     * @dev Distribute jackpot to winner
     * @param winner Address of the winner
     */
    function distributeJackpot(address winner) internal {
        uint256 amount = jackpotBalance;
        jackpotBalance = 0;
        
        // Transfer jackpot to winner
        // Implementation details omitted - would typically involve token transfer
        
        emit LotteryWinner(winner, amount);
        emit JackpotUpdated(0);
    }
    
    /**
     * @dev Process a buy transaction
     * @param user User address
     * @param wrappedSonicAmount wrapped Sonic amount
     */
    function processBuy(address user, uint256 wrappedSonicAmount) internal virtual {
        emit EntryProcessed(user, wrappedSonicAmount);
    }
    
    /**
     * @dev Process swap with scratcher
     * @param user User address
     * @param wrappedSonicAmount wrapped Sonic amount
     * @param scratcherId Scratcher ID
     */
    function processSwapWithScratcher(
        address user,
        uint256 wrappedSonicAmount,
        uint256 scratcherId
    ) internal virtual {
        // Base implementation just forwards to processBuy
        processBuy(user, wrappedSonicAmount);
    }
    
    /**
     * @dev Process swap with promotional item
     * @param user User address
     * @param wrappedSonicAmount wrapped Sonic amount
     * @param item Promotional item contract
     * @param itemId Promotional item ID
     */
    function processSwapWithPromotion(
        address user,
        uint256 wrappedSonicAmount,
        IPromotionalItem item,
        uint256 itemId
    ) internal virtual {
        // Base implementation just forwards to processBuy
        processBuy(user, wrappedSonicAmount);
    }
    
    /**
     * @dev Process a complete entry with both scratcher and promotional item
     * @param user User address
     * @param wrappedSonicAmount wrapped Sonic amount
     * @param scratcherId Scratcher ID
     * @param item Promotional item contract
     * @param itemId Promotional item ID
     */
    function processEntry(
        address user,
        uint256 wrappedSonicAmount,
        uint256 scratcherId,
        IPromotionalItem item,
        uint256 itemId
    ) internal virtual {
        // Base implementation just forwards to processBuy
        processBuy(user, wrappedSonicAmount);
    }
    
    /**
     * @dev Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
} 