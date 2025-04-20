#!/bin/bash
# Pre-deployment setup script for Dragon Ecosystem on GCP

# Exit on error
set -e

echo "Setting up pre-deployment files for Dragon Ecosystem..."

# Create the needed files directory if it doesn't exist
mkdir -p deployment-files

# Check if .env file exists and extract values from it
if [ -f .env ]; then
  echo "Found .env file, extracting values..."
  
  # Extract API key
  API_KEY=$(grep SONICSCAN_API_KEY .env | cut -d '"' -f 2)
  if [ -n "$API_KEY" ]; then
    echo "$API_KEY" > deployment-files/api_key.txt
    echo "SonicScan API key extracted and saved to deployment-files/api_key.txt"
  else
    echo "WARNING: Could not find SONICSCAN_API_KEY in .env file"
  fi
  
  # Extract private key
  PRIVATE_KEY=$(grep PRIVATE_KEY .env | cut -d '"' -f 2)
  if [ -n "$PRIVATE_KEY" ]; then
    echo "$PRIVATE_KEY" > deployment-files/private_key.txt
    echo "Private key extracted and saved to deployment-files/private_key.txt"
  else
    echo "WARNING: Could not find PRIVATE_KEY in .env file"
  fi
else
  echo "ERROR: .env file not found. Please create one with SONICSCAN_API_KEY and PRIVATE_KEY values."
  exit 1
fi

# Create a template for contract addresses
cat > deployment-files/contract-addresses-template.json << EOF
{
  "tokens": {
    "dragon": "DRAGON_ADDRESS_HERE"
  },
  "vrf": {
    "validator": "VRF_VALIDATOR_ADDRESS_HERE",
    "coordinator": "0x3Ba925fdeAe6B46d0BB4d424D829982Cb2F7309e"
  },
  "lottery": {
    "dragonLotterySwap": "LOTTERY_SWAP_ADDRESS_HERE",
    "goldScratcher": "GOLD_SCRATCHER_ADDRESS_HERE"
  },
  "whitelist": {
    "delayedEntryCompensation": "COMPENSATION_ADDRESS_HERE"
  },
  "utility": {
    "jackpotVault": "JACKPOT_VAULT_ADDRESS_HERE",
    "redEnvelopes": "RED_ENVELOPES_ADDRESS_HERE"
  },
  "constants": {
    "chainId": 146,
    "rpcUrl": "https://rpc.soniclabs.com"
  }
}
EOF

echo "Created contract addresses template in deployment-files/contract-addresses-template.json"
echo "Please update this file with your deployed contract addresses before running the deployment script."

# Create environment variable export script
cat > deployment-files/export-contract-vars.sh << EOF
#!/bin/bash
# Export contract addresses as environment variables

# Replace these values with your actual deployed contract addresses
export DRAGON_ADDRESS="0x..."
export VRF_VALIDATOR_ADDRESS="0x..."
export LOTTERY_SWAP_ADDRESS="0x..."
export GOLD_SCRATCHER_ADDRESS="0x..."
export COMPENSATION_ADDRESS="0x..."
export JACKPOT_VAULT_ADDRESS="0x..."
export RED_ENVELOPES_ADDRESS="0x..."

echo "Environment variables for contract addresses have been set."
EOF

chmod +x deployment-files/export-contract-vars.sh

echo "Created environment variables export script at deployment-files/export-contract-vars.sh"

# Create a sample NFT image directory
mkdir -p deployment-files/sample-nft-images
echo "Created deployment-files/sample-nft-images/ directory. Please add your NFT images here before deployment."

echo "Pre-deployment setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Update deployment-files/contract-addresses-template.json with your deployed contract addresses"
echo "2. Edit deployment-files/export-contract-vars.sh with your contract addresses"
echo "3. Add NFT images to deployment-files/sample-nft-images/"
echo "4. Run 'source deployment-files/export-contract-vars.sh' to set environment variables"
echo "5. Execute the deployment script with './dragon-deploy.sh'" 