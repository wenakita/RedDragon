# Dragon Ecosystem Documentation

## Table of Contents
1. [Overview](#overview)
2. [Project Architecture](#project-architecture)
3. [Token Ecosystem](#token-ecosystem)
4. [Lottery System](#lottery-system)
5. [Voting and Governance](#voting-and-governance)
6. [Fee Distribution](#fee-distribution)
7. [Promotional Systems](#promotional-systems)
8. [Integration with External Systems](#integration-with-external-systems)
9. [Contracts](#contracts)
10. [Deployment Guide](#deployment-guide)
11. [Key Functions and Interactions](#key-functions-and-interactions)
12. [Security Measures](#security-measures)

## Overview

The Dragon Ecosystem is a comprehensive blockchain-based platform built on the Sonic blockchain that combines several DeFi elements:

- **$DRAGON Token**: A deflationary ERC20 token with fee mechanisms
- **Lottery System**: A sophisticated lottery system powered by Chainlink VRF
- **Governance System**: Voting and staking mechanisms through ve69LP
- **Rewards**: Multiple promotional item systems including GoldScratcher and RedEnvelope
- **LP Incentives**: Liquidity provision incentives with the DragonLPBooster

This documentation provides a complete overview of how these systems interact and how to integrate with the Dragon Ecosystem.

## Project Architecture

The Dragon Ecosystem consists of multiple interconnected smart contracts that handle different aspects of the system:

```
Dragon Ecosystem
├── Core Components
│   ├── Dragon.sol (ERC20 Token)
│   ├── DragonExchangePair.sol (Trading Pair)
│   └── DragonJackpotVault.sol (Jackpot Management)
├── Lottery System
│   ├── DragonLotterySwap.sol (Main Lottery Logic)
│   ├── ConcreteDragonLotterySwap.sol (Implementation)
│   ├── GoldScratcher.sol (Bonus System)
│   └── PromotionalItemRegistry.sol (Promotional Items)
├── Governance
│   ├── ve69LP.sol (Voting Escrow)
│   └── ve69LPFeeDistributor.sol (Fee Distribution)
└── Integrations
    ├── DragonBeetsAdapter.sol (Balancer Integration)
    ├── RedEnvelope.sol (Rewards System)
    └── DragonLPBooster.sol (LP Incentives)
```

## Token Ecosystem

### $DRAGON Token

The $DRAGON token (Dragon.sol) is the core token of the ecosystem with the following key features:

- **Token Type**: ERC20 deflationary token
- **Fee Structure**:
  - 10% total fee on buys and sells
  - Buy fees: 6.9% to jackpot, 2.41% to ve69LP fee distributor, 0.69% burn
  - Sell fees: 6.9% to jackpot, 2.41% to ve69LP fee distributor, 0.69% burn

### Fee Distribution

Fees collected from token transactions are distributed through multiple channels:
- **Jackpot**: 6.9% of all fees go to the lottery jackpot
- **ve69LP**: 2.41% goes to the ve69LP fee distributor
- **Burn**: 0.69% of all tokens are burned

## Lottery System

The lottery system is one of the central components of the Dragon Ecosystem, providing users with chances to win jackpots.

### DragonLotterySwap

The main lottery contract has these key features:

- **Entry Method**: Users enter by swapping wrapped Sonic ($wS) for $DRAGON
- **Randomness**: Utilizes Chainlink VRF for verifiable random outcomes
- **Fallback Mechanism**: Has a secure fallback mechanism when VRF is unavailable
- **Win Chance**: Base win chance of 0.04% (4/10000) with boost mechanisms
- **Maximum Win Chance**: Capped at 10% (1000/10000) regardless of boosts

### Boost Mechanisms

Several methods exist to boost lottery winning chances:

1. **Voting Power**: Holding ve69LP tokens provides a non-linear boost (cube root scaling)
2. **LP Booster**: Providing liquidity increases win chances
3. **GoldScratcher**: Special NFTs that can boost jackpot amounts
4. **Promotional Items**: Various promotional items that can boost win chances or jackpot amounts

## Voting and Governance

### ve69LP (Voting Escrow)

The governance token of the ecosystem is ve69LP, a voting escrow token similar to veTokens in other DeFi protocols:

- **Locking Mechanism**: Users lock $DRAGON to receive ve69LP
- **Voting Power**: Longer locks provide more voting power
- **Boost Decay**: Voting power decreases over time as the lock period approaches its end
- **Voting Rights**: ve69LP holders can participate in governance decisions

### Fee Distribution

The ve69LPFeeDistributor contract distributes a portion of the fees to ve69LP holders:

- **Distribution Periods**: Fees are distributed in epochs
- **Claim Mechanism**: Users can claim their share of fees based on their ve69LP balance
- **Token Support**: Supports distributing multiple token types

## Promotional Systems

The Dragon Ecosystem includes multiple promotional systems to increase engagement:

### GoldScratcher

- **Function**: NFTs that provide jackpot boosts
- **Boost Amount**: Increases the percentage of jackpot a user receives
- **Usage**: One-time use during lottery entry

### RedEnvelope

- **Function**: Special rewards that can be distributed to users
- **Distribution**: Can be airdropped or earned through various activities
- **Benefits**: Contains rewards like boosted lottery entries or tokens

### PromotionalItemRegistry

- **Function**: Central registry for all promotional items
- **Integration**: Allows new promotional items to be added over time
- **Management**: Provides a unified interface for all promotional systems

## Integration with External Systems

### Beets/Balancer Integration

The Dragon Ecosystem integrates with Balancer (Beets on Sonic chain):

- **Pool Creation**: Automated creation of liquidity pools
- **Trading**: Enables swapping through Balancer pools
- **Liquidity Mining**: Support for liquidity mining rewards

### VRF (Verifiable Random Function)

The lottery system uses Chainlink VRF for randomness:

- **VRF Coordinator**: Uses 0x3ba925fdeae6b46d0bb4d424d829982cb2f7309e on Sonic chain
- **Subscription Model**: Uses the VRF subscription model for funding
- **Retry Mechanism**: Implements retries for failed VRF requests

## Contracts

### Core Contracts

| Contract | Description |
|----------|-------------|
| `Dragon.sol` | Main ERC20 token with fee distribution logic |
| `DragonExchangePair.sol` | Custom exchange pair for $DRAGON trading |
| `DragonJackpotVault.sol` | Manages the jackpot funds |
| `ve69LP.sol` | Voting escrow token for governance |
| `ve69LPFeeDistributor.sol` | Distributes fees to ve69LP holders |

### Lottery Contracts

| Contract | Description |
|----------|-------------|
| `DragonLotterySwap.sol` | Abstract contract containing lottery logic |
| `ConcreteDragonLotterySwap.sol` | Concrete implementation of the lottery |
| `GoldScratcher.sol` | NFT-based jackpot boost system |
| `PromotionalItemRegistry.sol` | Registry for promotional items |
| `RedEnvelope.sol` | Special rewards distribution system |

### Utility Contracts

| Contract | Description |
|----------|-------------|
| `DragonBeetsAdapter.sol` | Adapter for Balancer/Beets integration |
| `DragonLPBooster.sol` | Boosts rewards for liquidity providers |
| `ve69LPLotteryConnector.sol` | Connects the voting system to the lottery |

## Deployment Guide

### Prerequisites

- Node.js v14+
- Hardhat
- Access to Sonic RPC endpoint
- Private key with funds for deployment

### Configuration

1. Create a `.env` file based on `.env.example` with the following:
   - `PRIVATE_KEY`: Deployer's private key
   - `SONIC_MAINNET_RPC_URL`: Sonic RPC URL
   - `SONIC_MAINNET_CHAIN_ID`: 146 (Sonic chain ID)

### Deployment Steps

1. Install dependencies:
   ```bash
   npm install
   ```

2. Compile contracts:
   ```bash
   npm run compile
   ```

3. Run the deployment wizard:
   ```bash
   npx hardhat launch-red-dragon
   ```

4. Verify contracts:
   ```bash
   npx hardhat verify --network sonic [CONTRACT_ADDRESS]
   ```

## Key Functions and Interactions

### $DRAGON Token

1. **Buying/Selling**:
   - Trades through DEXes apply the fee structure automatically
   - 10% total fee on buys and sells

2. **Fee Distribution**:
   - Buy fees: 6.9% to jackpot, 2.41% to ve69LP, 0.69% burn
   - Sell fees: 6.9% to jackpot, 2.41% to ve69LP, 0.69% burn

### Lottery System

1. **Entering the Lottery**:
   - Swap wrapped Sonic ($wS) for $DRAGON
   - Transaction must be from an EOA (tx.origin == msg.sender)
   - Min/max swap amounts apply

2. **Boosting Win Chances**:
   - Hold ve69LP tokens for voting power boost
   - Provide liquidity to get LP boosts
   - Use promotional items for additional boosts

3. **Jackpot Claiming**:
   - Automatically processed during swap if you win
   - Boosted by GoldScratcher and promotional items

### ve69LP Staking

1. **Locking $DRAGON**:
   - Lock tokens for up to 4 years
   - Longer locks provide more voting power

2. **Claiming Rewards**:
   - Claim your share of the fee distribution
   - Rewards based on your proportional voting power

## Security Measures

The Dragon Ecosystem implements several security measures:

1. **Randomness Safety**:
   - Primary source: Chainlink VRF
   - Fallback randomness only used when VRF is unavailable
   - Strict EOA requirements for fallback (tx.origin == msg.sender)
   - No predictable randomness sources

2. **Function Visibility**:
   - Critical functions like processBuy, processSwapWithScratcher are internal
   - registerWinningScratcher only callable by goldScratcher

3. **Timelock Mechanisms**:
   - Fee changes implement time-locks
   - Governance parameter updates use time-locks

4. **Access Control**:
   - Proper use of Ownable pattern
   - Function-specific access controls

5. **Reentrancy Protection**:
   - ReentrancyGuard used where necessary
   - Proper state management to prevent reentrancy attacks

## Conclusion

The Dragon Ecosystem provides a comprehensive DeFi experience combining tokenomics, lottery, governance, and rewards systems. This documentation provides an overview of the key components and interactions, but developers are encouraged to review the smart contract code for a deeper understanding of the implementation details.

For further information or support, please reach out to the Dragon team. 