# Native Token Swap Testing

This documentation outlines the testing approach for native token swapping across multiple blockchain networks in the Dragon protocol.

## Overview

The Dragon protocol supports native token swapping across different chains. When users swap their native tokens (ETH, AVAX, SONIC, etc.) for DRAGON tokens, they are entered into a lottery with a chance to win jackpots. The testing framework ensures that this functionality works consistently across all supported chains.

## Supported Chains

The protocol currently supports the following chains:

| Chain     | Native Token | Wrapped Version | LayerZero Chain ID |
|-----------|--------------|-----------------|-------------------|
| Sonic     | SONIC        | wS              | 146               |
| Arbitrum  | ETH          | wARB            | 110               |
| Optimism  | ETH          | wOP             | 111               |
| Ethereum  | ETH          | wETH            | 102               |
| Avalanche | AVAX         | wAVAX           | 106               |
| Polygon   | MATIC        | wMATIC          | 109               |
| BNB Chain | BNB          | wBNB            | 108               |
| Base      | ETH          | wBASE           | 184               |

## Test Framework

The test framework consists of:

1. **Mock Contracts**: Mock implementations of key components including:
   - `MockWETH`: Simulates wrapped native tokens (wS, wETH, etc.)
   - `MockVRFConsumer`: Simulates VRF randomness for lottery
   - `MockJackpotVault`: Mocks the jackpot vault for prize distribution
   - `MockVe69LPFeeDistributor`: Mocks the fee distribution system
   - `MockLzEndpoint`: Simulates LayerZero cross-chain messaging

2. **Test Cases**: A comprehensive test suite that verifies:
   - Native token swaps on each chain
   - Lottery entry mechanics
   - Jackpot distribution
   - Fee application consistency
   - Cross-chain communication

3. **Simulation Scripts**: Scripts to simulate real-world scenarios across chains

## Key Test Scenarios

### 1. Basic Native Token Swap

Tests the basic flow of swapping native tokens for DRAGON:

```javascript
// User provides native token (e.g., ETH on Arbitrum)
await swapTrigger.swapNativeForDragon({ value: ethers.utils.parseEther("1.0") });

// Or user provides wrapped token (e.g., wS on Sonic)
await wrappedToken.approve(swapTrigger.address, amount);
await swapTrigger.onSwapNativeTokenToDragon(user.address, amount);
```

### 2. Lottery Mechanics

Tests that lottery entry and randomness generation work consistently:

```javascript 
// Request randomness through VRF
const requestId = await vrfConsumer.requestRandomness(user.address);

// Process randomness
await swapTrigger.processRandomness(requestId, user.address, randomness);
```

### 3. Fee Application

Tests that fees are applied consistently:

- 10% fee on buys (6.9% to jackpot, 2.41% to ve69LPfeedistributor)
- 10% fee on sells (6.9% to jackpot, 2.41% to ve69LPfeedistributor)
- 0.69% burn on all transfers

### 4. Cross-Chain Consistency

Tests that behavior is consistent across all chains:

```javascript
// Test on multiple chains
for (const chain of chains) {
  // Test swap on this chain
  await testSwapOnChain(chain.chainId);
}
```

## Running Tests

To run the native token swap tests:

```bash
# Run the test script
node scripts/test-native-token-swap.js

# Run specific tests
npx hardhat test test/CrossChainTokenSwapTest.js
```

## Expected Results

All tests should pass consistently across all chains. The core functionality should remain the same regardless of the underlying chain, with only minimal chain-specific adaptations.

## Chain-Specific Configurations

Each chain has its own configuration including:

1. **Native Token Wrapper**: The contract that wraps the native token
2. **Swap Trigger**: Chain-specific swap trigger implementation
3. **VRF Consumer**: Chain-specific VRF consumer implementation

All these configurations are managed through the `ChainRegistry` contract.

## Common Issues

- **Inconsistent Fees**: Ensure fee calculations are consistent across chains
- **VRF Integration**: Some chains may have different VRF implementations
- **Gas Optimization**: Different chains have different gas costs

## Future Testing Improvements

1. **Forked Testing**: Test on forked networks to simulate real chain conditions
2. **Stress Testing**: Test high volume and concurrent swaps
3. **Upgradability Testing**: Test contract upgrades and migrations
4. **Security Audits**: Regular security testing and audits 