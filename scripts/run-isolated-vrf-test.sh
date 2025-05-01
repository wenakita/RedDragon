#!/bin/bash

# Make script exit if any command fails
set -e

echo "### Running Isolated VRF Tests ###"
echo "--------------------------------"

# Clean any existing cache and artifacts for isolation
echo "Cleaning isolated cache and artifacts..."
rm -rf ./cache-isolated ./artifacts-isolated 2>/dev/null || true

# Run the minimal test with isolated config
echo "Running Isolated VRF Tests..."
npx hardhat test test/test-only/minimal-vrf-test.js --config hardhat.isolated.config.js

echo "--------------------------------"
echo "Isolated tests completed successfully!" 