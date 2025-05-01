# VRF Testing Guide

This document outlines the structure and process for testing the Verifiable Random Function (VRF) implementation for the Dragon project.

## Testing Components

The VRF testing system consists of these key components:

1. **VRFTestHelper** - A simplified contract for testing basic VRF functionality
2. **SonicVRFConsumerMock** - A mock implementation of the Sonic chain VRF consumer
3. **MockLzEndpoint** - A mock implementation of the LayerZero endpoint for cross-chain communication
4. **MockStructs** - Contains helper structs for testing

## Test Files

The following test files are available:

1. **minimal-vrf-test.js** - A minimal test that only verifies VRFTestHelper can be deployed
2. **vrf-helper-test.js** - Comprehensive tests for VRFTestHelper contract
3. **sonic-vrf-consumer-test.js** - Tests for the SonicVRFConsumerMock contract

## Running Tests

We have several test scripts available:

1. **run-isolated-vrf-test.sh** - Runs a minimal isolated test
2. **run-vrf-helper-test.sh** - Runs comprehensive VRFTestHelper tests
3. **run-sonic-vrf-consumer-test.sh** - Runs SonicVRFConsumerMock tests
4. **run-all-vrf-tests.sh** - Runs all VRF tests in sequence

### Isolated Testing Configuration

The tests use an isolated Hardhat configuration to avoid conflicts with the main project:

- **hardhat.isolated.config.js** - Dedicated config for isolated VRF tests
- Uses separate cache and artifacts directories
- Only compiles the necessary mock contracts

### To run all tests:

```bash
./scripts/run-all-vrf-tests.sh
```

## Test Coverage

1. **VRFTestHelper Tests**:
   - Initialization and parameter validation
   - VRF parameter updates
   - Randomness request functionality
   - Randomness fulfillment
   - VRF state querying
   - Retry mechanism

2. **SonicVRFConsumerMock Tests**:
   - Initialization and parameter validation
   - Randomness request permissions
   - Cross-chain communication
   - Admin functions

## Troubleshooting

If you encounter compilation errors related to external dependencies:

1. Make sure your hardhat.isolated.config.js is correctly configured
2. Run the clean script to remove cached artifacts:
   ```bash
   rm -rf ./cache-isolated ./artifacts-isolated
   ```
3. Verify that your test files are only importing the required mock contracts
4. Try running tests one at a time to isolate the issue

## Results

All tests should pass successfully. The tests verify:

1. Correct implementation of the VRF request/response flow
2. Proper cross-chain message handling
3. Correct access control for different functions
4. Proper event emission and state management 