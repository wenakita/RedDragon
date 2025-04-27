// SPDX-License-Identifier: MIT

/**
 *                                              
 *         ======== CONCRETE DRAGON ========
 *         Lottery Implementation for Testing
 *
 * // "This is the worst vacation ever!" - Carter
 * // https://x.com/sonicreddragon
 * // https://t.me/sonicreddragon
 */

pragma solidity ^0.8.20;

import "./DragonLotterySwap.sol";

/**
 * @title ConcreteDragonLotterySwap
 * @dev Concrete implementation of the DragonLotterySwap abstract contract
 */
contract ConcreteDragonLotterySwap is DragonLotterySwap {
    constructor(
        address _wrappedSonic,
        address _verifier,
        address _registry,
        address _goldScratcher
    ) DragonLotterySwap(_wrappedSonic, _verifier, _registry, _goldScratcher) {
        // Constructor is called by parent
    }
    
    /**
     * @dev Request random numbers from the VRF provider
     * @return A request ID
     */
    function requestRandomness() external returns (bytes32) {
        if (address(verifier) != address(0)) {
            return verifier.requestRandomness();
        }
        return bytes32(0); // Mock implementation
    }
    
    /**
     * @dev Process the random values from the VRF provider
     * @param requestId The request ID
     * @param randomWords The random values
     */
    function fulfillRandomness(bytes32 requestId, uint256[] memory randomWords) external {
        if (randomWords.length > 0) {
            randomNumber = randomWords[0];
        }
    }
    
    /**
     * @dev Check if VRF is enabled for this contract
     * @return True if VRF is enabled
     */
    function isVrfEnabled() external view returns (bool) {
        return address(verifier) != address(0);
    }
    
    /**
     * @dev External process buy is a wrapper around processBuy that can be called by authorized contracts
     * Called by the exchange adapter when a user buys DRAGON with wrapped Sonic
     * @param user User address
     * @param wrappedSonicAmount wrapped Sonic amount
     */
    function externalProcessBuy(address user, uint256 wrappedSonicAmount) external whenNotPaused {
        require(msg.sender == exchangePair || msg.sender == address(this) || msg.sender == owner(), 
            "Only exchange pair or owner can process buys");
        processBuy(user, wrappedSonicAmount);
    }
    
    /**
     * @dev Internal implementation of processBuy that overrides the parent function
     * @param user User address
     * @param wrappedSonicAmount wrapped Sonic amount
     */
    function processBuy(address user, uint256 wrappedSonicAmount) internal override whenNotPaused {
        super.processBuy(user, wrappedSonicAmount);
    }
    
    /**
     * @dev Process a sell transaction
     * Called by the exchange adapter when a user sells DRAGON for wrapped Sonic
     * @param user User address
     * @param wrappedSonicAmount wrapped Sonic amount
     */
    function processSell(address user, uint256 wrappedSonicAmount) external whenNotPaused {
        require(msg.sender == exchangePair || msg.sender == address(this) || msg.sender == owner(), 
            "Only exchange pair or owner can process sells");
        // Selling DRAGON does not trigger an entry in the current implementation
    }
    
    /**
     * @dev Process entry with scratcher
     * @param user User address
     * @param wrappedSonicAmount wrapped Sonic amount
     * @param scratcherId Scratcher ID
     */
    function processEntryWithScratcher(
        address user,
        uint256 wrappedSonicAmount,
        uint256 scratcherId
    ) external whenNotPaused {
        require(msg.sender == exchangePair || msg.sender == address(this) || msg.sender == owner(), 
            "Only exchange pair or owner can process entries");
        processSwapWithScratcher(user, wrappedSonicAmount, scratcherId);
    }
    
    /**
     * @dev Process entry with promotion
     * @param user User address
     * @param wrappedSonicAmount wrapped Sonic amount
     * @param itemType Promotional item type
     * @param itemId Promotional item ID
     */
    function processEntryWithPromotion(
        address user,
        uint256 wrappedSonicAmount,
        string calldata itemType,
        uint256 itemId
    ) external whenNotPaused {
        require(msg.sender == exchangePair || msg.sender == address(this) || msg.sender == owner(), 
            "Only exchange pair or owner can process entries");
        
        // Get the promotional item contract from the registry
        address itemContract = promotionalItemRegistry.getPromotionalItem(itemType);
        if (itemContract != address(0)) {
            IPromotionalItem item = IPromotionalItem(itemContract);
            processSwapWithPromotion(user, wrappedSonicAmount, item, itemId);
        } else {
            // If item not found, just process with the original amount
            processBuy(user, wrappedSonicAmount);
        }
    }
    
    /**
     * @dev Process a combined entry
     * @param user User address
     * @param wrappedSonicAmount wrapped Sonic amount
     * @param scratcherId Scratcher ID
     * @param itemType Promotional item type
     * @param itemId Promotional item ID
     */
    function processFullEntry(
        address user,
        uint256 wrappedSonicAmount,
        uint256 scratcherId,
        string calldata itemType,
        uint256 itemId
    ) external whenNotPaused {
        require(msg.sender == exchangePair || msg.sender == address(this) || msg.sender == owner(), 
            "Only exchange pair or owner can process entries");
        
        // Get the promotional item contract from the registry
        address itemContract = promotionalItemRegistry.getPromotionalItem(itemType);
        if (itemContract != address(0)) {
            IPromotionalItem item = IPromotionalItem(itemContract);
            processEntry(user, wrappedSonicAmount, scratcherId, item, itemId);
        } else {
            // If item not found, just process with the scratcher
            processSwapWithScratcher(user, wrappedSonicAmount, scratcherId);
        }
    }
} 