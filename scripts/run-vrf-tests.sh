#!/bin/bash

# Make script exit if any command fails
set -e

echo "### Running VRF Tests ###"
echo "------------------------"

# Run Hardhat tests for VRF implementation with dedicated config
echo "Running VRF Isolated Mock Tests..."
npx hardhat test test/vrf-isolated-test.js --config hardhat.vrf-test.config.js

echo "------------------------"
echo "All tests completed successfully!" 