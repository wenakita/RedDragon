# DragonMathLib

A shared mathematical library for standardized calculations across the Dragon contracts ecosystem.

## Overview

`DragonMathLib` provides a collection of mathematical and utility functions that ensure consistent calculations throughout the codebase. This library centralizes all critical mathematical operations to avoid duplication, improve gas efficiency, and make maintenance easier.

## Key Features

- **Cube Root Calculation**: Efficient implementation of cube root using Newton's method
- **Voting Power Calculation**: Standardized calculation of voting power with cube root normalization
- **Boost Multiplier Calculation**: Consistent calculation of boost multipliers for ve-token systems
- **Timed Voting Power**: Calculate voting power based on token amount and lock time
- **Percentage and Ratio Calculations**: Safe calculation of percentages and ratios
- **Weight Normalization**: Normalize weight arrays to sum to a specified precision
- **Advanced Math Utilities**: Range mapping, linear interpolation, and weighted averages

## Usage

### Importing the Library

```solidity
import "./math/DragonMathLib.sol";

contract MyContract {
    using DragonMathLib for uint256;
    
    // ...
}
```

### Common Functions

#### Cube Root
```solidity
uint256 result = DragonMathLib.cubeRoot(value);
```

#### Voting Power Calculation
```solidity
uint256 votingPower = DragonMathLib.calculateVotingPower(amount);
```

#### Timed Voting Power (for ve-tokens)
```solidity
uint256 votingPower = DragonMathLib.calculateTimedVotingPower(
    amount,
    unlockTime,
    block.timestamp,
    MAX_LOCK_TIME
);
```

#### Boost Multiplier
```solidity
uint256 boost = DragonMathLib.calculateBoostMultiplier(
    userBalance,
    totalSupply,
    baseBoost,
    maxBoost,
    PRECISION
);
```

#### Apply Boost
```solidity
uint256 boostedAmount = DragonMathLib.applyBoost(
    amount,
    multiplier,
    PRECISION
);
```

#### Normalize Weights
```solidity
uint256[] memory normalizedWeights = DragonMathLib.normalizeWeights(
    weights,
    PRECISION
);
```

## Precision and Constants

The library uses `PRECISION = 1e18` for fixed-point arithmetic. This ensures high precision in calculations while avoiding floating point operations.

## Integration with Other Contracts

### ve69LP

The `ve69LP` contract uses `DragonMathLib` for calculating voting power based on locked amount and time.

### ve69LPUtilities

The `ve69LPUtilities` contract uses `DragonMathLib` for:
- Calculating boost multipliers
- Applying boosts to jackpot entries
- Normalizing voting weights for multi-gauge voting

## Benefits of Using DragonMathLib

1. **Consistency**: All contracts use the same mathematical calculations
2. **Gas Efficiency**: Optimized implementations of complex operations
3. **Maintainability**: Updates to math functions only need to be made in one place
4. **Security**: Centralized implementation allows for more thorough testing

## Multi-Gauge Voting Implementation

The library includes special functions to support multi-gauge voting similar to vlCVX:

- `normalizeWeights`: Ensures weights sum to the specified precision (10000 = 100%)
- `calculatePercentage`: Calculates percentages with high precision
- `calculateBoostMultiplier`: Determines voting power boost based on token holdings

These functions are used in the ve69LPUtilities contract to implement weight distribution across multiple gauges. 