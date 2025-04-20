#!/bin/bash
# Script to verify all deployed contracts on SonicScan

echo "=================================================================="
echo "Verifying Dragon Ecosystem Contracts on SonicScan"
echo "=================================================================="
echo

# Load contract addresses from deployments.json
if [ ! -f "deployments.json" ]; then
  echo "Error: deployments.json not found!"
  exit 1
fi

# Function to verify a contract
verify_contract() {
  local contract_name=$1
  local address=$2
  shift 2
  local constructor_args=("$@")

  echo "Verifying $contract_name at $address..."
  echo "Arguments: ${constructor_args[@]}"
  
  if [ ${#constructor_args[@]} -eq 0 ]; then
    # No constructor arguments
    npx hardhat verify --network sonic $address
  else
    # With constructor arguments
    npx hardhat verify --network sonic $address "${constructor_args[@]}"
  fi
  
  if [ $? -eq 0 ]; then
    echo "✅ $contract_name verified successfully on SonicScan!"
  else
    echo "❌ Failed to verify $contract_name on SonicScan"
  fi
  
  echo
}

# Get environment variables for wrapped sonic address
source .env

# Get addresses from deployments.json
VRF_VALIDATOR_ADDRESS=$(node -e "console.log(require('./deployments.json').vrfValidator || '')")
JACKPOT_VAULT_ADDRESS=$(node -e "console.log(require('./deployments.json').jackpotVault || '')")
RED_ENVELOPES_ADDRESS=$(node -e "console.log(require('./deployments.json').redEnvelopes || '')")
COMPENSATION_ADDRESS=$(node -e "console.log(require('./deployments.json').compensation || '')")
VRF_COORDINATOR=$(node -e "console.log(require('./deployments.json').vrfCoordinator || '')")
WRAPPED_SONIC_ADDRESS=$(node -e "console.log(process.env.WRAPPED_SONIC_ADDRESS || '')")
DRAGON_ADDRESS=$(node -e "console.log(require('./deployments.json').dragon || '')")

if [ -z "$VRF_COORDINATOR" ]; then
  VRF_COORDINATOR="0x3Ba925fdeAe6B46d0BB4d424D829982Cb2F7309e"
fi

if [ -z "$WRAPPED_SONIC_ADDRESS" ]; then
  WRAPPED_SONIC_ADDRESS="0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38"
fi

echo "VRF Validator: $VRF_VALIDATOR_ADDRESS"
echo "Jackpot Vault: $JACKPOT_VAULT_ADDRESS"
echo "Red Envelopes: $RED_ENVELOPES_ADDRESS"
echo "Compensation: $COMPENSATION_ADDRESS"
echo "VRF Coordinator: $VRF_COORDINATOR"
echo "Wrapped Sonic: $WRAPPED_SONIC_ADDRESS"
echo

# Verify VRF Validator
if [ ! -z "$VRF_VALIDATOR_ADDRESS" ]; then
  verify_contract "VRFValidator" "$VRF_VALIDATOR_ADDRESS" "$VRF_COORDINATOR"
fi

# Verify Jackpot Vault
if [ ! -z "$JACKPOT_VAULT_ADDRESS" ]; then
  # Use the address used for deployment
  DEPLOYER_ADDRESS="0x78266EAb20Ff1483a926F183B3E5A6C84f87D54c"
  verify_contract "DragonJackpotVault" "$JACKPOT_VAULT_ADDRESS" "$WRAPPED_SONIC_ADDRESS" "$DEPLOYER_ADDRESS"
fi

# Verify Red Envelopes
if [ ! -z "$RED_ENVELOPES_ADDRESS" ]; then
  NFT_NAME="Dragon Red Envelope"
  NFT_SYMBOL="DRAGRED"
  BASE_URI="https://storage.googleapis.com/dragon-nft-assets-dragon-ecosystem-202504172039/red-envelopes/"
  verify_contract "RedEnvelope" "$RED_ENVELOPES_ADDRESS" "$NFT_NAME" "$NFT_SYMBOL" "$BASE_URI"
fi

# Verify Delayed Entry Compensation
if [ ! -z "$COMPENSATION_ADDRESS" ]; then
  verify_contract "DelayedEntryCompensation" "$COMPENSATION_ADDRESS"
fi

echo "=================================================================="
echo "Verification process completed!"
echo "=================================================================="
echo
echo "All contracts have been verified on SonicScan:"
echo "1. VRF Validator: https://sonicscan.org/address/$VRF_VALIDATOR_ADDRESS#code"
echo "2. Dragon Jackpot Vault: https://sonicscan.org/address/$JACKPOT_VAULT_ADDRESS#code"
echo "3. Red Envelope: https://sonicscan.org/address/$RED_ENVELOPES_ADDRESS#code"
echo "4. Delayed Entry Compensation: https://sonicscan.org/address/$COMPENSATION_ADDRESS#code"
echo
echo "These contracts were already verified:"
echo "1. Dragon Token: https://sonicscan.org/address/$DRAGON_ADDRESS#code"
echo "2. DragonLotterySwap: https://sonicscan.org/address/$(node -e "console.log(require('./deployments.json').lotterySwap || '')")#code"
echo "3. GoldScratcher: https://sonicscan.org/address/$(node -e "console.log(require('./deployments.json').goldScratcher || '')")#code"
echo "4. Ve69LP Token: https://sonicscan.org/address/$(node -e "console.log(require('./deployments.json').ve69lp || '')")#code"
echo "5. Ve69LPFeeDistributor: https://sonicscan.org/address/$(node -e "console.log(require('./deployments.json').ve69LPFeeDistributor || '')")#code"
echo "6. PromotionalItemRegistry: https://sonicscan.org/address/$(node -e "console.log(require('./deployments.json').promotionalItemRegistry || '')")#code"
echo "7. MockPaintSwapVerifier: https://sonicscan.org/address/$(node -e "console.log(require('./deployments.json').mockPaintSwapVerifier || '')")#code" 