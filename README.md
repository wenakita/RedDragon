# 🐉 Dragon Finance - Sonic Network Contracts

## Overview

Dragon Finance is a revolutionary liquidity and reward system built on the Sonic Network, featuring innovative mechanisms including VRF-based random jackpots, probability-based rewards, LP token staking, voting-escrow (ve) model, and promotional boost mechanisms.

The ecosystem centers around the $DRAGON token which implements a transparent fee structure, automatic burning, and jackpot distribution - creating a sustainable economic model with continuous rewards for participants.

## 📋 Project Structure

```
├── contracts/               # Smart contracts
│   ├── interfaces/          # Contract interfaces
│   ├── adapters/            # Integration adapters
│   └── mocks/               # Mock contracts for testing
├── deploy/                  # Deployment scripts
├── scripts/                 # Helper scripts
├── cloud-functions/         # Off-chain notification & support services
├── metadata/                # NFT and token metadata
├── test/                    # Test scripts and mock contracts
│   ├── helpers/             # Test helper functions
│   ├── mocks/               # Mock contracts for testing
│   └── unit/                # Unit tests grouped by contract
└── docs/                    # Documentation
```

## 🔑 Key Contracts

### Core Contracts

- **Dragon.sol**: The core ERC20 token contract with burning and transfer fee mechanisms
- **DragonLotterySwap.sol**: Base contract for lottery functionality that handles jackpot entries and winning mechanisms
- **DragonShadowV3Swapper.sol**: Manages swapping operations between tokens with integrated jackpot and probability boosting
- **ve69LP.sol**: Voting escrow contract for LP tokens allowing users to lock their LP for voting power
- **ve69LPPoolVoting.sol**: Voting mechanism for ve69LP holders to allocate probability boosts
- **DragonJackpotVault.sol**: Management contract for jackpot rewards distribution
- **VRFValidator.sol**: Chainlink VRF implementation for provably fair randomness

### Feature Contracts

- **GoldScratcher.sol**: NFT contract implementing scratch-to-win mechanics
- **RedEnvelope.sol**: Community rewards and boost mechanism
- **DelayedEntryCompensation.sol**: Handles compensation for delayed jackpot entries
- **DragonPartnerRegistry.sol**: Registry for authorized partners in the ecosystem
- **PromotionalItemRegistry.sol**: Manages promotional items that can boost lottery chances

## 💰 Tokenomics & Fee Structure

### $DRAGON Token

- **Buy Fees** (10% total):
  - 6.9% to jackpot
  - 2.41% to ve69LP fee distributor
  - 0.69% burned

- **Sell Fees** (10% total):
  - 6.9% to jackpot
  - 2.41% to ve69LP fee distributor
  - 0.69% burned

- **Transfer Fee**:
  - 0.69% burned on all transfers

### Lottery System

- Lottery is triggered only when a user swaps $wS for $DRAGON
- The user who executes the swap (tx.origin) is awarded, not aggregators or bots
- Base win chance set to 0.04% with maximum win chance capped at 10%
- Promotional items can boost winning probability up to 5x
- GoldScratcher NFTs provide additional boosts to jackpot percentage

### ve69LP Staking

- Lock LP tokens for voting power with longer lock periods granting more power
- Use voting power to boost partner pools and increase lottery odds
- Non-linear scaling function (cube root) for voting power multiplier
- Pre-calculated maximum boost for gas optimization

## 🔄 Randomness & VRF Implementation

- Paintswap VRF is the primary source of randomness
- Fallback mechanism implemented for when VRF is unavailable
- Security measures in the fallback:
  - Uses tx.origin instead of msg.sender
  - Requires tx.origin == msg.sender
  - Requires tx.origin.code.length == 0
- VRF coordinator (0x3ba925fdeae6b46d0bb4d424d829982cb2f7309e) is trusted
- Retry mechanism for VRF requests when they fail
- Entry may be delayed if VRF is unavailable

## 🛠️ Setup & Installation

### Prerequisites

- Node.js v16+ and npm
- Hardhat
- Foundry (for some tests)

### Installation

1. Clone the repository
```bash
git clone https://github.com/wenakita/reddragon.git
cd SonicRedDragon
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with appropriate values
```

### Compiling Contracts

```bash
npx hardhat compile
```

### Running Tests

Run all tests:
```bash
npx hardhat test
```

Run specific test categories:
```bash
# Run interface tests
npx hardhat test test/unit/interfaces/*.test.js

# Run specific tests
npx hardhat test test/unit/dragon/Dragon.test.js
```

### Deployment

Deploy to local network:
```bash
npx hardhat run scripts/deploy.js
```

Deploy to Sonic Network:
```bash
npx hardhat run scripts/deploy.js --network sonic
```

## 🔐 Security Features

The project implements several security measures:

- Ownership and access control using OpenZeppelin's Ownable
- Reentrancy protection in critical functions
- SafeERC20 operations for token transfers
- VRF-based randomness with fallback mechanisms
- Emergency withdrawal functions
- Function visibility optimization (internal functions for critical operations)
- Proper checks for msg.sender vs tx.origin
- Verification that critical functions can only be called by trusted contracts

## 🔄 Contract Interactions

### Core Flow

1. **Token Swapping**: Users swap tokens through the DragonExchangeAdapter contract
2. **Jackpot Entry**: Every buy transaction automatically enters the user into the jackpot
3. **Probability Calculation**: Win chance is calculated based on:
   - Base probability (0.04%)
   - ve69LP holdings
   - Applied promotions
   - Partner boosts from voting
4. **Winning Determination**: VRF provides randomness to determine winners
5. **Reward Distribution**: Winners receive jackpot payouts in wS tokens

### Promotional Items & Boosters

1. **GoldScratcher**: NFTs that increase jackpot percentage (up to 15% increase)
2. **Promotional Items**: Temporary boosts registered through the PromotionalItemRegistry
3. **RedEnvelope**: Community reward mechanism with additional boosts

## 📝 License

MIT

## 📚 Additional Resources

- [Website](https://reddragon.finance)
- [Telegram](https://t.me/sonicreddragon)
- [Twitter](https://x.com/sonicreddragon)
- [Documentation](docs/architecture.md) 