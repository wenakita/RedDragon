# VRF Deployment Guide

This document provides step-by-step instructions for deploying the VRF (Verifiable Random Function) system for the Dragon project.

## Overview

The VRF system consists of two main components:
1. **ArbitrumVRFRequester** - Deployed on Arbitrum, interfaces with Chainlink VRF
2. **SonicVRFConsumer** - Deployed on Sonic, connects to the lottery system

## Prerequisites

1. Private keys with funds on both Arbitrum and Sonic networks
2. Chainlink VRF subscription created on Arbitrum
3. LayerZero endpoints configuration
4. DragonSwapTriggerV2 contract deployed

## Deployment Scripts

This package includes several scripts to help with the VRF deployment process:

- `scripts/fix-compiler-config.js` - Updates Hardhat configuration to support Solidity 0.8.24
- `scripts/fix-vrf-errors.js` - Fixes duplicate error declarations in interface files
- `scripts/deploy-vrf-basic.js` - Main deployment script for the VRF system
- `scripts/test-vrf-deployment.js` - Tests VRF deployment on a local network
- `scripts/fund-vrf-contracts.js` - Funds the VRF contracts with native tokens for cross-chain fees

## Step-by-Step Deployment Guide

### 1. Set Up Environment

Create a `deployment.env` file based on the `deployment.env.example` template:

```bash
cp deployment.env.example deployment.env
```

Edit `deployment.env` and fill in your specific values:
- Private keys
- RPC URLs
- Contract addresses
- VRF subscription ID and key hash

### 2. Fix Environment Issues

First, run the fix-compiler-config script to update Hardhat configuration:

```bash
node scripts/fix-compiler-config.js
```

Then fix interface issues:

```bash
node scripts/fix-vrf-errors.js
```

### 3. Test on Local Network

Before deploying to testnets or mainnet, test the deployment locally:

```bash
npx hardhat run scripts/test-vrf-deployment.js --network hardhat
```

### 4. Deploy to Testnet

Deploy to Arbitrum Testnet first:

```bash
npx hardhat run scripts/deploy-vrf-basic.js --network arbitrumTestnet
```

Then deploy to Sonic Testnet:

```bash
npx hardhat run scripts/deploy-vrf-basic.js --network sonicTestnet
```

### 5. Fund VRF Contracts

Fund the Arbitrum VRF Requester with ETH:

```bash
npx hardhat run scripts/fund-vrf-contracts.js --network arbitrum
```

Fund the Sonic VRF Consumer with SONIC:

```bash
npx hardhat run scripts/fund-vrf-contracts.js --network sonic
```

### 6. Verify Contracts

Verify the contracts on their respective block explorers:

```bash
npx hardhat verify --network arbitrum $VRF_REQUESTER_ARBITRUM $VRF_COORDINATOR $LZ_ENDPOINT $SUBSCRIPTION_ID $KEY_HASH $SONIC_CHAIN_ID $SONIC_VRF_CONSUMER

npx hardhat verify --network sonic $VRF_CONSUMER_SONIC $LZ_ENDPOINT $ARBITRUM_CHAIN_ID $ARBITRUM_VRF_REQUESTER $LOTTERY_CONTRACT
```

Replace the placeholders with your actual deployed addresses.

### 7. Deploy to Mainnet

Once everything is working on testnets, follow the same steps to deploy to mainnet.

## Post-Deployment Steps

1. **Fund Chainlink VRF Subscription**: Ensure your Chainlink VRF subscription on Arbitrum has sufficient LINK tokens.

2. **Update Lottery Contract**: Configure the DragonSwapTriggerV2 contract to use the SonicVRFConsumer.

3. **Monitor**: Monitor the first few requests to ensure everything is working correctly.

## Troubleshooting

### Failed Cross-Chain Messages

If cross-chain messages fail, check:
1. Both contracts have sufficient native tokens for fees
2. LayerZero endpoints are correctly configured
3. Trusted remotes are set correctly

### VRF Requests Not Working

If VRF requests don't work, check:
1. Chainlink VRF subscription is properly funded
2. The ArbitrumVRFRequester contract is added as a consumer to the subscription
3. The correct key hash and gas limit are being used

## Additional Resources

- [VRF Implementation Rules](./vrf-rules.mdc)
- [Fixing VRF Issues Guide](./fixing-vrf-issues.md)
- [LayerZero Documentation](https://docs.layerzero.network/contracts/oapp)
- [Chainlink VRF Documentation](https://docs.chain.link/vrf/v2/introduction) 