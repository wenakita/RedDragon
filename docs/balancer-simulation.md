# Balancer Pool Simulation

This document describes the mock Balancer Pool implementation for testing the Dragon project's integration with Balancer V3 Weighted Pools.

## Mock Contracts

The following mock contracts were implemented to simulate a Balancer pool:

1. **MockBalancerVault.sol** - This contract simulates the Balancer Vault, which serves as the central hub for all Balancer pools. It handles pool registration, join/exit operations, and swaps.

2. **MockBalancerWeightedPoolV3.sol** - This contract simulates a Balancer Weighted Pool V3, which maintains token balances and weights.

3. **MockBalancerPoolToken.sol** - This contract simulates the Balancer Pool Token (BPT), which represents LP shares in the pool.

## Pool Configuration for Dragon/WSONIC

The pool was configured with the following parameters:

- **Tokens**: DRAGON and WSONIC (Wrapped Sonic)
- **Weights**: 69% DRAGON and 31% WSONIC
- **Initial Balances**: Ratio maintained to match the weights

## Key Operations

The following operations were simulated:

### 1. Pool Creation and Registration

```javascript
// Deploy pool
const pool = await MockWeightedPool.deploy(
  vault.address,
  "Dragon/WSONIC 69/31",
  "DR-WS-LP",
  [dragonAddress, wsonicAddress],
  [
    ethers.utils.parseEther("0.69"), // 69% Dragon
    ethers.utils.parseEther("0.31")  // 31% WSONIC
  ],
  ethers.utils.parseEther("0.003") // 0.3% swap fee
);

// Register pool in vault
const poolId = await pool.getPoolId();
await vault.registerPool(poolId, pool.address, [dragonAddress, wsonicAddress]);
```

### 2. Adding Liquidity (Join Pool)

```javascript
// Create join request
const joinRequest = {
  assets: [dragonAddress, wsonicAddress],
  maxAmountsIn: [dragonAmount, wsonicAmount],
  userData: "0x",
  fromInternalBalance: false
};

// Join pool
await vault.joinPool(
  poolId,
  sender,
  recipient,
  joinRequest
);
```

### 3. Removing Liquidity (Exit Pool)

```javascript
// Create exit request
const exitRequest = {
  assets: [dragonAddress, wsonicAddress],
  minAmountsOut: [0, 0],
  userData: "0x",
  toInternalBalance: false,
  bptAmountIn: bptAmount
};

// Exit pool
await vault.exitPool(
  poolId,
  sender,
  recipient,
  exitRequest
);
```

### 4. Token Swaps

```javascript
// Create swap
const singleSwap = {
  poolId: poolId,
  kind: 0, // GIVEN_IN
  assetIn: dragonAddress,
  assetOut: wsonicAddress,
  amount: swapAmount,
  userData: "0x"
};

const funds = {
  sender: userAddress,
  fromInternalBalance: false,
  recipient: userAddress,
  toInternalBalance: false
};

// Perform swap
await vault.swap(
  singleSwap,
  funds,
  minAmountOut,
  deadline
);
```

### 5. Spot Price Calculation

The spot price calculation follows the weighted formula:
```
spotPrice = (balanceOut / weightOut) / (balanceIn / weightIn)
```

With the 69/31 ratio for both weights and balances, the spot price should be approximately 1.

## Testing

A comprehensive test suite was developed to verify the correct behavior of the mock contracts:

1. **Pool Setup Tests** - Verify that the pool parameters (tokens, weights, balances) are set correctly.
2. **Join Pool Tests** - Verify that liquidity can be added to the pool.
3. **Exit Pool Tests** - Verify that liquidity can be removed from the pool.
4. **Swap Tests** - Verify that tokens can be swapped in the pool.
5. **Spot Price Tests** - Verify that the spot price calculation is working correctly.

## Integration with Dragon

This mock Balancer implementation allows for testing the Dragon token's integration with Balancer pools without requiring a live Balancer deployment. It can be used to simulate all the key operations that Dragon will perform with a real Balancer pool.

The primary use case is to test the Dragon/WSONIC 69/31 pool configuration, which is a key component of the Dragon tokenomics. 