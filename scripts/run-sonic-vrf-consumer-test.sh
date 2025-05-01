#!/bin/bash

# Make script exit if any command fails
set -e

echo "### Running SonicVRFConsumerMock Tests ###"
echo "----------------------------------------"

# Clean any existing cache and artifacts for isolation
echo "Cleaning isolated cache and artifacts..."
rm -rf ./cache-isolated ./artifacts-isolated 2>/dev/null || true

# Run the SonicVRFConsumerMock test with isolated config
echo "Running SonicVRFConsumerMock Tests..."
npx hardhat test test/test-only/sonic-vrf-consumer-test.js --config hardhat.isolated.config.js

echo "----------------------------------------"
echo "SonicVRFConsumerMock tests completed successfully!" 