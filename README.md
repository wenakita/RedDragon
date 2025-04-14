# RedDragon Token Ecosystem

This is the official repository for the RedDragon token ecosystem, featuring the ve8020 voting escrow system for rewarding holders, optimized fee distribution, and an innovative jackpot lottery mechanism that rewards active traders.

## Table of Contents
- [Overview](#overview)
- [Core Contracts](#core-contracts)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Fee Structure](#fee-structure)
- [Recent Updates](#recent-updates)
- [Technical Details](#technical-details)
- [Development](#development)
- [Deployment](#deployment)
- [Security](#security)
- [License](#license)

## Overview

The RedDragon token ecosystem creates a comprehensive DeFi platform with governance, rewards, and liquidity incentives. The system is built around the ve8020 (vote-escrowed) model, where users can lock their RedDragon tokens to gain voting power and earn fee rewards.

## Core Contracts

The ecosystem consists of these main components:

### Token Contracts
- **RedDragon.sol**: The main ERC20 token with fee-on-transfer functionality
- **ve8020.sol**: The voting escrow token for governance and rewards (lock RedDragon to receive)
- **RedDragonThankYouTokenMulti.sol**: Multi-version thank you token for ecosystem participants

### Fee Distribution & Rewards
- **Ve8020FeeDistributor.sol**: Distributes rewards to ve8020 holders based on voting power
- **RedDragonFeeManager.sol**: Manages fee collection and distribution across the ecosystem
- **RedDragonJackpotVault.sol**: Holds and distributes jackpot rewards

### DEX Integration
- **RedDragonBalancerIntegration.sol**: Integrates with Balancer/Beethoven X for liquidity
- **RedDragonLPBooster.sol**: Provides boosted rewards for liquidity providers
- **RedDragonVerifier.sol**: Verifies transactions and manages integrations

### Governance
- **RedDragonMultiSig.sol**: Multi-signature wallet for secure governance
- **RedDragonTimelock.sol**: Timelock contract for governance actions

### Oracle & Lottery
- **PriceOracle.sol**: Price feed oracle for token valuation
- **RedDragonSwapLottery.sol**: Lottery system using VRF for randomness
- **ve8020LotteryIntegrator.sol**: Connects ve8020 system with the lottery

## Key Features

- **ve8020 Token System**: Lock RedDragon tokens to gain voting power and earn rewards
- **Weekly Epoch Rewards**: Automatic distribution of rewards on a weekly basis
- **Jackpot Lottery System**: Regular drawings with prize tiers that reward active traders
- **Optimized for Gas**: Streamlined contracts with minimal overhead
- **Governance Ready**: Voting power proportional to lock duration and amount
- **VRF Integration**: Secure randomness for lottery and other features
- **Balancer Integration**: Efficient liquidity management
- **Batch Processing**: Efficient handling of large holder counts
- **Storage Optimization**: Cleanup mechanisms for gas efficiency

## Architecture

The system follows a modular architecture:

```
RedDragon Token (ERC20)
    |
    ├── ve8020 (Voting Escrow)
    |     |
    |     └── Ve8020FeeDistributor (Weekly Rewards)
    |
    ├── RedDragonFeeManager
    |     |
    |     ├── Jackpot System (6.9%)
    |     ├── ve8020 Rewards (2.41%)
    |     └── Token Burn (0.69%)
    |
    ├── Balancer Integration
    |     |
    |     └── LP Booster
    |
    └── Governance
          |
          ├── MultiSig
          └── Timelock
```

## Fee Structure

The RedDragon token implements a 10% fee on transactions, distributed as follows:

- **6.9%** - Jackpot system: Rewards distributed through the lottery system
- **2.41%** - ve8020 Fee Distributor: Rewards for token holders who lock in the governance system
- **0.69%** - Token burn: Permanently removed from circulation, increasing scarcity

This structure ensures:
- Long-term holders are rewarded through the ve8020 system
- Users are incentivized to participate in the ecosystem
- Deflationary tokenomics through regular burns

## Recent Updates

We've significantly optimized the codebase by:

1. **Removing Budget Management**: All fees now go directly to ve8020 holders (100%)
2. **Removing Unused Vaults**: Simplified architecture with no development vault
3. **Eliminating Deprecated Code**: Completely removed deprecated interfaces and contracts
4. **Streamlining Core Contracts**: Focused on essential functionality only
5. **Optimizing Gas Usage**: Improved storage and execution efficiency
6. **VRF Standardization**: Improved randomness implementation

## Technical Details

### Ve8020 System

The ve8020 system is inspired by Curve's vote-escrowed model:
- Users lock RedDragon tokens for periods up to 4 years
- Voting power is proportional to tokens locked and lock duration
- Weekly fee distributions based on voting power
- Lock extensions and early exit penalties

### Fee Distributor

The Ve8020FeeDistributor:
- Operates on weekly epochs
- Takes snapshots of voting power at epoch boundaries
- Distributes rewards proportionally to voting power
- Supports batch processing for gas efficiency
- Includes storage cleanup mechanisms

### Jackpot System

The RedDragon jackpot system is a core feature of the ecosystem:
- Receives 6.9% of all transaction fees
- Lottery draws occur at regular intervals
- Uses verifiable random functions (VRF) for transparent, tamper-proof draws
- Entry tickets are awarded based on trading activity
- Active traders receive more chances to win proportional to their individual trade sizes
- Multiple prize tiers with different reward amounts
- Prize values range from 100 wS to 10000 wS
- Ability to switch to USD-denominated prizes if $S price exceeds $1
- Auto-compounding pot that grows between draws
- Special jackpot events tied to trading volume milestones
- Emergency recovery mechanisms for technical issues

### VRF Implementation

The system uses PaintSwap's VRF service for secure randomness:
- Standardized through the `IVRFConsumer` interface
- Used for lottery draws and other random outcomes
- Includes circuit breakers and security measures

See the [VRF Implementation Guide](VRF_IMPLEMENTATION_GUIDE.md) for more details.

### Balancer Integration

The RedDragonBalancerIntegration contract:
- Creates and manages Balancer/Beethoven X pools
- Handles token swaps and liquidity provision
- Integrates with the LP Booster for enhanced rewards

## Development

### Prerequisites

- Node.js v14+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/reddragon-token.git
cd reddragon-token

# Install dependencies
npm install
```

### Testing

```bash
# Run all tests
npx hardhat test

# Run specific test
npx hardhat test test/Ve8020FeeDistributor.test.js
```

### Local Development

```bash
# Start a local Hardhat node
npx hardhat node

# Deploy to local network
npx hardhat run scripts/deploy.js --network localhost
```

## Deployment

### Mainnet Deployment

```bash
# Deploy to mainnet (requires .env configuration)
npx hardhat run scripts/deploy.js --network mainnet
```

### Contract Verification

```bash
# Verify contract on Etherscan
npx hardhat verify --network mainnet DEPLOYED_CONTRACT_ADDRESS "Constructor Arg 1" "Constructor Arg 2"
```

## Security

The contracts implement several security measures:

- **MultiSig Governance**: Critical actions require multiple signatures
- **Timelock Delays**: Important parameter changes have mandatory waiting periods
- **Emergency Withdrawals**: Escape hatches for emergency situations
- **Access Control**: Strict permission systems for sensitive functions
- **Reentrancy Guards**: Protection against reentrancy attacks

## License

MIT 