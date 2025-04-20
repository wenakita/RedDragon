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
     * @dev Process a buy transaction
     * Called by the exchange adapter when a user buys DRAGON with wS
     * @param user User address
     * @param wsAmount wSonic amount
     */
    function externalProcessBuy(address user, uint256 wsAmount) external whenNotPaused {
        require(msg.sender == exchangePair || msg.sender == address(this) || msg.sender == owner(), 
            "Only exchange pair or owner can process buys");
        processBuy(user, wsAmount);
    }
    
    /**
     * @dev Internal implementation of processBuy that overrides the parent function
     * @param user User address
     * @param wsAmount wSonic amount
     */
    function processBuy(address user, uint256 wsAmount) internal override whenNotPaused {
        super.processBuy(user, wsAmount);
    }
    
    /**
     * @dev Process a sell transaction
     * Called by the exchange adapter when a user sells DRAGON for wS
     * @param user User address
     * @param wsAmount wSonic amount
     */
    function processSell(address user, uint256 wsAmount) external whenNotPaused {
        require(msg.sender == exchangePair || msg.sender == address(this) || msg.sender == owner(), 
            "Only exchange pair or owner can process sells");
        // Selling DRAGON does not trigger an entry in the current implementation
    }
    
    /**
     * @dev Process entry with scratcher
     * @param user User address
     * @param wsAmount wSonic amount
     * @param scratcherId Scratcher ID
     */
    function processEntryWithScratcher(
        address user,
        uint256 wsAmount,
        uint256 scratcherId
    ) external whenNotPaused {
        require(msg.sender == exchangePair || msg.sender == address(this) || msg.sender == owner(), 
            "Only exchange pair or owner can process entries");
        processSwapWithScratcher(user, wsAmount, scratcherId);
    }
    
    /**
     * @dev Process entry with promotion
     * @param user User address
     * @param wsAmount wSonic amount
     * @param itemType Promotional item type
     * @param itemId Promotional item ID
     */
    function processEntryWithPromotion(
        address user,
        uint256 wsAmount,
        string calldata itemType,
        uint256 itemId
    ) external whenNotPaused {
        require(msg.sender == exchangePair || msg.sender == address(this) || msg.sender == owner(), 
            "Only exchange pair or owner can process entries");
        processSwapWithPromotion(user, wsAmount, itemType, itemId);
    }
    
    /**
     * @dev Process a combined entry
     * @param user User address
     * @param wsAmount wSonic amount
     * @param scratcherId Scratcher ID
     * @param itemType Promotional item type
     * @param itemId Promotional item ID
     */
    function processFullEntry(
        address user,
        uint256 wsAmount,
        uint256 scratcherId,
        string calldata itemType,
        uint256 itemId
    ) external whenNotPaused {
        require(msg.sender == exchangePair || msg.sender == address(this) || msg.sender == owner(), 
            "Only exchange pair or owner can process entries");
        processEntry(user, wsAmount, scratcherId, itemType, itemId);
    }
} 