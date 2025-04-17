# Dragon PaintSwap VRF Implementation Rules

This guide outlines the requirements and best practices for implementing PaintSwap's Verifiable Random Function (VRF) in the Dragon ecosystem.

## Core Requirements

1. **Primary Randomness Source**: PaintSwap VRF must be the primary source of randomness for all lottery functions.
   ```solidity
   // Always use this pattern for randomness
   try verifier.requestRandomness() returns (bytes32 requestId) {
       // Process with VRF randomness
   } catch {
       // Only use fallback in case of VRF failure
   }
   ```

2. **Coordinator Address**: Always use the official PaintSwap VRF coordinator address.
   ```solidity
   // The official VRF coordinator address for Sonic chain
   address public constant VRF_COORDINATOR = 0x3ba925fdeae6b46d0bb4d424d829982cb2f7309e;
   ```

3. **Interface Adherence**: Always use the IDragonPaintSwapVRF interface for VRF interactions.
   ```solidity
   IDragonPaintSwapVRF public verifier;
   ```

4. **Retry Mechanism**: Implement retry logic for VRF requests when they fail.
   ```solidity
   // Store failed requests for retry
   mapping(address => PendingEntry) public pendingEntries;
   ```

## Fallback Mechanism Requirements

1. **Fallback Usage**: Fallback randomness should only be used when VRF is unavailable.

2. **EOA Verification**: When using fallback randomness, require EOA:
   ```solidity
   require(tx.origin == msg.sender, "Caller must be EOA");
   require(tx.origin.code.length == 0, "Caller must not be a contract");
   ```

3. **tx.origin Usage**: When using fallback randomness, use tx.origin instead of msg.sender:
   ```solidity
   uint256 randomValue = uint256(keccak256(abi.encodePacked(
       blockhash(block.number - 1),
       block.timestamp,
       tx.origin,  // Use tx.origin, not msg.sender
       totalEntries
   )));
   ```

4. **Delay Mechanism**: Consider delaying the entry if VRF is unavailable:
   ```solidity
   if (msg.sender == tx.origin && !inSwap) {
       // Delay the entry
       pendingEntries[user] = PendingEntry({
           wsAmount: amount,
           timestamp: block.timestamp,
           retryCount: 0,
           isPending: true
       });
       return NON_WINNING_NUMBER; // Return a value that won't win
   }
   ```

## Implementation Pattern

The following pattern should be used for lottery entries that need randomness:

```solidity
function processEntry(address user, uint256 amount) external {
    // Try VRF first
    if (address(verifier) != address(0)) {
        try verifier.requestRandomness() returns (bytes32) {
            // Store the pending request
            // We'll continue processing in the callback
            return;
        } catch {
            // VRF failed, consider delaying or fallback
            if (msg.sender == tx.origin && !inSwap) {
                // Delay the entry for retry
                delayEntry(user, amount);
                return;
            } else {
                // Use fallback only if necessary
                require(tx.origin == msg.sender, "Caller must be EOA");
                require(tx.origin.code.length == 0, "Caller must not be a contract");
                processWithFallbackRandomness(user, amount);
            }
        }
    } else {
        // No VRF configured, use fallback
        require(tx.origin == msg.sender, "Caller must be EOA");
        require(tx.origin.code.length == 0, "Caller must not be a contract");
        processWithFallbackRandomness(user, amount);
    }
}
```

## VRF Callback

Implement the callback function to handle VRF responses:

```solidity
function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external {
    require(
        msg.sender == address(verifier),
        "Only verifier can call fulfillRandomWords"
    );
    
    // Store the random number for next use
    if (randomWords.length > 0) {
        randomNumber = randomWords[0];
    }
    
    // Process any pending entries that were waiting for randomness
    processPendingEntries();
}
```

## Initialization

When initializing the VRF, follow this pattern:

```solidity
constructor(address _vrfAddress) {
    require(_vrfAddress != address(0), "VRF address cannot be zero");
    verifier = IDragonPaintSwapVRF(_vrfAddress);
    
    // Verify coordinator is the official one
    (address coordinator, , ) = verifier.getVRFConfiguration();
    require(
        coordinator == 0x3ba925fdeae6b46d0bb4d424d829982cb2f7309e,
        "Invalid VRF coordinator"
    );
}
```

## Testing

For testing, create mock implementations that simulate both successful and failed VRF requests:

```solidity
contract MockDragonPaintSwapVRF is IDragonPaintSwapVRF {
    bool public shouldFail;
    address public consumer;
    
    function setShouldFail(bool _shouldFail) external {
        shouldFail = _shouldFail;
    }
    
    function requestRandomness() external override returns (bytes32) {
        if (shouldFail) {
            revert("VRF failed");
        }
        
        consumer = msg.sender;
        bytes32 requestId = keccak256(abi.encodePacked(block.timestamp, msg.sender));
        
        // In tests, you can immediately call fulfillRandomWords
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = uint256(requestId);
        IVRFConsumer(msg.sender).fulfillRandomWords(0, randomWords);
        
        return requestId;
    }
    
    // Other required functions...
}
```

## Verification Checklist

Before deployment, verify:

- ✅ PaintSwap VRF is the primary randomness source
- ✅ Fallback mechanism is only used when VRF fails
- ✅ Proper EOA verification in the fallback code
- ✅ tx.origin is used correctly in the fallback
- ✅ Retry mechanism is implemented for failed VRF requests
- ✅ Official VRF coordinator address is verified
- ✅ VRF subscription is properly funded
- ✅ Proper error handling for VRF failures

## Common Mistakes to Avoid

1. **Duplicate Coordinator References**: Don't hardcode the coordinator address in multiple places.

2. **Insufficient Error Handling**: Always wrap VRF calls in try/catch to handle failures.

3. **Missing EOA Checks**: Always verify EOA when using fallback randomness.

4. **Using msg.sender in Fallback**: Use tx.origin instead of msg.sender for fallback randomness.

5. **No Retry Mechanism**: Always implement retry logic for failed VRF requests.

6. **Not Delaying Entries**: Consider delaying entries when VRF is unavailable to retry later.

By following these rules, we ensure secure, reliable, and consistent randomness in the Dragon ecosystem. 