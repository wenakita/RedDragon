#!/bin/bash
# Generate SonicScan URLs for contract verification

# Load the contract addresses
source deployment-files/export-contract-vars.sh

# SonicScan base URL
SONICSCAN_URL="https://sonicscan.io/address"

echo "==============================================================="
echo "SonicScan Contract Verification Links"
echo "==============================================================="
echo "Please open these links in your browser to check verification status"
echo

# Function to print contract link
print_contract() {
  local name=$1
  local address=$2
  
  if [ -z "$address" ]; then
    echo "$name: Not deployed yet"
  else
    echo "$name: $SONICSCAN_URL/$address#code"
  fi
}

# Print all contract links
print_contract "Dragon Token" "$DRAGON_ADDRESS"
print_contract "ConcreteDragonLotterySwap" "$LOTTERY_SWAP_ADDRESS"
print_contract "GoldScratcher" "$GOLD_SCRATCHER_ADDRESS"
print_contract "Ve69LP Token" "$VE69LP_ADDRESS"
print_contract "Ve69LPFeeDistributor" "$VE69LP_FEE_DISTRIBUTOR"
print_contract "PromotionalItemRegistry" "$PROMOTIONAL_ITEM_REGISTRY"
print_contract "MockPaintSwapVerifier" "$MOCK_PAINTSWAP_VERIFIER"
print_contract "VRF Validator" "$VRF_VALIDATOR_ADDRESS"
print_contract "Delayed Entry Compensation" "$COMPENSATION_ADDRESS"
print_contract "Jackpot Vault" "$JACKPOT_VAULT_ADDRESS"
print_contract "Red Envelopes" "$RED_ENVELOPES_ADDRESS"

echo
echo "To verify a contract's source code on SonicScan:"
echo "1. Visit the link above"
echo "2. Look for 'Contract Source Code Verified' tag"
echo "3. If you need to verify a contract, use the 'Verify and Publish' option on SonicScan"
echo "===============================================================" 