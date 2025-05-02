# Dragon Ecosystem TypeScript Deployment Guide

This guide explains how to deploy the Dragon ecosystem contracts using TypeScript and Hardhat.

## Prerequisites

- Node.js v16 or later
- npm or yarn
- Git

## Setup

1. Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd dragon-ecosystem
npm install --legacy-peer-deps
```

2. Configure your environment variables in `deployment.env`:

```
# Network Configuration
NETWORK="sonic"
MAINNET_RPC_URL=https://rpc.soniclabs.com
MAINNET_CHAIN_ID=146

# Deployment Keys
PRIVATE_KEY=your_private_key_here

# Token Addresses
WRAPPED_SONIC_ADDRESS=0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38
```

## TypeScript Deployment Process

The project uses TypeScript for all deployment scripts, providing better type safety and development experience.

### 1. Compile the contracts

```bash
npx hardhat compile
```

### 2. Deploy Contracts

To deploy the core Dragon ecosystem:

```bash
npx hardhat run scripts/deploy-dragon-main.ts --network sonic
```

This script will:
- Deploy the DragonJackpotVault
- Deploy the ve69LPFeeDistributor
- Deploy the Dragon token
- Configure initial connections between contracts

The contract addresses will be saved in `deployments/contract-addresses.json`.

### 3. Post-Deployment Setup

After deployment, run the post-deployment setup:

```bash
npx hardhat run scripts/post-deploy-setup.ts --network sonic
```

This will:
- Set the fee structure for buys, sells and BeetsLP pools
- Verify all settings are correctly applied

### 4. Testing Deployment

For testing purposes, you can deploy a simplified Dragon Test token:

```bash
npx hardhat run scripts/deploy-dragon-test.ts --network hardhat
```

## Contract Architecture

```
                                 ┌─────────────────┐
                                 │                 │
                                 │  Dragon Token   │
                                 │                 │
                                 └───────┬─────────┘
                                         │
                                         │ Fees
                                         │
                 ┌─────────────────────┬─┴──────────────────────┐
                 │                     │                        │
                 │                     │                        │
        ┌────────▼────────┐   ┌────────▼────────┐       ┌───────▼───────┐
        │                 │   │                 │       │               │
        │  JackpotVault   │   │ve69LPDistributor│       │     Burn      │
        │                 │   │                 │       │               │
        └─────────────────┘   └─────────────────┘       └───────────────┘
```

## Contracts Overview

### Dragon Token
Main token with fee mechanics:
- 10% fee on buys (6.9% to jackpot, 2.41% to ve69LP, 0.69% burn)
- 10% fee on sells (6.9% to jackpot, 2.41% to ve69LP, 0.69% burn)
- BeetsLP/Partner pairing on Shadow's Uniswap V3 fork: 6.9% fee (69% to jackpot, 31% to ve69LP)

### DragonJackpotVault
Manages the jackpot funds from transaction fees.

### ve69LPFeeDistributor
Distributes fees to ve69LP token holders.

## Troubleshooting

If you encounter errors during deployment:

1. **Contract Compilation Errors**: Ensure all dependencies are installed and compatible
2. **Gas Errors**: Try increasing the gas limit in the deployment script
3. **Network Issues**: Verify the RPC URL and network configuration

## License

This project is licensed under the MIT License. 