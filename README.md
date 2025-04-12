# RedDragon Ecosystem

A comprehensive DeFi ecosystem on the Sonic network featuring the RedDragon token with fee distribution, lottery system, ve(80/20) liquidity incentives, and secure randomness through VRF integration.

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Contract Addresses](#contract-addresses)
5. [Security Features](#security-features)
6. [ve(80/20) System](#ve8020-system)
7. [Lottery System](#lottery-system)
8. [Deployment Scripts](#deployment-scripts)
9. [Development Guide](#development-guide)
10. [Support](#support)

## System Overview

The RedDragon token system is a comprehensive DeFi ecosystem on the Sonic blockchain that implements a ve(80/20) tokenomics model with an integrated lottery system, fair distribution of transaction fees, and strong security measures. The system utilizes Verified Random Function (VRF) to ensure fair lottery results and implements a circuit breaker and timelock mechanism for critical functions.

## Architecture

The RedDragon token system consists of the following components:

```
RedDragon Token ──► Fee Manager ──┬─► ve8020 System ──► Fee Distributor
                                  │
                                  └─► Lottery ◄─┐
                                              │
                     PaintSwap Verifier ◄──── RedDragon Verifier
                            │
                     VRF Coordinator
```

### Core Components
- **RedDragon Token**: ERC20 token with transaction fees and built-in lottery entry
- **RedDragonFeeManager**: Distributes fees to various destinations
- **RedDragonSwapLottery**: Probability-based lottery system with VRF randomness
- **ve8020**: Vote-escrowed system for locking LP tokens
- **Ve8020FeeDistributor**: Distributes fees to ve8020 holders
- **RedDragonVerifier**: Integrates with PaintSwap verifier for secure randomness
- **RedDragonPaintSwapVerifier**: Connects to VRF Coordinator for verified randomness

## Features

- **Transparent Fee Structure**: 10% total fee on buys and sells:
  - 6.9% jackpot
  - 2.41% to ve(80/20) holders
  - 0.69% burned
- **Lottery System**: Dynamic odds based on transaction size and ve8020 boost
- **ve(80/20) Tokenomics**: Lock LP tokens to earn:
  - Voting power
  - Transaction fee share
  - Boosted lottery odds
- **Secure Randomness**: VRF integration with circuit breaker and timelock
- **Transaction Limits**:
  - First 69 transactions: 1% max tx, 2% max wallet
  - After 69 transactions: 5% max tx, 10% max wallet

## Contract Addresses

### Mainnet (Sonic Network)
- **RedDragon Token**: `0x45237fD4F00FB2160005dB659D4dD5B36b77c265`
- **RedDragonFeeManager**: `0xB59529C7ff72dEb7E7007a443492be052bC3Fdb5`
- **RedDragonSwapLottery**: `0x55eF655ff73E1F8FD0fA07b95634fD28A7C0A8fa`
- **RedDragonVerifier**: `0x05B0CE5E85f5ef1945886b85b8e5FBF9246Ac05F` (Secure Verifier)
- **RedDragonPaintSwapVerifier**: `0x30cCC29B339FCB698E502aD179C2aA78c13B88d0` (Secure Verifier)
- **ve8020**: `0x6f542540D8CDd89b7A60208Dddd3BcBd2133fc5d`
- **ve8020FeeDistributor**: `0x735AC559fFb23836Be856578DBCE928E4c9f6375`
- **Wrapped Sonic**: `0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38`

## Security Features

### 1. Circuit Breaker (Pause Mechanism)
- Implemented in RedDragonVerifier and RedDragonPaintSwapVerifier
- Allows emergency halt of operations if necessary
- Only accessible by the contract owner
- Prevents exploits during critical situations

### 2. Timelock for Critical Operations
- 2-day timelock period for critical address updates
- Two-step process: propose changes, then execute after timelock expires
- Prevents instant malicious changes
- Events emitted for all operations

### 3. Secure Randomness
- Uses VRF for verifiable randomness
- EOA security checks to prevent contract-based attacks
- Fallback mechanisms removed to prevent exploits
- Circuit breaker for emergency situations

### 4. Try/Catch Protection
- External calls to tokens and contracts protected with try/catch blocks
- Prevents failures when interacting with malicious tokens
- Graceful handling of external call failures

### 5. Reentrancy Protection
- ReentrancyGuard implementation for critical functions
- Check-effects-interactions pattern throughout
- Safe token transfers using OpenZeppelin's SafeERC20

## ve8020 System

### Overview

The ve(80/20) system incentivizes long-term liquidity provision by allowing users to lock their 80/20 LP tokens (80% DRAGON, 20% wS) for periods between 1 week and 4 years.

### Key Benefits

1. **Fee Sharing**: 2.41% of all transaction fees are distributed to ve(80/20) holders
2. **Voting Power**: Proportional to both amount locked and lock duration
3. **Lottery Boost**: Up to 2.5x boost on lottery odds based on voting power
4. **Triple Income Stream**:
   - LP fees from providing liquidity
   - Transaction fee sharing through Ve8020FeeDistributor
   - Boosted chances to win lottery jackpots

## Lottery System

### Overview

The RedDragon lottery system implements a probability-based lottery with dynamic odds determined by transaction size, ve8020 boost, and global pity timer.

### Key Features

1. **Dynamic Probability**:
   - Base probability: 0.1% per 100 wS
   - Maximum probability: 10% for 10,000+ wS
   - ve8020 boost: Up to 2.5x based on voting power
   - Global pity boost: Increases with consecutive losses

2. **Global Pity Timer**:
   - Accumulates 0.1% of each swap amount when no wins occur
   - Resets after each win
   - Creates increasing odds over time to ensure eventual wins

3. **Security Features**:
   - VRF integration for verifiable randomness
   - EOA security checks to prevent contract-based attacks
   - Circuit breaker and timelock for emergency situations
   - Safe token transfers for jackpot distributions

## Deployment Scripts

This repository contains scripts for deploying and managing the RedDragon ecosystem:

### Main Deployment Scripts
- `deploy-reddragon-sonic.js`: Deploys the RedDragon token, PaintSwap Verifier, and PaintSwap Lottery
- `deploy-verifier.js`: Deploys the RedDragon verifier for secure randomness
- `deploy-security-contracts.js`: Deploys additional security-related contracts
- `deploy-ve8020.js`: Deploys the ve8020 token and related components

### Verification Scripts
- `verify-all-contracts.js`: Verifies all contracts on the block explorer
- `verify-token-setup.js`: Verifies the RedDragon token setup
- `verify-lottery.js`: Verifies the lottery setup
- `verify-verifier.js`: Verifies the verifier setup

### Configuration Scripts
- `update-fee-manager.js`: Updates fee manager configuration
- `update-lottery.js`: Updates lottery settings
- `update-verifiers.js`: Updates verifier settings

### Recovery Scripts
- `reddragon-deployment-recovery.js`: Handles recovery of deployed contracts in case of issues
- `transfer-ownership.js`: Transfers ownership of contracts to a new address

## Development Guide

### Prerequisites
- Node.js v14+
- Hardhat
- A private key for deployment

### Installation
1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   PRIVATE_KEY=your_private_key
   ETHERSCAN_API_KEY=your_etherscan_api_key
   JACKPOT_VAULT_ADDRESS=your_jackpot_address
   LIQUIDITY_ADDRESS=your_liquidity_address
   DEVELOPMENT_ADDRESS=your_development_address
   BURN_ADDRESS=0x000000000000000000000000000000000000dEaD
   WRAPPED_SONIC_ADDRESS=0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38
   PAINT_SWAP_REQUEST_CONFIRMATIONS=3
   ```

### Deployment
1. Deploy the RedDragon token and lottery:
   ```
   npx hardhat run scripts/deployment/deploy-reddragon-sonic.js --network sonic
   ```
2. Verify the contracts:
   ```
   npx hardhat run scripts/deployment/verify-all-contracts.js --network sonic
   ```

### Testing
Run the comprehensive test suite:
```
npx hardhat test
```

## Support

For assistance with deployment or contract inquiries, please reach out via:
- GitHub Issues
- Twitter: [@sonicreddragon](https://x.com/sonicreddragon)
- Telegram: [sonicreddragon](https://t.me/sonicreddragon) 