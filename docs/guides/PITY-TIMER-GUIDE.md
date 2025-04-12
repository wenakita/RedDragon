# SonicRedDragon Lottery Boost System

## What is the Lottery Boost System?

The Lottery Boost System is a community feature of the SonicRedDragon lottery that increases everyone's chance of winning after each unsuccessful draw. What makes it special is that the boost increases proportionally to the size of transactions, creating a more dynamic and fair system.

## How It Works

1. **Base Probability**: Your base winning chance is determined by the amount of wS tokens used in your transaction:
   - 100 wS = 0.1% chance
   - 1,000 wS = 1% chance
   - 10,000 wS = 10% chance (maximum base chance)

2. **Proportional Boost System**: After each lottery loss by any participant:
   - The global boost increases by 5% of the transaction amount
   - For example, a 1,000 wS transaction that doesn't win adds 50 wS worth of boost to the global pool
   - Larger transactions contribute more to the community boost

3. **Maximum Boost**: The global boost can accumulate up to a maximum of 500% (5× equivalent):
   - This translates to 500 wS worth of additional probability for everyone
   - The system prevents unlimited growth while still rewarding community participation

4. **Community Reset**: When anyone wins the jackpot, the global boost resets to zero for everyone.

## How Boosts Are Applied

Unlike a standard multiplier, our boost system works by effectively adding "virtual wS" to your transaction:

1. When you make a transaction, your base probability is calculated based on your actual wS amount.
2. Then, the global accumulated boost (measured in wS) is added to your effective transaction size.
3. Your final probability is calculated based on this boosted transaction size.

### Example Calculation:

- Your transaction: 1,000 wS (base 1% chance)
- Current global boost: 200 wS
- Your effective transaction: 1,200 wS
- Your boosted probability: 1.2%

## Examples of Boost Growth

### After Multiple Small Transactions:
- 10 losses of 100 wS each = 10 × (100 × 5%) = 50 wS boost
- Small buyer (100 wS): Effective 150 wS = 0.15% chance
- Medium buyer (1,000 wS): Effective 1,050 wS = 1.05% chance
- Large buyer (10,000 wS): Effective 10,050 wS = 10% chance (capped)

### After Multiple Medium Transactions:
- 10 losses of 1,000 wS each = 10 × (1,000 × 5%) = 500 wS boost (maximum)
- Small buyer (100 wS): Effective 600 wS = 0.6% chance
- Medium buyer (1,000 wS): Effective 1,500 wS = 1.5% chance
- Large buyer (10,000 wS): Effective 10,500 wS = 10% chance (capped)

### After Multiple Large Transactions:
- Just 2 losses of 10,000 wS each = 2 × (10,000 × 5%) = 1,000 wS (capped at 500 wS)
- Small buyer (100 wS): Effective 600 wS = 0.6% chance
- Medium buyer (1,000 wS): Effective 1,500 wS = 1.5% chance
- Large buyer (10,000 wS): Effective 10,500 wS = 10% chance (capped)

## Community Benefits

The Proportional Boost System creates several unique benefits:

1. **Larger Transactions Help Everyone**: When someone makes a large transaction that doesn't win, they contribute more to the community boost.

2. **Faster Boost Growth**: The boost grows in proportion to transaction size, not just the number of transactions.

3. **Fairness to All Participants**: The same boost value benefits smaller players proportionally more than larger players.

4. **Strategic Timing**: As the global boost increases, participants may choose their entry timing strategically.

## Checking the Global Boost Status

You can check the current global boost status through these methods:

1. **Block Explorer**: Visit SonicScan and connect to the lottery contract to see the accumulated boost amount.

2. **Community Dashboard**: Visit our community dashboard (coming soon) where you can view the current global boost amount and percentage.

3. **Direct Contract Interaction**: Advanced users can call the `getCurrentPityBoost()` function to see the raw boost amount in wS units.

## FAQ

**Q: Does each transaction contribute to the boost?**
A: Yes, each eligible transaction (100 wS or more) that doesn't win adds to the global boost at 5% of its transaction amount.

**Q: Does the boost favor larger transactions?**
A: Larger transactions contribute more to the boost pool, but the boost itself benefits smaller transactions proportionally more.

**Q: What happens when someone wins?**
A: When anyone wins, the global boost resets to zero, and everyone starts again with their base probability.

**Q: Is there a limit to how high the boost can go?**
A: Yes, the maximum boost is equivalent to 500 wS worth of probability (a 5× boost for a 100 wS transaction).

**Q: If nobody trades for a while, does the boost expire?**
A: No, the global boost persists indefinitely until someone wins or the contract is upgraded.

**Q: Does this mean I should wait for a high global boost before making my transaction?**
A: This creates an interesting strategic element! While waiting for a higher boost increases your odds, it also means other users might win first and reset the boost. Finding the right balance is part of the fun! 