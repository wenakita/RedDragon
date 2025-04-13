# RedDragon Deployment Guide

This guide outlines the complete process for deploying the RedDragon system with automatic jackpot distribution on the Sonic network.

## Overview

The RedDragon system consists of several interrelated contracts:

1. **RedDragonSwapLottery** - The core lottery contract with automatic jackpot distribution
2. **RedDragonPaintSwapVerifier** - Verifies lottery results using an external randomness source
3. **RedDragon** - The main token that interacts with the lottery
4. **RedDragonLPBooster** - Enhances lottery odds for LP providers
5. **ve8020** - Voting escrow token for governance and boosting
6. **RedDragonFeeManager** - Manages fee distribution
7. **RedDragonMultiSig** - Secure multisignature wallet for managing the protocol

## Prerequisites

Before beginning deployment, ensure you have:

1. **Development Environment**:
   - Node.js (v14+)
   - npm or yarn
   - Git

2. **Network Access**:
   - Access to Sonic network
   - Sufficient wSonic for gas fees and initial liquidity
   - Balancer/Beethoven X pool factory and vault addresses

3. **Configuration**:
   - Create a `.env` file based on `.env.example`
   - Set your private key in the `.env` file
   - Configure other environment variables as needed

## Deployment Process

### 1. Prepare Environment

Clone the repository and install dependencies:

```bash
git clone https://github.com/yourusername/reddragon.git
cd reddragon
npm install
```

Create an `.env` file with the required parameters:

```
# Network Configuration
SONIC_RPC_URL="https://rpc.sonic.fantom.network/"
PRIVATE_KEY="your_private_key"

# Contract Addresses
WRAPPED_SONIC_ADDRESS="0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38"
BURN_ADDRESS="0x000000000000000000000000000000000000dEaD"

# Balancer Configuration
BALANCER_VAULT_ADDRESS="0xf1f5de69c9c8d961be627630f07e88fca5bdfc5e"
BALANCER_FACTORY_ADDRESS="0x7d4351f68c0d1e0c0ab097be324f1767324dc918"

# Initial Liquidity
INITIAL_REDDRAGON_LIQUIDITY="1000000" # 1M RedDragon
INITIAL_WSONIC_LIQUIDITY="50000"     # 50K wSonic

# MultSig Configuration
MULTISIG_OWNER_1="0x..."
MULTISIG_OWNER_2="0x..."
MULTISIG_OWNER_3="0x..."  # Optional
MULTISIG_REQUIRED_CONFIRMATIONS=2
```

### 2. Deploy Core Contracts

Run the full system deployment script:

```bash
npx hardhat run scripts/deployment/deploy-full-system.js --network sonic
```

This script will:
- Deploy PaintSwap VRF Verifier
- Deploy RedDragonSwapLottery with automatic jackpot distribution
- Deploy RedDragon token
- Configure the lottery with the token contract
- Deploy LP Booster
- Deploy ve8020 token (if needed)
- Deploy Fee Manager
- Deploy MultiSig (if needed)
- Save all addresses to `deployment-addresses-sonic.json`

### 3. Create Balancer Weighted Pool (80/20)

Create the Balancer weighted pool for RedDragon/wSonic with an 80/20 ratio:

```bash
npx hardhat run scripts/deployment/create-balancer-pool.js --network sonic
```

### 4. Add Initial Liquidity

Add initial liquidity to the Balancer pool:

```bash
npx hardhat run scripts/deployment/add-balancer-liquidity.js --network sonic
```

### 5. Configure Liquidity and Exchange Pair

Set up the LP token and exchange pair in the lottery contract:

```bash
npx hardhat run scripts/deployment/setup-liquidity.js --network sonic
```

### 6. Transfer Ownership to MultiSig

Transfer ownership of all contracts to the multisig for security:

```bash
npx hardhat run scripts/deployment/transfer-ownership.js --network sonic
```

### 7. Verify Contracts on Sonic Explorer

Verify all contracts on the Sonic blockchain explorer:

```bash
npx hardhat run scripts/deployment/verify-contracts.js --network sonic
```

## Post-Deployment Tasks

After deploying the system, perform these additional steps:

1. **Test the System**:
   - Test lottery entry via swap
   - Verify lottery rewards are automatically distributed
   - Test governance functions via multisig

2. **Configure Frontend**:
   - Update frontend applications with new contract addresses
   - Test all frontend interactions with the deployed contracts

3. **Monitor Performance**:
   - Set up monitoring for contract interactions
   - Track jackpot distribution events
   - Monitor LP and token metrics

## Security Considerations

- **Multisig Wallet**: All admin operations should be performed through the multisig wallet
- **Initial Testing**: Start with smaller jackpot amounts initially to validate automatic distribution
- **Upgrade Path**: Prepare an upgrade strategy for future improvements
- **Security Audits**: Arrange for security audits of the deployed contracts

## Troubleshooting

If you encounter issues during deployment:

1. Check that all prerequisites are correctly set up
2. Verify that the `.env` file contains all required variables
3. Ensure sufficient wSonic balance for gas and operations
4. Check Sonic network status and RPC endpoint functionality

## Support

If you need assistance with deployment, contact the development team through:
- GitHub Issues
- Discord Community Channel
- Developer Email 