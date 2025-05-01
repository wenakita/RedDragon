#!/bin/bash

# Make script exit if any command fails
set -e

echo "### Running Probability Contract Tests ###"
echo "---------------------------------------"

# Clean any existing cache and artifacts for isolation
echo "Cleaning isolated cache and artifacts..."
rm -rf ./cache-isolated ./artifacts-isolated 2>/dev/null || true

# Run the probability contract test with isolated config
echo "Running Probability Contract Tests..."
npx hardhat test test/test-only/probability-contract-test.js --config hardhat.isolated.config.js

echo "---------------------------------------"
echo "Probability contract tests completed!" 