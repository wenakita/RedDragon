# Deprecated Emergency Withdrawal Interfaces

This document explains the emergency withdrawal interfaces that have been deprecated as part of the codebase refactoring.

## Removed Interfaces

1. **IEmergencyWithdrawable.sol**
   - Generic interface for emergency withdrawals
   - Replaced with direct implementation in each contract

2. **ITokenEmergencyWithdrawable.sol**
   - Token-specific emergency withdrawal interface
   - Used by RedDragonJackpotVault.sol
   - Replaced with direct implementation

3. **ISingleTokenEmergencyWithdrawable.sol**
   - Single token emergency withdrawal interface
   - Used by RedDragonBalancerIntegration.sol
   - Replaced with direct implementation

## Reason for Deprecation

These interfaces were removed to:
1. **Simplify the codebase**: Reduce unnecessary abstraction layers
2. **Improve gas efficiency**: Direct implementation reduces contract size and deployment costs
3. **Enhance maintainability**: Fewer dependencies make contracts easier to understand and modify

## Migration

Contracts that previously implemented these interfaces now have emergency withdrawal functionality directly implemented:

- **Ve8020FeeDistributor**: Implements emergency withdrawal directly
- **RedDragonJackpotVault**: Implements emergency withdrawal directly
- **RedDragonBalancerIntegration**: Implements emergency withdrawal directly
- **MockRedDragonBalancerIntegration**: Implements emergency withdrawal directly

The functionality is identical, but without the overhead of interface inheritance. 