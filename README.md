# Dragon Ecosystem Documentation

Welcome to the comprehensive documentation for the Dragon Ecosystem. This repository contains all the necessary information for understanding, deploying, and interacting with the Dragon Ecosystem smart contracts and services.

## Project Structure

This project has been organized into a clean directory structure:

- `contracts/` - Smart contract source code
- `test/` - Test files for smart contracts
- `scripts/` - JavaScript deployment scripts
- `deploy/` - Deployment-related files and shell scripts
- `docs/` - Project documentation
- `metadata/` - NFT metadata-related files
- `build/` - Build artifacts

For detailed information on the project structure, see [Project Structure](docs/project-structure.md).

## Table of Contents

### 1. Core Documentation

- [**Dragon Ecosystem Documentation**](docs/DRAGON_DOCUMENTATION.md) - Complete overview of the system architecture, components, and interactions
- [**System Architecture Diagrams**](docs/DRAGON_SYSTEM_DIAGRAM.md) - Visual representations of the system components and flows
- [**API Reference**](docs/DRAGON_API_REFERENCE.md) - Detailed API documentation for developers integrating with the ecosystem
- [**Security Guide**](docs/security-keys.md) - Guidelines for managing API keys, private keys, and sensitive information

### 2. Deployment & Operations

- [**Google Cloud Deployment Guide**](docs/DRAGON_GOOGLE_CLOUD_DEPLOYMENT.md) - Comprehensive guide for deploying and managing the ecosystem using Google Cloud
- [**Testing Guide**](docs/DRAGON_TESTING_GUIDE.md) - Detailed guide for testing all contracts in the ecosystem
- [**ConcreteDragonLotterySwap Implementation**](docs/CONCRETE_IMPLEMENTATION_EXAMPLE.md) - Example implementation of the concrete lottery contract

### 3. Smart Contracts

The Dragon Ecosystem consists of the following main smart contracts:

- **Dragon.sol** - The main ERC20 token with fee distribution
- **DragonLotterySwap.sol** - Abstract lottery system with multiple boost mechanisms
- **ConcreteDragonLotterySwap.sol** - Concrete implementation of the lottery system
- **ve69LP.sol** - Voting escrow token for governance
- **ve69LPFeeDistributor.sol** - Distribution of fees to ve69LP holders
- **GoldScratcher.sol** - NFT-based jackpot boost system
- **PromotionalItemRegistry.sol** - Registry for promotional items
- **RedEnvelope.sol** - Special rewards distribution system
- **DragonExchangePair.sol** - Custom exchange pair for DRAGON token
- **DragonJackpotVault.sol** - Management of the lottery jackpot
- **DragonBeetsAdapter.sol** - Integration with Balancer/Beets
- **DragonLPBooster.sol** - Boosts for liquidity providers

### 4. Key Features

- **Deflationary Token**: 10% fee on transactions with specific allocations
- **Lottery System**: Win jackpots when swapping wrapped Sonic for DRAGON
- **Governance**: Lock tokens for voting power and fee sharing
- **Boosts**: Multiple mechanisms to increase win chances and rewards

### 5. Integration Guide

For developers looking to integrate with the Dragon Ecosystem:

1. Start with the [API Reference](docs/DRAGON_API_REFERENCE.md) to understand available functions
2. Review the [System Architecture Diagrams](docs/DRAGON_SYSTEM_DIAGRAM.md) to understand component interactions
3. For deployment, follow the [Google Cloud Deployment Guide](docs/DRAGON_GOOGLE_CLOUD_DEPLOYMENT.md)
4. For testing, follow the [Testing Guide](docs/DRAGON_TESTING_GUIDE.md)

### 6. Security Measures

The Dragon Ecosystem implements several security features:

- Paintswap VRF for verifiable randomness
- Timelock mechanisms for parameter changes
- Access control for critical functions
- Reentrancy guards on sensitive operations

## Getting Started

1. Clone this repository
2. Install dependencies with `npm install`
3. Compile contracts with `npm run compile`
4. Run tests with `npm test`
5. For deployment, follow the [Deployment Guide](docs/DRAGON_GOOGLE_CLOUD_DEPLOYMENT.md)

## Testing

The Dragon Ecosystem includes comprehensive tests for all contracts. The testing approach is detailed in the [Testing Guide](docs/DRAGON_TESTING_GUIDE.md). Key aspects include:

- Unit tests for individual contracts
- Integration tests for contract interactions
- Randomness testing for the VRF implementation
- Mock contracts for external dependencies

## Security

Security is a top priority for the Dragon Ecosystem. We have implemented several measures to protect sensitive information:

- Secure key management using Google Cloud Secret Manager
- Multiple layers of protection for sensitive files
- Proper `.gitignore` configuration to prevent accidental commitment of secrets
- Example templates for all sensitive files

For more information on security practices and key management, see the [Security Guide](docs/security-keys.md).

## License

MIT

---

For questions, support, or contributions, please contact the Dragon team. 