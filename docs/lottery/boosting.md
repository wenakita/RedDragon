# Lottery Probability Boosting System

The DRAGON lottery implements a sophisticated probability boosting mechanism that rewards ve69LP holders with increased chances of winning the jackpot. This document explains how the boost system works.

## Boost Overview

When users swap Wrapped Sonic (wS) for DRAGON, their chance of winning the jackpot is determined by two factors:
1. The USD value of their swap (base probability)
2. Their ve69LP voting power (boost multiplier)

The boost mechanism allows users who have locked ve69LP tokens to multiply their winning chances by up to 2.5x.

## Cube Root Scaling Function

The boost uses a cube root scaling function to provide a fair distribution:

```solidity
function calculateBoost(uint256 _votingPower) public view returns (uint256) {
    // No voting power = no boost
    if (_votingPower == 0 || maxVotingPower == 0) {
        return BPS_SCALE; // 1.0x boost (10000 basis points)
    }
    
    // Calculate normalized voting power (with capped maximum)
    uint256 normalizedVP = _votingPower > maxVotingPower
        ? CUBE_ROOT_PRECISION
        : (_votingPower * CUBE_ROOT_PRECISION) / maxVotingPower;
    
    // Calculate cube root
    uint256 cubeRoot = computeCubeRoot(normalizedVP);
    
    // Scale to boost factor (1.0x + boost factor * max boost)
    uint256 boostFactor = cubeRoot * (MAX_BOOST_BPS - BPS_SCALE) / CUBE_ROOT_PRECISION;
    uint256 boost = BPS_SCALE + boostFactor;
    
    return boost;
}
```

## Why Cube Root?

The cube root function was specifically chosen for its diminishing returns curve. This creates several benefits:

1. **Equitable Distribution**: Small ve69LP holders still receive meaningful boosts
2. **Diminishing Returns**: Prevents extreme concentration of winning probability
3. **Balanced Incentive**: Encourages ve69LP accumulation without making it mandatory

## Boost Scale

The following table illustrates the relationship between ve69LP voting power and boost multiplier:

| % of Max Voting Power | Boost Multiplier |
|-----------------------|------------------|
| 0% (no ve69LP)        | 1.00x            |
| 1%                    | 1.15x            |
| 10%                   | 1.58x            |
| 25%                   | 1.88x            |
| 50%                   | 2.15x            |
| 75%                   | 2.32x            |
| 100%                  | 2.50x            |

## Combined Probability Calculation

The final win probability is calculated by multiplying the base probability (from USD amount) by the boost:

```
finalProbability = baseProbability * boost
```

For example:
- $5,000 swap = 2% base probability
- 50% of max voting power = 2.15x boost
- Final probability = 2% * 2.15 = 4.3%

## Implementation Example

In practice, the boosting is implemented in the `calculateWinProbability` function:

```solidity
function calculateWinProbability(uint256 _usdAmount, uint256 _votingPower) external view returns (uint256) {
    uint256 baseProbability = calculateBaseProbability(_usdAmount);
    uint256 boost = calculateBoost(_votingPower);
    
    // Apply boost to base probability
    return (baseProbability * boost) / BPS_SCALE;
}
```

## Benefits

The boosting system provides several key benefits:

1. **Enhanced ve69LP Value**: Creates additional utility for ve69LP tokens
2. **Encourages Long-Term Locking**: Higher voting power = higher boost
3. **Fair Distribution**: Even small ve69LP holders receive meaningful boosts
4. **Strategic Depth**: Users can optimize both swap size and ve69LP holdings
5. **Layer 0 Ecosystem Support**: Strengthens the relationship between Dragon and ve69LP

## Monitoring Your Boost

Users can check their current boost level through:
1. The DRAGON dApp interface
2. Directly querying the ve69LP boost contract
3. Calculating it manually using their voting power percentage
