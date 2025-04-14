# RedDragon Repository Focus

This document explains the focus of the RedDragon repository and how it differs from the original dragon repository.

## Repository Focus

The **RedDragon** repository focuses specifically on the core RedDragon token ecosystem and the ve8020 voting escrow system. Our goal is to maintain a clean, optimized, and focused codebase that prioritizes:

1. **Core Token Functionality**: The RedDragon ERC20 token and its direct utilities
2. **Governance Mechanics**: The ve8020 voting escrow system for governance
3. **Reward Distribution**: The optimized fee distributor for ve8020 holders

## Core Fee Structure

The RedDragon token implements a 10% fee on transactions, distributed as follows:

- **6.9%** - Directed to the jackpot system, rewarding users through the lottery
- **2.41%** - Sent to the ve8020 Fee Distributor, rewarding governance participants
- **0.69%** - Burned, permanently reducing the token supply

This balanced fee structure supports both short-term engagement (jackpot/lottery) and long-term holders (ve8020), while maintaining deflationary tokenomics through regular burns.

## Differences from Dragon Repository

The original **dragon** repository contained:

- Multiple experimental features
- Legacy code and deprecated interfaces
- Development vaults that are no longer needed
- Budget management systems that have been deprecated
- Various testing and development artifacts

In contrast, this repository:

- Contains only essential, production-ready contracts
- Has removed all deprecated interfaces and contracts
- Is optimized for gas efficiency and simplicity
- Focuses exclusively on core token, governance, and reward functionality
- Has a streamlined testing and deployment framework

## Key Optimizations

1. **Ve8020FeeDistributor Simplification**
   - Removed all liquidity management functionality
   - Streamlined reward distribution to 100% for ve8020 holders
   - Reduced contract size by 31% (540 lines → 372 lines)
   - Estimated 20-25% gas savings for key operations

2. **Unused Vault Removal**
   - Completely removed development vault (no dev funds)
   - Removed liquidity vault (simplified allocation model)
   - Eliminated all budget management code

3. **Interface Cleanup**
   - Removed all emergency withdrawal interfaces
   - Removed budget management interfaces
   - Simplified contract imports and dependencies

## Maintainability Benefits

By focusing only on core functionality, this repository is:

- Easier to audit for security vulnerabilities
- Simpler to understand for new contributors
- More maintainable for long-term development
- Less prone to unexpected interactions between contracts
- More gas efficient for users

## Future Development

Future development will focus on enhancing the core components rather than adding peripheral features. This includes:

- Further gas optimizations
- Enhanced governance capabilities
- Improved reward distribution mechanisms
- Better testing and documentation

For experimental or peripheral features, separate repositories may be created to maintain the focus of this codebase. 