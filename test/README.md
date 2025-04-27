# Dragon Project Test Suite

This directory contains tests for the Dragon project, including both unit tests and integration tests.

## Testing Approaches

We use two different testing frameworks:

1. **Hardhat** - JavaScript-based testing using ethers.js and Chai
2. **Forge** - Solidity-based testing using Foundry

## Running Tests

### Hardhat Tests

Hardhat tests use JavaScript and can test complete workflows:

```bash
# Run all tests
npx hardhat test

# Run a specific test file
npx hardhat test test/path/to/file.js
```

### Forge Tests

Forge tests use Solidity and are great for testing contract functionality directly:

```bash
# Run all tests
forge test

# Run a specific test file or contract
forge test --match-contract MockVRFTest
forge test --match-path test/forge/MockVRFTest.t.sol

# Run with verbose output
forge test -vvv
```

## Test Structure

### Mock Contracts

We've created several mock contracts for testing:

- `MockVRFCoordinator.sol` - Simulates Chainlink VRF for randomness generation
- `MockLayerZeroEndpoint.sol` - Simulates LayerZero cross-chain messaging
- `ConsumerMock.sol` - A simple consumer of VRF randomness
- `LzReceiverMock.sol` - A simple receiver of LayerZero messages

### Test Files

#### Forge Tests

- `test/forge/Simple.t.sol` - A minimal test to verify the Forge setup
- `test/forge/MockVRFTest.t.sol` - Tests for the MockVRFCoordinator
- `test/forge/MockLayerZeroTest.t.sol` - Tests for the MockLayerZeroEndpoint

## Issues & Troubleshooting

If you encounter compilation errors:

1. Make sure all imported files exist
2. Check for correct import paths
3. Verify interface implementations match expected functions
4. For Forge tests, ensure forge-std is installed (`forge init --force --no-commit`) 