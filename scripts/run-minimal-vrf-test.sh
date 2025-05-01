#!/bin/bash

# Make script exit if any command fails
set -e

echo "### Running Minimal VRF Tests ###"
echo "--------------------------------"

# Run the minimal test that only tests deploying VRFTestHelper without dependencies
echo "Running Minimal VRF Tests..."
npx hardhat test test/test-only/minimal-vrf-test.js --config hardhat.vrf-test.config.js

echo "--------------------------------"
echo "Minimal tests completed successfully!" 