# ConcreteDragonLotterySwap - Implementation Example

This document explains the purpose of the `ConcreteDragonLotterySwap.sol` contract and provides an example implementation.

## Why ConcreteDragonLotterySwap is Required

The `DragonLotterySwap.sol` contract is defined as an abstract contract:

```solidity
abstract contract DragonLotterySwap is Ownable, ReentrancyGuard, Pausable, IVRFConsumer {
    // ...
}
```

An abstract contract cannot be deployed directly because it may contain unimplemented functions or inherit from other abstract contracts without implementing all required functions. In this case, the main lottery logic is implemented in the abstract contract, but we need a concrete (deployable) implementation.

The `ConcreteDragonLotterySwap` contract serves this purpose - it inherits from `DragonLotterySwap` and implements any required functions that may be missing, making it deployable.

## Example Implementation

Here's what the `ConcreteDragonLotterySwap.sol` contract might look like:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DragonLotterySwap.sol";

/**
 * @title ConcreteDragonLotterySwap
 * @dev Concrete implementation of the DragonLotterySwap abstract contract.
 * This contract makes the abstract lottery contract deployable and implements
 * any required functions that may be missing in the abstract contract.
 */
contract ConcreteDragonLotterySwap is DragonLotterySwap {
    // Flag to track if we are in a swap
    bool public inSwap;
    
    /**
     * @dev Constructor - passes parameters to the DragonLotterySwap constructor
     * @param _wrappedSonic Address of the wrapped Sonic token
     * @param _verifier Address of the PaintSwap verifier
     * @param _registry Address of the promotional item registry
     * @param _goldScratcher Address of the gold scratcher
     */
    constructor(
        address _wrappedSonic,
        address _verifier,
        address _registry,
        address _goldScratcher
    ) DragonLotterySwap(_wrappedSonic, _verifier, _registry, _goldScratcher) {
        // Any additional initialization if needed
    }
    
    /**
     * @dev Implementation of entry processing for swaps from wrapped Sonic to DRAGON
     * This function would be called by the DRAGON token contract when a swap is detected
     * @param user User address
     * @param wsAmount Wrapped Sonic amount
     */
    function processEntry(address user, uint256 wsAmount) external {
        require(msg.sender == address(exchangePair) || msg.sender == owner(), "Only exchange pair or owner can call");
        require(!inSwap, "Reentrancy guard");
        
        inSwap = true;
        
        // Call the internal processEntry function from DragonLotterySwap
        _processEntryWithVRF(user, wsAmount);
        
        inSwap = false;
    }
    
    /**
     * @dev Process an entry with a scratcher token
     * @param user User address
     * @param wsAmount Wrapped Sonic amount
     * @param scratcherId ID of the scratcher token
     */
    function processEntryWithScratcher(address user, uint256 wsAmount, uint256 scratcherId) external {
        require(msg.sender == address(exchangePair) || msg.sender == owner(), "Only exchange pair or owner can call");
        require(!inSwap, "Reentrancy guard");
        
        inSwap = true;
        
        // Process the entry with a scratcher
        processSwapWithScratcher(user, wsAmount, scratcherId);
        
        inSwap = false;
    }
    
    /**
     * @dev Process an entry with a promotional item
     * @param user User address
     * @param wsAmount Wrapped Sonic amount
     * @param itemType Type of promotional item
     * @param itemId ID of the promotional item
     */
    function processEntryWithPromotion(address user, uint256 wsAmount, string calldata itemType, uint256 itemId) external {
        require(msg.sender == address(exchangePair) || msg.sender == owner(), "Only exchange pair or owner can call");
        require(!inSwap, "Reentrancy guard");
        
        inSwap = true;
        
        // Process the entry with a promotion
        processSwapWithPromotion(user, wsAmount, itemType, itemId);
        
        inSwap = false;
    }
    
    /**
     * @dev Unified entry processing with all possible boosts
     * @param user User address
     * @param wsAmount Wrapped Sonic amount
     * @param scratcherId ID of the scratcher token (0 if none)
     * @param itemType Type of promotional item (empty if none)
     * @param itemId ID of the promotional item (0 if none)
     */
    function processUnifiedEntry(
        address user,
        uint256 wsAmount,
        uint256 scratcherId,
        string calldata itemType,
        uint256 itemId
    ) external {
        require(msg.sender == address(exchangePair) || msg.sender == owner(), "Only exchange pair or owner can call");
        require(!inSwap, "Reentrancy guard");
        
        inSwap = true;
        
        // Process the entry with all possible boosts
        processEntry(user, wsAmount, scratcherId, itemType, itemId);
        
        inSwap = false;
    }
    
    /**
     * @dev Helper function for testing - allows direct testing of entry processing
     * Only available in test environments
     */
    function testProcessEntry(
        address user,
        uint256 wsAmount,
        uint256 scratcherId,
        string calldata itemType,
        uint256 itemId
    ) external onlyOwner {
        processEntry(user, wsAmount, scratcherId, itemType, itemId);
    }
    
    /**
     * @dev Helper function for testing - sets a predetermined random number
     * Only available in test environments
     */
    function setTestRandomNumber(uint256 number) external onlyOwner {
        randomNumber = number;
    }
}
```

## Key Points

1. **Purpose**: The concrete implementation acts as a wrapper around the abstract contract, making it deployable.

2. **Function Implementation**: If `DragonLotterySwap` has any abstract functions (those without implementation), they must be implemented in `ConcreteDragonLotterySwap`.

3. **Entry Points**: The concrete contract typically provides external entry points that call the internal functions of the abstract contract.

4. **Reentrancy Protection**: The example shows how to implement reentrancy protection with the `inSwap` flag.

5. **Access Control**: The implementation ensures that only authorized addresses (like the exchange pair) can call the entry functions.

6. **Testing Helpers**: Additional functions can be added to facilitate testing, with appropriate access control.

## Deployment Workflow

When deploying the Dragon Ecosystem, you would:

1. Deploy the abstract contract dependencies (if any)
2. Deploy the `ConcreteDragonLotterySwap` contract, passing the required parameters
3. Connect the concrete lottery contract with other contracts in the ecosystem

## Interaction Example

After deployment, the DragonExchangePair contract would call functions on the ConcreteDragonLotterySwap to process lottery entries when users swap tokens:

```solidity
// In DragonExchangePair.sol
function swap(uint256 wSonicAmount) external {
    // ... swap logic ...
    
    // Call the lottery for this swap
    ConcreteDragonLotterySwap(lotteryAddress).processEntry(msg.sender, wSonicAmount);
    
    // ... additional swap logic ...
}
```

## Conclusion

The `ConcreteDragonLotterySwap` is a necessary part of the Dragon Ecosystem, serving as the bridge between the abstract lottery logic and the deployed, usable contract. It enables the lottery functionality to be integrated with other contracts in the ecosystem, particularly the exchange pair.

When testing the lottery system, you'll need to deploy both the abstract and concrete contracts, with the latter being the target of your direct interactions. 