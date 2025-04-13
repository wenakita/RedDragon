# Automatic Jackpot Distribution Deployment Guide

This guide outlines the steps to deploy the updated RedDragonSwapLottery contract with automatic jackpot distribution functionality.

## Overview

The new version of the RedDragonSwapLottery contract improves user experience by automatically distributing jackpot winnings to winners without requiring them to manually claim their prizes. This removes friction from the user experience and ensures winners receive their rewards instantly.

## Prerequisites

1. Access to the deployment wallet with sufficient privileges to:
   - Deploy new contracts
   - Update configuration on existing contracts
   - Transfer ownership of contracts

2. Sufficient wS tokens for gas fees

3. Environment setup:
   - Create a `.env` file based on `.env.example`
   - Set your private key in the `.env` file
   - Configure other environment variables as needed

## Deployment Steps

### 1. Prepare Environment

Make sure you have the latest code and dependencies:

```bash
git pull
npm install
```

### 2. Deploy the New Lottery Contract

Run the deployment script:

```bash
npx hardhat run scripts/deployment/deploy-auto-jackpot.js --network sonic
```

This script will:
- Deploy the new RedDragonSwapLottery contract with automatic jackpot distribution
- Configure the lottery with the same settings as the previous version
- Update the deployment addresses file to store both the new and old lottery addresses
- Update the token contract to reference the new lottery (if deployer has permission)

### 3. Migrate the Jackpot

Transfer the jackpot from the old lottery to the new one:

```bash
npx hardhat run scripts/deployment/migrate-jackpot.js --network sonic
```

This script will:
- Transfer the jackpot from the old lottery to the deployer
- Transfer the jackpot from the deployer to the new lottery
- Verify the jackpot was successfully migrated

### 4. Verify the Contract on Sonic Scan

Verify the contract on the blockchain explorer:

```bash
npx hardhat verify --network sonic <NEW_LOTTERY_ADDRESS> <WRAPPED_SONIC_ADDRESS> <PAINTSWAP_VERIFIER_ADDRESS>
```

Replace the placeholder values with the actual addresses.

### 5. Update Frontend References

Update any frontend code to reference the new lottery contract address.

### 6. Final Checks

1. Verify the jackpot amount in the new lottery matches the previous one
2. Test a small swap to ensure the lottery entry is processed correctly
3. Test a winning scenario (via testnet or manual triggering) to confirm automatic distribution works

## Rollback Plan

If issues occur with the new deployment:

1. Keep the old lottery contract active
2. Transfer the jackpot back to the old lottery using a similar migration script
3. Update token contract references back to the original lottery

## Security Considerations

- The deployment and migration scripts implement checks to ensure proper transfers
- The contract includes proper security checks to prevent unauthorized distribution of jackpot
- Winners must still be valid EOA addresses (not contracts) to receive distributions

## Support

If you encounter any issues during deployment, please contact the development team for assistance. 