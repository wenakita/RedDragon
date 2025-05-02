# Dragon Token Dynamic Fee System

## Overview

The Dragon token implements a sophisticated dynamic fee system that uses the Hermès mathematical formula to optimize fee allocation based on market conditions. This document outlines the fee structure, explains the Hermès formula implementation, and details how fees are distributed across various protocol components.

## Fee Structure Overview

The Dragon token employs a multi-tiered fee system:

1. **Buy Fees (10% total)**
   - 6.9% to jackpot (initially)
   - 2.41% to ve69LP fee distributor (initially)
   - 0.69% burn

2. **Sell Fees (10% total)**
   - 6.9% to jackpot (initially) 
   - 2.41% to ve69LP fee distributor (initially)
   - 0.69% burn

3. **Transfer Fee**
   - 0.69% burn on all transfers

While the initial values are hard-coded, the architecture supports dynamic adjustment of these values through the Hermès formula, allowing the protocol to adapt to changing market conditions.

## Hermès Formula Implementation

The Hermès formula is a mathematical model implemented in the Dragon ecosystem to dynamically adjust the distribution of fees between the jackpot and liquidity providers. The formula optimizes for long-term protocol health by considering factors like:

- Current jackpot size
- Trading volume
- Market liquidity
- Participant count

### Mathematical Formula

The core of the Hermès formula is:

```
H(x) = ∛(x⁴ + D^(N+2)/(N²x)) - x²/(3∛(x⁴ + D^(N+2)/(N²x)))
```

Where:
- x: Input value (often normalized jackpot size)
- D: Protocol constant (governance parameter)
- N: Protocol constant (governance parameter)
- ∛: Cube root operation

This formula produces a normalized value that is used to calibrate fee distribution ratios.

## Implementation in Dragon Ecosystem

The implementation spans several contracts:

### 1. OmniDragon.sol

This is the main token contract that defines the fee structure:

```solidity
// Fee structure
struct Fees {
    uint256 jackpotFee; // Fee for jackpot (basis points)
    uint256 ve69LPFee;  // Fee for ve69LP (basis points)
    uint256 burnFee;    // Fee for burning (basis points)
    uint256 totalFee;   // Total fee (basis points)
}

// Initial fee values - may be adjusted using Hermès formula for adaptive allocation
Fees public buyFees = Fees(690, 241, 69, 1000);  
// 10% total - Initially 6.9% to jackpot, 2.41% to ve69LPFeedistributor, 0.69% burn
Fees public sellFees = Fees(690, 241, 69, 1000); 
// 10% total - Initially 6.9% to jackpot, 2.41% to ve69LPFeedistributor, 0.69% burn
```

The contract includes setter functions to adjust these values:

```solidity
function setBuyFees(uint256 _jackpotFee, uint256 _ve69LPFee, uint256 _burnFee) external override onlyOwner
function setSellFees(uint256 _jackpotFee, uint256 _ve69LPFee, uint256 _burnFee) external override onlyOwner
```

### 2. DragonAdaptiveFeeManager.sol

This specialized contract implements the Hermès formula calculation logic and manages dynamic fee adjustments:

```solidity
// Calculate optimal fee allocation based on Hermès formula
function calculateAdaptiveFees(
    uint256 _jackpotSize,
    uint256 _dailyVolume
) public view returns (
    uint256 _jackpotFee,
    uint256 _liquidityFee
) {
    // Implementation of Hermès formula calculation
    // ...
}
```

The manager can periodically update the fee allocation by calling the setter functions in OmniDragon contract.

### 3. HermesMath.sol

This library contains the core mathematical implementation of the Hermès formula:

```solidity
function calculateHermesValue(uint256 x, uint256 d, uint256 n) internal pure returns (uint256) {
    // Handle edge cases
    if (x == 0) return 0;
    
    // Step 1: Calculate the component under the cube root
    uint256 component1 = approximateComponent1(x, d, n);
    
    // Step 2: Calculate the cube root
    uint256 cubeRoot = approximateCubeRoot(component1);
    
    // Step 3: Calculate the second component
    uint256 component2 = approximateComponent2(x, cubeRoot);
    
    // Return the result (ensuring no underflow)
    if (component2 >= cubeRoot) return 0;
    return cubeRoot.sub(component2);
}
```

## Jackpot Fee Distribution System

The jackpot distribution also uses the Hermès formula through the DragonJackpotDistributor contract:

```solidity
// Calculate the distribution percentages for prizes
function calculateJackpotDistribution(
    uint256 jackpotSize,
    uint256 totalParticipants,
    uint256[4] memory params
) external pure returns (
    uint256 mainPrize,
    uint256 secondaryPrize,
    uint256 participationRewards
)
```

This creates a cohesive system where both fee collection and distribution are dynamically optimized.

## Adaptive Allocation Benefits

The dynamic fee allocation system provides several benefits:

1. **Market Responsiveness**: Fees adjust to market conditions automatically
2. **Jackpot Optimization**: When jackpot is small, more fees are directed to it; when large, more to liquidity
3. **Protocol Sustainability**: Balances immediate rewards with long-term liquidity health
4. **Participant Incentives**: Adjusts distribution based on participation levels

## Governance Parameters

The system includes governance parameters that can be updated to fine-tune the formula:

1. **D Parameter**: Influences the curve steepness (default: 100)
2. **N Parameter**: Affects sensitivity to changes (default: 10)
3. **Fee Update Interval**: Controls how often fees are recalculated
4. **Min/Max Distribution Percentages**: Establishes boundaries for fee allocations

## Implementation Considerations

1. **Gas Optimization**: The implementation includes approximations for complex math operations like cube roots to minimize gas costs.
2. **Safety Bounds**: Fee allocations have min/max bounds to prevent extreme values.
3. **Graceful Fallback**: If the adaptive system is disabled, falls back to fixed fee allocations.
4. **Event Emissions**: All fee changes emit events for transparency and tracking.

## Conclusion

The Dragon token's dynamic fee system represents an advanced approach to protocol economics, using mathematical modeling to optimize fee distribution based on real-time market conditions. By implementing the Hermès formula, the protocol can balance jackpot growth, liquidity incentives, and tokenomics to create a sustainable and attractive ecosystem for users. 