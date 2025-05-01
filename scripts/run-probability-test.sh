#!/bin/bash

# Make script exit if any command fails
set -e

echo "### Running Lottery Probability Tests ###"
echo "---------------------------------------"

# Run the probability test with isolated config
echo "Running Probability Tests..."
npx hardhat test test/test-only/probability-test.js --config hardhat.isolated.config.js

echo "---------------------------------------"
echo "Probability tests completed!" 