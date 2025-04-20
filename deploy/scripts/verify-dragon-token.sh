#!/bin/bash
# Script to verify the Dragon Token contract on SonicScan

echo "=================================================================="
echo "Verifying Dragon Token Contract on SonicScan"
echo "=================================================================="
echo

# Get Dragon token address from deployments.json
DRAGON_ADDRESS=$(node -e "console.log(require('./deployments.json').dragon || '')")

if [ -z "$DRAGON_ADDRESS" ]; then
  echo "Error: Dragon token address not found in deployments.json!"
  exit 1
fi

echo "Dragon Token address: $DRAGON_ADDRESS"

# Get addresses from .env or use defaults
source .env
JACKPOT_VAULT_ADDRESS=${JACKPOT_VAULT_ADDRESS:-"0x2e76D5d31B41Edc8Ae71F9dFbB768bdaAcED648e"}
VE69LP_ADDRESS=${VE69LP_ADDRESS:-"0xb5C23c1F2BeBA4575F845DEc0E585E404BEE3082"}
BURN_ADDRESS=${BURN_ADDRESS:-"0x000000000000000000000000000000000000dEaD"}
WRAPPED_SONIC_ADDRESS=${WRAPPED_SONIC_ADDRESS:-"0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38"}

# Verify the Dragon token contract with constructor arguments
echo "Verifying Dragon Token contract with constructor arguments..."
echo "Target: $DRAGON_ADDRESS"
echo "Args: $JACKPOT_VAULT_ADDRESS $VE69LP_ADDRESS $BURN_ADDRESS $WRAPPED_SONIC_ADDRESS"

# Direct command with hardcoded addresses for reliability
npx hardhat verify --network sonic $DRAGON_ADDRESS $JACKPOT_VAULT_ADDRESS $VE69LP_ADDRESS $BURN_ADDRESS $WRAPPED_SONIC_ADDRESS

if [ $? -eq 0 ]; then
  echo "✅ Dragon Token verified successfully on SonicScan!"
else
  echo "❌ Failed to verify Dragon Token with constructor arguments."
  echo "Please verify manually at: https://sonicscan.org/address/${DRAGON_ADDRESS}#code"
  echo "Manual verification command:"
  echo "npx hardhat verify --network sonic $DRAGON_ADDRESS $JACKPOT_VAULT_ADDRESS $VE69LP_ADDRESS $BURN_ADDRESS $WRAPPED_SONIC_ADDRESS"
fi

echo
echo "=================================================================="
echo "Verification process completed!"
echo "==================================================================" 