# Migrating from Shadow DEX to Balancer/Beethoven X

This guide outlines the process of migrating your contracts from Shadow DEX to Balancer/Beethoven X for liquidity management and pool creation.

## Key Differences

### Architecture
- **Shadow DEX**: Uses a factory + pair + router pattern similar to Uniswap v2
- **Balancer/Beethoven X**: Uses a vault-based architecture with weighted pools

### Pool Types
- **Shadow DEX**: Fixed 50/50 liquidity pools
- **Balancer/Beethoven X**: Customizable weighted pools (e.g., 80/20, 60/40)

### Fee Structure
- **Shadow DEX**: Fixed fees per pool
- **Balancer/Beethoven X**: Customizable fees per pool

## Interface Migration Reference

| Shadow Interface | Balancer Replacement | Notes |
|------------------|----------------------|-------|
| `IShadowFactory` | `IBalancerWeightedPoolFactory` | Used for creating new pools |
| `IShadowPair` | Use vault methods | Pairs are accessed through the vault |
| `IShadowRouter` | `IBalancerVault` | Vault handles all pool interactions |
| `IRouter` | `IBalancerVault` | Use vault for all liquidity operations |

## Code Migration Examples

### 1. Creating a Pool

**Shadow DEX:**
```solidity
address pair = IShadowFactory(factory).createPair(tokenA, tokenB);
```

**Balancer/Beethoven X:**
```solidity
address[] memory tokens = new address[](2);
tokens[0] = tokenA;
tokens[1] = tokenB;

uint256[] memory weights = new uint256[](2);
weights[0] = 8e17; // 80%
weights[1] = 2e17; // 20%

address pool = IBalancerWeightedPoolFactory(factory).create(
    "Pool Name",
    "SYMBOL",
    tokens,
    weights,
    swapFeePercentage,
    owner
);
```

### 2. Adding Liquidity

**Shadow DEX:**
```solidity
(uint amountA, uint amountB, uint liquidity) = IRouter(router).addLiquidity(
    tokenA,
    tokenB,
    amountADesired,
    amountBDesired,
    amountAMin,
    amountBMin,
    to,
    deadline
);
```

**Balancer/Beethoven X:**
```solidity
// Approve tokens to vault
IERC20(tokenA).approve(vault, amountA);
IERC20(tokenB).approve(vault, amountB);

// Create join request
address[] memory assets = new address[](2);
assets[0] = tokenA;
assets[1] = tokenB;

uint256[] memory amounts = new uint256[](2);
amounts[0] = amountA;
amounts[1] = amountB;

bytes memory userData = abi.encode(IBalancerVault.JoinKind.EXACT_TOKENS_IN_FOR_BPT_OUT, amounts, minBPTOut);

IBalancerVault.JoinPoolRequest memory request = IBalancerVault.JoinPoolRequest({
    assets: assets,
    maxAmountsIn: amounts,
    userData: userData,
    fromInternalBalance: false
});

// Join the pool
IBalancerVault(vault).joinPool(
    poolId,
    address(this),
    recipient,
    request
);
```

### 3. Removing Liquidity

**Shadow DEX:**
```solidity
(uint amountA, uint amountB) = IRouter(router).removeLiquidity(
    tokenA,
    tokenB,
    liquidity,
    amountAMin,
    amountBMin,
    to,
    deadline
);
```

**Balancer/Beethoven X:**
```solidity
// Approve BPT tokens to vault
IERC20(poolAddress).approve(vault, bptAmount);

// Create exit request
address[] memory assets = new address[](2);
assets[0] = tokenA;
assets[1] = tokenB;

uint256[] memory minAmounts = new uint256[](2);
minAmounts[0] = minAmountA;
minAmounts[1] = minAmountB;

bytes memory userData = abi.encode(IBalancerVault.ExitKind.EXACT_BPT_IN_FOR_TOKENS_OUT, bptAmount);

IBalancerVault.ExitPoolRequest memory request = IBalancerVault.ExitPoolRequest({
    assets: assets,
    minAmountsOut: minAmounts,
    userData: userData,
    toInternalBalance: false
});

// Exit the pool
IBalancerVault(vault).exitPool(
    poolId,
    address(this),
    recipient,
    request
);
```

## Migration Steps

1. Create the Balancer/Beethoven X interfaces:
   - `IBalancerVault.sol`
   - `IBalancerWeightedPoolFactory.sol`

2. Update your contracts to import and use these new interfaces

3. Run the script to move deprecated Shadow interfaces to the deprecated folder:
   ```bash
   ./scripts/move_shadow_to_deprecated.sh
   ```

4. Test all functionality thoroughly after migration

## Advantages of Migration

1. **Customizable Pool Weights**: Create pools with weights tailored to your tokenomics
2. **Advanced Swap Mechanics**: Better price impact for large trades
3. **Multiple Asset Pools**: Support for pools with more than 2 tokens
4. **Integration with Beethoven X Ecosystem**: Access to additional features and yield opportunities 