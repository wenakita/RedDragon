#!/bin/bash

# Make script exit if any command fails
set -e

echo "### Running Comprehensive VRF Helper Tests ###"
echo "--------------------------------------------"

# Clean any existing cache and artifacts for isolation
echo "Cleaning isolated cache and artifacts..."
rm -rf ./cache-isolated ./artifacts-isolated 2>/dev/null || true

# Run the comprehensive test with isolated config
echo "Running Comprehensive VRF Helper Tests..."
npx hardhat test test/test-only/vrf-helper-test.js --config hardhat.isolated.config.js

echo "--------------------------------------------"
echo "Comprehensive tests completed successfully!" 