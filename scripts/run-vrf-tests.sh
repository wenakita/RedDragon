#!/bin/bash

# Make script exit if any command fails
set -e

echo "### Running VRF Tests ###"
echo "------------------------"

# Run Forge tests for VRF implementation
echo "Running Forge tests..."
forge test --match-path "test/forge/VRF*.t.sol" -vvv

# Run Hardhat tests for VRF implementation
echo "Running Hardhat tests..."
npx hardhat test test/vrf-implementation.test.js

echo "------------------------"
echo "All tests completed successfully!" 