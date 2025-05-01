#!/bin/bash

# Define colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}VRF Implementation Analysis${NC}"
echo "========================================"

# Set the path variables
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTRACTS_DIR="$PROJECT_ROOT/contracts"

# VRF implementation patterns to check
declare -A PATTERNS
PATTERNS[interface_declaration]="interface.*VRF.*Consumer"
PATTERNS[request_randomness]="function requestRandomness.*address.*returns.*uint"
PATTERNS[process_randomness]="function processRandomness.*uint.*address.*uint.*external"
PATTERNS[lottery_flow]="emit.*RandomnessRequested"
PATTERNS[vrf_security]="require.*msg.sender.*==.*vrfCoordinator"
PATTERNS[layerzero_security]="require.*msg.sender.*==.*address.*lzEndpoint"
PATTERNS[chain_validation]="require.*_origin.srcEid.*==.*arbitrumChainId"
PATTERNS[source_validation]="require.*srcAddress.*==.*arbitrumVRFRequester"
PATTERNS[cleanup]="delete requestToUser.*requestId"
PATTERNS[tx_origin_check]="require.*tx.origin.*==.*msg.sender"
PATTERNS[not_contract_check]="require.*tx.origin.code.length.*==.*0"
PATTERNS[nonce_incrementing]="uint64 requestId.*=.*nonce"

# Set of required patterns to ensure security
REQUIRED_PATTERNS=(
    "vrf_security"
    "layerzero_security"
    "chain_validation"
    "source_validation" 
    "cleanup"
)

# Set of fallback patterns to ensure proper fallback
FALLBACK_PATTERNS=(
    "tx_origin_check"
    "not_contract_check"
)

# Key contract files to check
CONTRACT_FILES=(
    "DragonSwapTriggerV2.sol"
    "interfaces/IVRFConsumer.sol"
    "interfaces/ISonicVRFConsumer.sol"
    "interfaces/IArbitrumVRFRequester.sol"
)

# Counter for pattern matches
FOUND=0
MISSING=0
TOTAL_REQUIRED=${#REQUIRED_PATTERNS[@]}

# Function to check for a pattern in a file
check_pattern() {
    local file=$1
    local pattern_name=$2
    local pattern_regex=${PATTERNS[$pattern_name]}
    
    if grep -q "$pattern_regex" "$file"; then
        echo -e "  ${GREEN}✓ Found: $pattern_name${NC}"
        ((FOUND++))
        return 0
    else
        echo -e "  ${RED}✗ Missing: $pattern_name${NC}"
        ((MISSING++))
        return 1
    fi
}

# Function to check all required patterns in a file
check_requirements() {
    local file=$1
    echo -e "\n${YELLOW}Checking required security patterns in:${NC} $file"
    
    for pattern in "${REQUIRED_PATTERNS[@]}"; do
        check_pattern "$file" "$pattern"
    done
}

# Function to check for fallback mechanism
check_fallback() {
    local file=$1
    echo -e "\n${YELLOW}Checking fallback mechanism in:${NC} $file"
    
    local has_fallback=false
    
    for pattern in "${FALLBACK_PATTERNS[@]}"; do
        if check_pattern "$file" "$pattern"; then
            has_fallback=true
        fi
    done
    
    if [ "$has_fallback" = true ]; then
        echo -e "  ${GREEN}✓ Fallback mechanism implemented${NC}"
    else
        echo -e "  ${BLUE}ℹ No fallback mechanism detected${NC}"
    fi
}

# Analyze each contract file
for file in "${CONTRACT_FILES[@]}"; do
    full_path="$CONTRACTS_DIR/$file"
    
    if [ -f "$full_path" ]; then
        echo -e "\n${YELLOW}Analyzing: $file${NC}"
        echo "----------------------------------------"
        
        # Check if file implements VRF functionality
        if grep -q -E "VRF|Random" "$full_path"; then
            check_requirements "$full_path"
            check_fallback "$full_path"
        else
            echo -e "  ${BLUE}ℹ No VRF implementation detected${NC}"
        fi
    else
        echo -e "\n${RED}File not found: $file${NC}"
    fi
done

# Print summary
echo -e "\n${YELLOW}Security Analysis Summary${NC}"
echo "========================================"
echo -e "${GREEN}Required patterns found: $FOUND${NC}"
echo -e "${RED}Required patterns missing: $MISSING${NC}"
echo -e "Security coverage: $(( (FOUND * 100) / (FOUND + MISSING) ))%"

echo -e "\n${BLUE}Recommendation:${NC}"
if [ $MISSING -gt 0 ]; then
    echo -e "${RED}Review missing security patterns and implement them.${NC}"
else
    echo -e "${GREEN}VRF implementation meets security requirements.${NC}"
fi

# Look for tx.origin usage
echo -e "\n${YELLOW}Checking for tx.origin usage${NC}"
echo "----------------------------------------"
grep -n "tx.origin" $CONTRACTS_DIR/*/*.sol $CONTRACTS_DIR/*.sol 2>/dev/null | grep -v "tx.origin.*==.*msg.sender" | grep -v "tx.origin.code.length"
if [ $? -eq 0 ]; then
    echo -e "\n${RED}⚠ Potentially unsafe tx.origin usage detected!${NC}"
    echo -e "${RED}Review the above instances for security risks.${NC}"
else
    echo -e "${GREEN}✓ No unsafe tx.origin usage detected${NC}"
fi

exit 0 