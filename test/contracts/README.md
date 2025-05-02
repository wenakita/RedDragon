# OmniDragon Test Contracts

This directory contains test contracts for the OmniDragon project, specifically focusing on VRF, cross-chain, and lottery mechanics testing.

## Test Contracts Overview

### 1. TestVRFConsumer.sol
Simulates the VRF (Verifiable Random Function) functionality needed for the lottery system. Allows testing of:
- Requesting randomness for lottery participants
- Delivering randomness to trigger lottery results
- Callback handling for VRF responses

### 2. TestCrossChainBridge.sol
Simulates the cross-chain bridge functionality for OmniDragon tokens. Allows testing of:
- Chain registry and configuration
- Cross-chain message passing
- Token supply tracking across multiple chains
- Message delivery simulation

### 3. TestLotteryMechanics.sol
Simulates the lottery mechanics associated with swapping wS (Wrapped Sonic) to DRAGON tokens. Features:
- Swap simulation with lottery entry
- Jackpot management
- Win probability configuration
- Winner selection and prize distribution

### 4. TestOmniDragon.sol
A comprehensive integration test contract that combines all the above components into a complete testing suite. Includes:
- Mock token implementations (wS, DRAGON)
- Mock infrastructure contracts (ve69LPFeeDistributor, JackpotVault)
- Complete simulation of end-to-end lottery mechanics
- Cross-chain transfer testing
- VRF randomness testing

## Testing Flow

### Basic Testing Flow

1. Deploy TestVRFConsumer, TestCrossChainBridge, and TestLotteryMechanics individually for component testing
2. Deploy TestOmniDragon for integration testing
3. Simulate swaps to trigger lottery entries
4. Simulate VRF randomness requests and fulfillments to trigger lottery results
5. Simulate cross-chain transfers to test omnichain functionality
6. Verify jackpot distributions and token balances

### Advanced Testing Scenarios

#### VRF Testing
```solidity
// 1. Request randomness for a user
uint256 requestId = testVRFConsumer.requestRandomness(userAddress);

// 2. Deliver randomness to trigger lottery result
testVRFConsumer.deliverRandomness(requestId, randomValue);
```

#### Cross-Chain Testing
```solidity
// 1. Set up chain configurations
testCrossChainBridge.registerChain(146, "Sonic");
testCrossChainBridge.registerChain(110, "Arbitrum");

// 2. Send cross-chain message
uint256 messageId = testCrossChainBridge.sendMessage(
    146, // Sonic Chain ID
    110, // Arbitrum Chain ID
    sonicOmniDragonAddress,
    arbitrumOmniDragonAddress,
    messagePayload
);

// 3. Deliver the message
testCrossChainBridge.deliverMessage(messageId, executorAddress);
```

#### Lottery Testing
```solidity
// 1. Add funds to jackpot
testLotteryMechanics.addToJackpot(jackpotAmount);

// 2. Simulate a swap that triggers lottery entry
testLotteryMechanics.simulateSwap(wsAmount);

// 3. Simulate a lottery win
testLotteryMechanics.simulateWin(winnerAddress, winAmount);
```

## Test Contract Deployment

The TestOmniDragon contract will automatically set up the test environment including all required mock contracts and configurations. To use it:

1. Deploy the OmniDragon contract first
2. Deploy TestOmniDragon with the following parameters:
   - deployer: Address that will be assigned initial tokens
   - user1: Test user 1 address
   - user2: Test user 2 address
   - dragonToken: Address of the deployed OmniDragon contract

## Important Notes

- These are test contracts only and should not be used in production
- Mock implementations simplify real-world complexity for testing
- Some functionality may be simplified or stubbed
- The tests focus on functionality, not security or gas optimization 