# Deprecated Contracts

This directory contains contracts that are redundant, duplicated, or not needed anymore. Before deleting them completely, they are moved here for reference.

## Redundancy Analysis

### Thank You Token Contracts
- `RedDragonThankYouToken.sol`: This is superseded by `RedDragonThankYouTokenMulti.sol` which has all the same functionality plus support for multiple recipients. The single recipient version should be deprecated.

### Vault Redundancy
- `RedDragonLiquidityVault.sol` and `RedDragonDevelopmentVault.sol`: These are superseded by `RedDragonLiquiDevVault.sol` which combines both functionalities in a more efficient way. The individual vaults should be deprecated.

### Code Duplication
- The `emergencyWithdraw` function is duplicated across multiple vault contracts
- The `Budget` struct is duplicated in multiple contracts
- Interface for `IPaintSwapVRF` is defined multiple times in different contracts instead of being centralized in the interfaces directory

## Next Steps

1. Move deprecated contracts to this directory
2. Create proper interfaces for shared structures and functions
3. Update imports in active contracts to reference the new interfaces 