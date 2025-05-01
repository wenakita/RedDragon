#!/bin/bash

# Define colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Running Dragon VRF Tests with Forge${NC}"
echo "========================================"

# Set the path variables
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FORGE_TEST_DIR="$PROJECT_ROOT/test/forge"

# Create an array of test files to run
TEST_FILES=(
    "DragonSwapTriggerVRFTest.t.sol"
    "VRFFallbackImplementation.t.sol"
    "LayerZeroVRFIntegration.t.sol"
    "LayerZeroReadVRFTest.t.sol"
)

# Count for test results
PASSED=0
FAILED=0

# Run each test file
for test_file in "${TEST_FILES[@]}"
do
    echo -e "\n${YELLOW}Running test: $test_file${NC}"
    echo "----------------------------------------"
    
    # Run the test with Forge
    forge test --match-path "test/forge/$test_file" -vv
    
    # Check the result
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Test passed: $test_file${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ Test failed: $test_file${NC}"
        ((FAILED++))
    fi
done

# Print summary
echo -e "\n${YELLOW}Test Summary${NC}"
echo "========================================"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Total: $((PASSED + FAILED))"

# Exit with error code if any test failed
if [ $FAILED -gt 0 ]; then
    exit 1
fi

exit 0 