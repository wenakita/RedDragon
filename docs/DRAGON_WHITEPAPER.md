# Dragon Ecosystem Whitepaper

## Overview
Dragon is a deflationary token with transparent fee distribution and innovative lottery mechanics built on the Sonic blockchain. The ecosystem leverages PaintSwap VRF for verifiable randomness and employs a unique 69/31 weighted pool design to create sustainable tokenomics.

## Core Components

### 1. $DRAGON Token
- **Total Supply**: 6,942,000 DRAGON tokens
- **Decimals**: 18
- **Contract Features**: Transparent fee distribution, anti-bot measures, built-in burning mechanism
- **Trading**: Available through Balancer V3 69/31 weighted pool with wSonic

### 2. Transparent Fee Structure
Every DRAGON transaction incurs a 10% fee, distributed as follows:
- **6.9%** - Sent to the Jackpot Vault for lottery rewards
- **2.41%** - Distributed to ve69LP token holders (locked LP providers)
- **0.69%** - Permanently burned, reducing total supply

### 3. Lottery System
- **Trigger**: Lottery entries are generated when users swap wSonic for DRAGON
- **Randomness**: Powered by PaintSwap VRF for true, verifiable randomness
- **Jackpot Growth**: Continuously increases from the 6.9% fee allocation
- **User-Centric**: Only tx.origin addresses are eligible (no bots or aggregators)

### 4. ve69LP Tokenomics
- **Liquidity Incentives**: LP providers can lock their LP tokens in ve69LP contract
- **Reward Distribution**: Share of the 2.41% fee based on lock duration and amount
- **Voting Power**: ve69LP holders receive boosted lottery chances

## Tokenomics Breakdown

### Initial Distribution
- **Liquidity Pool**: 6,942,000 DRAGON paired with 1,000 wSonic (69/31 weight)
- **No Team Tokens**: 100% of supply provided as liquidity
- **No Pre-sale**: Fair launch model

### Deflationary Mechanics
- **0.69% Burn Rate**: Every transaction reduces total supply
- **Fixed Supply**: No minting function, total supply can only decrease
- **Fee Lock**: Fee percentages are hardcoded and cannot be modified

### Long-term Sustainability
- **Perpetual Jackpot Growth**: 6.9% of all transaction volume feeds the lottery system
- **LP Provider Incentives**: 2.41% fee reward encourages liquidity provision
- **Voting Power Scaling**: Cubic root function for fair distribution of voting power

## Dragon Lottery Mechanics

### Entry Mechanism
1. User swaps wSonic for DRAGON through the official contract
2. Entry is automatically processed when swap completes
3. PaintSwap VRF is called to generate verifiable randomness
4. Win probability is calculated based on base chance + boosts

### Win Chance Formula
Base win chance is 0.04% (4/10000), with potential increases from:
- ve69LP tokens (voting power)
- Gold Scratcher NFTs
- Promotional items

### Jackpot Distribution
- Standard win pays out 69% of the jackpot
- Remaining 31% rolls over to the next jackpot
- If VRF is unavailable, entry is compensated with a Gold Scratcher NFT

## Gold Scratcher System
- **Purpose**: Secondary reward mechanism and lottery boost
- **Acquisition**: Awarded for delayed lottery entries or through promotions
- **Benefits**: Boost jackpot share from 69% up to 84% (additional 15%)
- **Max Supply**: 100 units

## Ve69LP System

### Locking Mechanism
- LP providers receive LP tokens for providing DRAGON/wSonic liquidity
- LP tokens can be locked for 1 week to 4 years
- Longer locks provide greater voting power

### Voting Power Calculation
- Voting power = LP amount * (lock time / max lock time)^(1/3)
- Cubic root scaling ensures fair distribution between small and large holders

### Benefits
- Share of 2.41% transaction fees
- Increased lottery win probability
- Governance rights (future feature)

## Technical Security

### VRF Security
- Primary randomness source: PaintSwap VRF
- Fallback includes additional security checks:
  - `require(tx.origin == msg.sender)`
  - `require(tx.origin.code.length == 0)`
- Retry mechanism for failed VRF requests

### Smart Contract Protections
- No owner privileges over fees or user funds
- All critical functions use timelock delays
- Core functions like `processBuy` and `processEntry` are internal
- External audit completed before deployment

## Roadmap

### Phase 1: Launch (Current)
- Deploy core contracts
- Establish initial liquidity
- Begin lottery operations
- Initiate telegram, discord and twitter bots

### Phase 2: Growth
- Community expansion
- ve69LP integrations
- Additional promotional items

### Phase 3: redDragon Development
- Shadow DEX implementation
- redDragon Ecosystem Reveal 
- Expanded roles for ve69LP holders

## Conclusion
Dragon combines deflationary tokenomics with a fair, verifiable lottery system to create a sustainable ecosystem on Sonic. The transparent fee structure, innovative ve69LP incentives, and commitment to randomness integrity ensure a trustworthy platform for all participants. 