# RedDragon Token Deployment

This repository contains deployment scripts and configurations for the RedDragon token ecosystem on the Sonic network.

## Deployed Contracts

The RedDragon ecosystem consists of the following components:

| Contract | Address | Description |
|----------|---------|-------------|
| RedDragon Token | `0x350BD3f347337B15dDd9E9dC91442b16198270e8` | Core ERC20 token |
| RedDragonSwapLottery | `0xe10A5A8bA7021AD61d9b9172981278eE68B01424` | Lottery system |
| RedDragonLPBooster | `0x2A60ffcBf83877f18Bc7fEF9790e2598918AfCA4` | LP staking rewards |
| ve8020 | `0x2ca4fBAC6326C23F7D2d48f465221EA316773b1a` | Vote-escrow mechanism |
| Ve8020FeeDistributor | `0xb9200A42789B2bae732F8654d125418b0A52639C` | Fee distribution |
| RedDragonFeeManager | `0x9420C03f473a3E4fD335A31f6bB39fDE18E42A8E` | Fee management |
| RedDragonMultiSig | `0x03bF2b1eC635783c88aD880D85F0c8c689EE962C` | Secure ownership |
| LP Token | `0xc59944C9AFe9eA9c87b21dBb3D753c5D1ccCF978` | Liquidity pool token |

## Security Features

RedDragon implements several security features:

- **Multisig Ownership**: All contracts are owned by a 2-of-3 multisig wallet
- **No Mint Function**: Fixed token supply, no ability to mint new tokens
- **No Blacklist Function**: No censorship capability
- **Timelock Protection**: Admin functions use timelock for transparency
- **Transparent Fee Structure**: Fixed 10% total fee with clear distribution

## Deployment Scripts

The repository includes scripts for:

1. **Contract Deployment**:
   - `complete-reddragon-redeployment.js`: Full ecosystem deployment
   - `deploy-fee-components.js`: Fee-related contracts deployment
   - `deploy-lottery-integrator.js`: Lottery integration deployment

2. **Ownership Management**:
   - `redeploy-multisig.js`: Deploy multisig wallet
   - `transfer-ownership.js`: Transfer contract ownership to multisig

3. **Contract Verification**:
   - `verify-all-contracts.js`: Verify contracts on block explorer

## Usage

To use these scripts:

```bash
# Install dependencies
npm install

# Deploy the complete ecosystem
npx hardhat run scripts/deployment/complete-reddragon-redeployment.js --network sonic

# Deploy multisig wallet
npx hardhat run scripts/deployment/redeploy-multisig.js --network sonic

# Deploy remaining components
npx hardhat run scripts/deployment/deploy-remaining-components.js --network sonic

# Transfer ownership to multisig
npx hardhat run scripts/deployment/transfer-ownership.js --network sonic

# Verify contracts
npx hardhat run scripts/deployment/verify-all-contracts.js --network sonic
```

## Dependencies

- Hardhat
- Ethers.js
- dotenv

## DEX Listing

For DEX listing, highlight these key features:

- Ownership transferred to multisig
- No mint function
- No blacklist function
- Timelock protection
- Transparent fee structure 