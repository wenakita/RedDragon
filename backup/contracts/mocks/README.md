# Mock Contracts

This directory contains mock implementations used for testing the RedDragon token and its related contracts.

## Overview

Mock contracts simulate external dependencies and provide testing utilities that allow for controlled and deterministic testing environments. These mocks are designed to be reliable, comprehensive, and easy to use in testing scenarios.

## Mock Contracts

### MockVRFCoordinator

A mock implementation of PaintSwap's VRF Coordinator for testing randomness generation:

- Simulates the request/fulfill randomness flow
- Provides detailed error reporting with the `FulfillmentError` event
- Includes helper methods like `getRandomResult` and `isRequestFulfilled`
- Features robust error handling with reason extraction

```solidity
// Example usage in tests
const { mockVRFCoordinator, verifier } = await loadFixture(deployVerifierFixture);
const tx = await verifier.requestRandomness();
const receipt = await tx.wait();
// Extract requestId from logs...
await mockVRFCoordinator.fulfillRandomWords(requestId, [123]);
```

### MockProcessSwap

A mock implementation of the lottery/swap processing interface:

- Tracks method calls for test verification
- Implements `processBuy` and `addToJackpot` methods
- Provides call counting and last call info for assertions

```solidity
// Example usage in tests
const mockProcessSwap = await ethers.deployContract("MockProcessSwap");
await redDragon.setLotteryAddress(await mockProcessSwap.getAddress());
// Perform operations...
const callCount = await mockProcessSwap.getCallCount();
expect(callCount).to.be.gt(0);
```

### MockERC20

A simple ERC20 token implementation for testing:

- Includes `mint` function for test setup
- Implements standard ERC20 functionality

```solidity
// Example usage in tests
const wrappedSonic = await ethers.deployContract("MockERC20", ["Wrapped Sonic", "wS", 18]);
await wrappedSonic.mint(user1.address, ethers.parseEther("1000"));
```

### MockExchangePair

A mock implementation of an exchange pair:

- Simulates buy and sell transactions
- Manages token balances for testing

```solidity
// Example usage in tests
const exchangePair = await ethers.deployContract("MockExchangePair", [token.address, wrappedSonic.address]);
await exchangePair.simulateBuy(user.address, wsAmount, tokenAmount);
```

## Best Practices for Using Mocks

1. **Initialize with Clear State**: Always initialize mocks with a known state for deterministic testing

2. **Verify Interactions**: Check that your contract properly interacted with the mock

3. **Test Error Conditions**: Use mocks to simulate error conditions and verify proper error handling

4. **Log Events**: Monitor events emitted by mocks for validation

5. **Isolate Tests**: Reset mock state between tests to avoid cross-test contamination

## Development Guidelines

When creating new mocks:

1. Include detailed error messages and event logging

2. Add helper methods to make testing easier

3. Document expected usage with code examples

4. Implement proper state tracking for verification

5. Add fallback mechanisms for reliability 