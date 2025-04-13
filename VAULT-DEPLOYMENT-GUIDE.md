# RedDragon Vault System Deployment Guide

This guide provides step-by-step instructions for deploying the RedDragon token with a secure vault system. The vault system consists of dedicated vaults for jackpot, liquidity, and development fees, providing transparency and security.

## Prerequisites

1. NodeJS 14+ and npm/yarn installed
2. Hardhat development environment set up
3. Account with sufficient funds for deployment (approx 5-10 wS)
4. Environment variables configured in `.env` file

## Environment Setup

1. Clone the repository and install dependencies:
```bash
git clone https://github.com/your-repo/sonicreddragon.git
cd sonicreddragon
npm install
```

2. Copy the example environment file and edit it:
```bash
cp .env.example .env
```

3. Edit `.env` with your specific configuration:
   - `PRIVATE_KEY`: Your private key for deployment
   - `SONICSCAN_API_KEY`: API key for verifying contracts
   - `MULTISIG_OWNER_1`, `MULTISIG_OWNER_2`, `MULTISIG_OWNER_3`: Addresses for multisig owners
   - Other parameters as needed

## Deployment Steps

### 1. Deploy the Vault System

The vault system deployment includes the following components:
- MultiSig wallet for secure contract ownership
- JackpotVault for transparent jackpot fee collection
- LiquidityVault for automated liquidity additions
- DevelopmentVault for transparent budget management
- RedDragon token with proper vault addresses
- PaintSwap Verifier for random number generation
- PaintSwap Lottery for jackpot distribution

Deploy all these components with a single command:

```bash
npx hardhat run scripts/deployment/deploy-with-vaults.js --network sonic
```

This script will:
1. Deploy all components in the correct order
2. Configure each component properly
3. Transfer ownership to the MultiSig wallet
4. Save all addresses to `deployment-addresses-sonic-new.json`

### 2. Set Up Exchange Pair

After deploying the vault system, you need to set up the exchange pair:

```bash
npx hardhat run scripts/deployment/setup-exchange-pair.js --network sonic
```

This script will:
1. Create the exchange pair if it doesn't exist
2. Set the exchange pair in the token contract
3. Add initial liquidity to the DEX
4. Enable trading on the token

### 3. Verify All Contracts

Verify all contracts on the block explorer for transparency:

```bash
npx hardhat run scripts/deployment/verify-vault-system.js --network sonic
```

### 4. Check System Configuration

Ensure all components are properly configured:

```bash
npx hardhat run scripts/deployment/check-vault-system.js --network sonic
```

## Vault System Architecture

The vault system consists of the following components:

### MultiSig Wallet
- Secure ownership of all contracts
- Requires multiple signatures for critical operations
- Prevents single point of failure

### JackpotVault
- Collects jackpot fees from token transactions
- Automatically forwards fees to the lottery contract
- Transparent fee collection with statistics

### LiquidityVault
- Collects liquidity fees from token transactions
- Automatically adds liquidity at configured intervals
- Sends LP tokens to multisig for governance

### DevelopmentVault
- Collects development fees from token transactions
- Manages budgets with transparent spending
- Provides accountability for development funds

### RedDragon Token
- ERC20 token with fee distribution
- Sends fees to dedicated vaults
- Secure and transparent operations

### PaintSwap Lottery
- Distributes jackpot to winners
- Uses VRF for provably fair random numbers
- Configurable win chances based on amount

## MultiSig Operations

After deployment, all critical operations need to be performed through the MultiSig wallet:

1. Enable trading (if not done during setup)
2. Configure fee parameters
3. Update contract configurations
4. Emergency operations

## Maintenance

Regular maintenance tasks:

1. Monitor vault balances and operations
2. Adjust fee parameters as needed (through MultiSig)
3. Create and manage development budgets
4. Review jackpot distributions

## Troubleshooting

### Common Issues:

1. **Transaction Underpriced**: Increase the gas price in hardhat.config.js
2. **Insufficient Balance**: Ensure deployer has sufficient funds
3. **Operation Failed**: If using MultiSig, check that required confirmations are met

### Support

If you encounter issues:
- Check logs for specific error messages
- Review the contract configurations
- Contact the development team through Telegram or Twitter

## Security Considerations

1. Always use the MultiSig for critical operations
2. Regularly audit vault balances and transactions
3. Monitor for unusual activity in the vaults
4. Verify all contracts on the block explorer for transparency

By following this guide, you'll deploy a secure and transparent RedDragon token system with dedicated vaults for fee management. 