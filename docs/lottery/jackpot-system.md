# 🔥 DRAGON Jackpot System

This document provides details about the DRAGON jackpot mechanism and how it operates within the lottery system.

## Jackpot Overview

The DRAGON protocol features a dynamic jackpot system that accumulates from trading fees and rewards users who swap Wrapped Sonic (wS) for DRAGON tokens. The jackpot grows organically through protocol activity, creating a sustainable reward mechanism.

## Estimated Jackpot Size

Based on expected trading volume and probability calculations:

- Average jackpot size: ~$18,000-$25,000
- Winner receives: 69% (~$12,500-$17,250)
- 31% stays in jackpot for future rounds
- Typical win frequency: Once per ~300 swaps

## Jackpot Growth Mechanism

The jackpot accumulates through:

- 6.9% of all DRAGON buy fees going to jackpot
- 6.9% of all DRAGON sell fees going to jackpot
- External funding (optional protocol-owned liquidity additions)

## Winning Distribution

When a user wins the jackpot:
- 69% of the current jackpot is transferred to the winner
- 31% remains in the jackpot to seed the next round
- This creates a sustainable system where the jackpot never fully depletes

## Code Implementation

The jackpot distribution logic is implemented in `DragonSwapTriggerV2.sol`:

```solidity
// Jackpot distribution percentage (69%)
uint256 public constant JACKPOT_DISTRIBUTION = 69;

// When processing a win
if (_randomness % winThreshold == 0) {
    // Calculate win amount (69% of jackpot)
    uint256 currentJackpot = jackpotBalance;
    uint256 winAmount = currentJackpot * JACKPOT_DISTRIBUTION / 100;
    
    // Update jackpot (31% remains)
    jackpotBalance = currentJackpot - winAmount;
    
    // Transfer tokens to winner
    wrappedToken.safeTransfer(user, winAmount);
    
    // Emit event
    emit JackpotWon(user, winAmount, jackpotBalance);
}
```

## Factors Affecting Jackpot Size

The jackpot can grow significantly based on several factors:

1. **Trading Volume**: Higher volume = faster jackpot growth
2. **Market Conditions**: More volatile markets typically generate more trading
3. **Time Between Winners**: Longer periods without a winner allow larger accumulation
4. **Swap Sizes**: Smaller average swap sizes result in fewer wins, allowing larger accumulation

## Recommended User Strategy

To maximize chances of winning the jackpot:

- Make larger swaps when possible (win chance scales linearly with USD amount)
- Hold ve69LP tokens to boost winning probability (up to 2.5x)
- Participate during periods of high jackpot accumulation 