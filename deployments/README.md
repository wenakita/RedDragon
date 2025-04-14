# RedDragon Deployments

This directory contains deployment configurations and addresses for the RedDragon ecosystem contracts across different networks.

## Deployment Addresses

### Sonic Mainnet

| Contract | Address | Deployment Date |
|----------|---------|----------------|
| RedDragon | 0x... | TBD |
| ve8020 | 0x... | TBD |
| Ve8020FeeDistributor | 0x... | TBD |

### Testnet

| Contract | Address | Deployment Date |
|----------|---------|----------------|
| RedDragon | 0x... | TBD |
| ve8020 | 0x... | TBD |
| Ve8020FeeDistributor | 0x... | TBD |

## Deployment Process

1. Deploy the RedDragon token
2. Deploy the ve8020 token with the RedDragon token address
3. Deploy the Ve8020FeeDistributor with ve8020 and RedDragon addresses
4. Transfer ownership of contracts to the governance multisig

## Verification

After deployment, contracts should be verified on the respective block explorers:

1. Verify RedDragon token
2. Verify ve8020 token
3. Verify Ve8020FeeDistributor

## Ownership

All contracts are ultimately owned by the community governance multisig:

- Sonic Mainnet Multisig: 0x... (TBD)
- Testnet Multisig: 0x... (TBD) 