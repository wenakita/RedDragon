#!/bin/bash

# Simple script to run different test suites
# Usage: ./scripts/run-tests.sh [math|vrf|all]

set -e

case "$1" in
  math)
    echo "Running math library tests..."
    forge test --match-path "test/math/**"
    ;;
  vrf)
    echo "Running VRF tests..."
    forge test --match-path "test/vrf/**"
    ;;
  all)
    echo "Running all tests..."
    forge test
    ;;
  *)
    echo "Usage: $0 [math|vrf|all]"
    echo "  math: Run math library tests"
    echo "  vrf: Run VRF tests"
    echo "  all: Run all tests"
    exit 1
    ;;
esac

echo "Tests completed successfully!" 