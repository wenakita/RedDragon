# Dragon Ecosystem Participation Guide

This guide explains how to interact with the Dragon ecosystem based on your preferred role. Whether you're a trader looking for opportunities, a liquidity provider seeking passive income, or a lottery enthusiast chasing the jackpot, this document will help you navigate the Dragon ecosystem.

## Table of Contents
- [For Traders](#for-traders)
- [For Liquidity Providers](#for-liquidity-providers)
- [For Lottery Participants](#for-lottery-participants)
- [For Gold Scratcher Holders](#for-gold-scratcher-holders)
- [For Developers & Integrators](#for-developers--integrators)

## For Traders

### Getting Started
1. **Connect Your Wallet**: Visit the Dragon dApp and connect your Sonic-compatible wallet (Metamask, etc.)
2. **Acquire wSonic**: You'll need wrapped Sonic (wSonic) to trade for DRAGON tokens.
3. **Enable Trading**: Approve the DRAGON token contract to interact with your wallet.

### Buying DRAGON
1. Navigate to the "Swap" section of the dApp.
2. Input the amount of wSonic you want to spend.
3. Review the transaction details:
   - Expected DRAGON amount
   - Price impact
   - 10% fee breakdown (6.9% jackpot, 2.41% ve69LP, 0.69% burn)
   - Automatic lottery entry
4. Confirm the transaction.

### Selling DRAGON
1. Navigate to the "Swap" section of the dApp.
2. Input the amount of DRAGON you want to sell.
3. Review the transaction details:
   - Expected wSonic amount
   - Price impact
   - 10% fee breakdown (6.9% jackpot, 2.41% ve69LP, 0.69% burn)
4. Confirm the transaction.

### Trading Tips
- **Understand the Fees**: Every transaction incurs a 10% fee, so factor this into your trading strategy.
- **Monitor the Jackpot**: Higher jackpots tend to drive more trading activity.
- **Watch for Lottery Winners**: Significant jackpot wins can impact price as winners may sell a portion of their winnings.
- **Consider LP Position**: The 69/31 weighted pool provides a more stable trading environment for DRAGON.

## For Liquidity Providers

### Providing Liquidity
1. Navigate to the "Liquidity" section of the dApp.
2. Select "Add Liquidity" for the DRAGON/wSonic pool.
3. Input the amount of tokens you wish to provide:
   - The interface will automatically calculate the corresponding amount of the other token based on the 69/31 ratio.
   - You need both DRAGON and wSonic tokens to provide liquidity.
4. Confirm the transaction to receive BPT (Balancer Pool Tokens).

### Locking LP for ve69LP
1. Navigate to the "ve69LP" section of the dApp.
2. Connect your wallet and select "Lock LP Tokens."
3. Choose the amount of BPT tokens to lock.
4. Select a lock duration (1 week to 4 years):
   - Longer locks provide higher voting power
   - Voting power = amount * (lock time / max time)^(1/3)
5. Confirm the transaction.

### Managing Your ve69LP Position
1. View your current lock position in the "ve69LP Dashboard":
   - Locked amount
   - Remaining lock time
   - Current voting power
   - Estimated share of fee distribution
2. Extend lock time (optional):
   - You can increase your lock time, but not decrease it
   - Extending lock time increases voting power
3. Increase locked amount (optional):
   - You can add more BPT to your existing lock
   - This increases your share of fee distribution
4. Claim fees:
   - Accumulated fees from the 2.41% allocation are distributed weekly
   - Claim them in the "Claim Rewards" section

### LP Tips
- **Optimal Lock Duration**: Longer locks significantly increase voting power due to the cubic root function.
- **Fee Calculation**: Your share of the 2.41% fee is proportional to your voting power relative to total voting power.
- **Impermanent Loss**: Be aware of potential impermanent loss due to price movements.
- **Compounding Strategy**: Reinvesting claimed fees into more LP can grow your position over time.

## For Lottery Participants

### How the Lottery Works
1. **Entry Mechanism**: Every wSonic to DRAGON swap generates a lottery entry for the buyer.
2. **Win Chance**: Base probability is 0.04% (4/10000), with potential boosts.
3. **Prize Distribution**: Winners receive 69% of the current jackpot balance.
4. **Jackpot Growth**: The jackpot continually grows from the 6.9% transaction fee.

### Maximizing Your Chances
1. **ve69LP Boost**:
   - Lock LP tokens to receive ve69LP voting power
   - Higher voting power increases win probability
   - Boost scales with cubic root of voting power
2. **Gold Scratcher Boost**:
   - Hold Gold Scratcher NFTs to boost your jackpot share
   - Each Gold Scratcher increases the jackpot percentage up to 84% (from base 69%)
   - Limited supply (100 total) makes them valuable assets
3. **Promotional Items**:
   - Special promotional items can further boost win chance
   - Check the dApp for current promotional offers

### Checking Lottery Status
1. Navigate to the "Lottery" section of the dApp.
2. View current jackpot balance and your estimated win probability.
3. Review historical winners and jackpot distributions.

### If You Win
1. Winnings are automatically transferred to your wallet in wSonic.
2. The transaction hash serves as verification of the win.
3. Consider reinvesting a portion to maintain participation in the ecosystem.

### Lottery Tips
- **Regular Participation**: More entries means more chances to win.
- **Optimal Entry Size**: Smaller, more frequent swaps may be more effective than single large swaps.
- **VRF Verification**: All random number generation can be verified on-chain through PaintSwap VRF.
- **Fallback Mechanism**: If VRF is temporarily unavailable, you'll receive a Gold Scratcher NFT as compensation.

## For Gold Scratcher Holders

### Obtaining Gold Scratchers
1. **Primary Methods**:
   - Awarded when VRF is unavailable during lottery entry
   - Special promotions or community events
   - Purchase from secondary markets if available
2. **Maximum Supply**: Only 100 Gold Scratchers will ever exist.

### Using Gold Scratchers
1. Gold Scratchers are automatically applied when you win the lottery.
2. They increase your jackpot share from 69% up to 84% (additional 15%).
3. They remain in your wallet and can be used for multiple wins.

### Managing Your Gold Scratchers
1. View your Gold Scratchers in the "NFT" section of the dApp.
2. Each Gold Scratcher has a unique ID and potentially different artwork.
3. You can transfer them to other users if desired.

## For Developers & Integrators

### Contract Addresses
- DRAGON Token: `[Contract Address]`
- DragonJackpotVault: `[Contract Address]`
- ConcreteDragonLotterySwap: `[Contract Address]`
- GoldScratcher: `[Contract Address]`
- ve69LP: `[Contract Address]`

### Integration Points
1. **Token Integration**:
   - Standard ERC20 interface with 10% fee on transfers
   - Consider the fee when calculating expected output amounts
2. **Lottery Integration**:
   - Only direct swaps through the official contract generate lottery entries
   - Intermediary contracts cannot win the lottery (tx.origin check)
3. **LP Integration**:
   - Standard Balancer V3 weighted pool interface
   - 69/31 weight ratio must be maintained

### API Documentation
For detailed API documentation and code examples, refer to the [Developer Documentation](https://example.com/dragon-developers) section of our website.

---

## Need Help?
Join our community channels for assistance:
- Telegram: [t.me/sonicreddragon](https://t.me/sonicreddragon)
- Twitter: [@sonicreddragon](https://twitter.com/sonicreddragon)
- Discord: [discord.gg/sonicreddragon](https://discord.gg/sonicreddragon) 