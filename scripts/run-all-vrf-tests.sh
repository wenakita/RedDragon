#!/bin/bash

# Make script exit if any command fails
set -e

echo "=================================================="
echo "### Running All VRF Tests ###"
echo "=================================================="

# Clean any existing cache and artifacts for isolation
echo "Cleaning isolated cache and artifacts..."
rm -rf ./cache-isolated ./artifacts-isolated 2>/dev/null || true

# Run Minimal Test
echo -e "\n\n### Running Minimal VRF Test ###"
echo "----------------------------------------"
npx hardhat test test/test-only/minimal-vrf-test.js --config hardhat.isolated.config.js

# Run Comprehensive VRF Helper Test
echo -e "\n\n### Running Comprehensive VRF Helper Test ###"
echo "----------------------------------------"
npx hardhat test test/test-only/vrf-helper-test.js --config hardhat.isolated.config.js

# Run SonicVRFConsumerMock Test
echo -e "\n\n### Running SonicVRFConsumerMock Test ###"
echo "----------------------------------------"
npx hardhat test test/test-only/sonic-vrf-consumer-test.js --config hardhat.isolated.config.js

echo -e "\n\n=================================================="
echo "### All VRF Tests Completed Successfully! ###"
echo "==================================================" 