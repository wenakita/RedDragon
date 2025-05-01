#!/bin/bash

# Make script exit if any command fails
set -e

echo "### Running Simplified VRF Tests ###"
echo "--------------------------------"

# Run the simplified test that only tests VRFTestHelper without dependencies
echo "Running Simplified VRF Tests..."
npx hardhat test test/test-only/simple-vrf-test.js --config hardhat.vrf-test.config.js

echo "--------------------------------"
echo "Simplified tests completed successfully!" 