# RedDragon System Redeployment Guide

This document outlines the complete process for redeploying the RedDragon ecosystem from scratch.

## Overview

We're performing a fresh redeployment of the entire system to ensure all components work together seamlessly, with proper integration of the LP Booster functionality.

## Components to be Deployed

1. **RedDragonPaintSwapVerifier** - Provides Verifiable Random Function (VRF) for the lottery
2. **RedDragonSwapLottery** - Core lottery system that handles jackpot distribution
3. **RedDragon Token** - Main ERC-20 token with fee redistribution
4. **RedDragonLPBooster** - Provides probability boosts based on LP token holdings
5. **ve8020** - Vote-escrowed token system for long-term liquidity providers
6. **ve8020LotteryIntegrator** - Connects ve8020 with lottery for voting power boosts
7. **Ve8020FeeDistributor** - Distributes fees to ve8020 token holders
8. **RedDragonFeeManager** - Manages fee distribution from the RedDragon token

## Prerequisites

1. Set up environment variables in `.env`:
   - `JACKPOT_VAULT_ADDRESS` - Address that receives jackpot fees
   - `LIQUIDITY_VAULT_ADDRESS` - Address that receives liquidity fees
   - `DEVELOPMENT_VAULT_ADDRESS` - Address that receives development fees
   - `BURN_ADDRESS` - Address for burned tokens (default: 0x000000000000000000000000000000000000dEaD)
   - `WRAPPED_SONIC_ADDRESS` - Address of the wrapped Sonic token on the chain
   - `LP_TOKEN_ADDRESS` - (Optional) Existing LP token address if already created

2. Install dependencies:
   ```
   npm install
   ```

## Deployment Process

### 1. Run the Complete Redeployment Script

The complete redeployment can be done with a single script:

```bash
npx hardhat run scripts/deployment/complete-reddragon-redeployment.js --network sonic
```

This script will:
- Deploy all contracts in the correct order
- Configure contract connections and parameters
- Set up boosting mechanisms (LP Booster and ve8020)
- Configure fee distributions
- Enable trading on the token

### 2. Post-Deployment Steps

After deployment, you'll need to:

1. **Create LP Token Pair** (if not already provided)
   - Create the RedDragon/WETH pair on the DEX
   - Update the system with the LP token address
   ```bash
   # Run this after creating the LP token pair
   npx hardhat run scripts/deployment/update-lp-token.js --network sonic
   ```

2. **Transfer Ownership**
   - For security, transfer ownership of contracts to a multisig wallet
   ```bash
   npx hardhat run scripts/deployment/manage-ownership.js --network sonic
   ```

3. **Verify Contracts on Block Explorer**
   - Verify all contracts for transparency
   ```bash
   npx hardhat run scripts/deployment/verify-contracts.js --network sonic
   ```

## Configuration Options

### LP Booster Tiers

By default, the LP Booster is configured with the following tiers:
- Tier 1: 0.1 LP tokens, 0.69% boost
- Tier 2: 1 LP token, 1.5% boost
- Tier 3: 10 LP tokens, 3% boost
- Tier 4: 100 LP tokens, 5% boost
- Tier 5: 1000 LP tokens, 10% boost

You can adjust these tiers after deployment using the LP Booster's management functions.

### Fee Structure

The token is configured to redirect liquidity and development fees to the ve8020 distribution system, which rewards LP stakers, while maintaining the jackpot and burn fees.

## Troubleshooting

If you encounter errors during deployment:

1. **Check Gas** - Ensure the deployer has sufficient gas
2. **Check Permissions** - Verify that the deployer has the necessary permissions
3. **Failed Transactions** - If a transaction fails, you may need to redeploy from that point

## Contract Addresses

After deployment, all contract addresses will be saved to `deployment-addresses-sonic.json` in the project root.

## Support

If you need assistance with the deployment, contact the development team. 