# Test Organization

## Overview

This document outlines the test organization and strategy for the Dragon Finance project. Tests are organized to ensure comprehensive coverage of all contracts and their interactions.

## Test Structure

The test directory is organized as follows:

```
test/
├── helpers/             # Test helper functions and utilities
├── mocks/               # Mock contracts for testing
│   ├── tokens/          # Mock token implementations
│   ├── core/            # Core mock contracts
│   └── integrations/        # Mocks of external dependencies
└── unit/                # Unit tests grouped by contract
    ├── interfaces/      # Interface tests
    ├── core/            # Core contract tests
    └── peripheral/      # Tests for peripheral contracts
```

## Mock Contracts

Mock contracts are consolidated in the `test/mocks` directory, removing the duplicate mock implementations previously found in both `contracts/mocks` and `contracts/test`. This consolidation:

1. Eliminates duplicate artifacts issues during testing
2. Provides a single source of truth for mock implementations
3. Makes test dependencies more explicit and manageable

### Naming Conventions

Mock contracts follow a consistent naming convention:

- `Mock[ContractName].sol` - Basic mock implementation
- `Mock[ContractName]WithErrors.sol` - Mock implementation that tests error scenarios
- `Mock[ContractName]Factory.sol` - Factory for creating mock instances

## Test Categories

### Unit Tests

Unit tests validate the functionality of individual contracts in isolation. They are organized by contract category:

- **Core Tests**: Testing fundamental contracts like Dragon, DragonShadowV3Swapper, ve69LP
- **Interface Tests**: Validating interface implementations and contracts that implement those interfaces
- **Peripheral Tests**: Testing supporting contracts like GoldScratcher, RedEnvelope

### Integration Tests

Integration tests validate the interactions between multiple contracts, ensuring the system works correctly as a whole.

## Running Tests

Tests can be run in several ways:

```bash
# Run all tests
npx hardhat test

# Run specific category of tests
npx hardhat test test/unit/interfaces/

# Run a specific test file
npx hardhat test test/unit/interfaces/Ive69LPPoolVoting.test.js
```

## Test Environment

Each test suite sets up its own test environment with the necessary mock contracts. Helper functions in the `test/helpers` directory facilitate common setup tasks:

- `deployMocks.js` - Helper for deploying common mock contracts
- `setupTestEnvironment.js` - Helper for setting up a complete test environment
- `testUtils.js` - Common test utilities and assertions

## Addressing Artifact Conflicts

The reorganization addresses artifact conflicts by:

1. Maintaining a single implementation of each mock contract
2. Using fully qualified names when necessary (e.g., `test/mocks/tokens/MockERC20.sol:MockERC20`)
3. Ensuring consistent solidity versions across mock contracts

## Mock Contract Migration Guide

When migrating mock contracts from `contracts/mocks` and `contracts/test` to the consolidated `test/mocks` directory:

1. Compare both implementations to determine the most comprehensive version
2. Ensure the implementation includes all required functionality for tests
3. Update import paths in tests to reference the new location
4. Update contract factory calls to use the new fully qualified name 