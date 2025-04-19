#!/bin/bash
# Simplified Dragon Ecosystem GCP Deployment Script
# This version skips Cloud Run and Cloud Functions deployments

# Exit on error
set -e

# Verify current project
project_id=$(gcloud config get-value project)
echo "Using project: $project_id"

# Verify billing is enabled
BILLING_INFO=$(gcloud billing projects describe $project_id 2>/dev/null || echo "NOT_FOUND")
if [[ "$BILLING_INFO" == *"NOT_FOUND"* || "$BILLING_INFO" != *"billingEnabled: true"* ]]; then
  echo "ERROR: Billing account is not enabled for this project."
  exit 1
fi

echo "Billing account verified. Proceeding with deployment..."

# First, load the contract addresses from environment variables if they exist
if [ -f "deployment-files/export-contract-vars.sh" ]; then
  echo "Loading contract addresses from environment variables..."
  source deployment-files/export-contract-vars.sh
fi

# Create contract addresses JSON file
echo "Creating contract addresses JSON file..."
cat > contract-addresses.json << EOF
{
  "tokens": {
    "dragon": "${DRAGON_ADDRESS:-"0x0000000000000000000000000000000000000000"}"
  },
  "vrf": {
    "validator": "${VRF_VALIDATOR_ADDRESS:-"0x0000000000000000000000000000000000000000"}",
    "coordinator": "0x3Ba925fdeAe6B46d0BB4d424D829982Cb2F7309e"
  },
  "lottery": {
    "dragonLotterySwap": "${LOTTERY_SWAP_ADDRESS:-"0x0000000000000000000000000000000000000000"}",
    "goldScratcher": "${GOLD_SCRATCHER_ADDRESS:-"0x0000000000000000000000000000000000000000"}"
  },
  "whitelist": {
    "delayedEntryCompensation": "${COMPENSATION_ADDRESS:-"0x0000000000000000000000000000000000000000"}"
  },
  "utility": {
    "jackpotVault": "${JACKPOT_VAULT_ADDRESS:-"0x0000000000000000000000000000000000000000"}",
    "redEnvelopes": "${RED_ENVELOPES_ADDRESS:-"0x0000000000000000000000000000000000000000"}"
  },
  "constants": {
    "chainId": 146,
    "rpcUrl": "https://rpc.soniclabs.com"
  }
}
EOF

# Store contract addresses in Secret Manager
echo "Storing contract addresses in Secret Manager..."
gcloud secrets create dragon-contracts --replication-policy="automatic" 2>/dev/null || echo "Secret dragon-contracts already exists"
gcloud secrets versions add dragon-contracts --data-file=contract-addresses.json

# Store API key and private key in Secret Manager
echo "Storing API key and private key in Secret Manager..."
gcloud secrets create sonicscan-api-key --replication-policy="automatic" 2>/dev/null || echo "Secret sonicscan-api-key already exists"
gcloud secrets versions add sonicscan-api-key --data-file=./deployment-files/api_key.txt 2>/dev/null || echo "API key already stored"

gcloud secrets create dragon-private-key --replication-policy="automatic" 2>/dev/null || echo "Secret dragon-private-key already exists"
gcloud secrets versions add dragon-private-key --data-file=./deployment-files/private_key.txt 2>/dev/null || echo "Private key already stored"

# Setup BigQuery for Analytics
echo "Setting up BigQuery for analytics..."
bq mk --location=US dragon_analytics 2>/dev/null || echo "Dataset dragon_analytics already exists"

# Create schema for whitelist NFTs
cat > whitelist_schema.json << EOF
[
  {"name": "token_id", "type": "INTEGER", "mode": "REQUIRED"},
  {"name": "owner", "type": "STRING", "mode": "REQUIRED"},
  {"name": "original_user", "type": "STRING", "mode": "REQUIRED"},
  {"name": "swap_amount", "type": "NUMERIC", "mode": "REQUIRED", "precision": "38", "scale": "9"},
  {"name": "timestamp", "type": "TIMESTAMP", "mode": "REQUIRED"},
  {"name": "redeemed", "type": "BOOLEAN", "mode": "REQUIRED"},
  {"name": "redemption_timestamp", "type": "TIMESTAMP", "mode": "NULLABLE"}
]
EOF

# Create whitelist NFTs table
bq mk --table dragon_analytics.whitelist_nfts whitelist_schema.json 2>/dev/null || echo "Table whitelist_nfts already exists"

# Create storage bucket for NFT assets
echo "Creating storage bucket for NFT assets..."
gsutil mb -l us-central1 gs://dragon-nft-assets-$project_id 2>/dev/null || echo "Storage bucket dragon-nft-assets-$project_id already exists"

# Create sample NFT images directory if it doesn't exist
mkdir -p deployment-files/sample-nft-images

# Create a placeholder image if none exist
if [ ! "$(ls -A deployment-files/sample-nft-images)" ]; then
  echo "Creating placeholder NFT image..."
  cat > deployment-files/sample-nft-images/placeholder.txt << EOF
This is a placeholder file for NFT images.
Replace with actual image files.
EOF
fi

# Upload sample NFT images if they exist
echo "Uploading sample NFT images to Cloud Storage..."
gsutil -m cp -r deployment-files/sample-nft-images/* gs://dragon-nft-assets-$project_id/whitelist/ || true

# Make bucket publicly accessible for NFT images using a different approach
echo "Making bucket publicly accessible for NFT images..."
gsutil uniformbucketlevelaccess set off gs://dragon-nft-assets-$project_id || true
gsutil defacl ch -u AllUsers:R gs://dragon-nft-assets-$project_id || true

# Setup budget alert
echo "Setting up budget alert..."
# Get the billing account ID - assuming it's linked to the project
BILLING_ACCOUNT_ID=$(gcloud billing projects describe $project_id --format="value(billingAccountName)" | sed 's/billingAccounts\///')

if [ -n "$BILLING_ACCOUNT_ID" ]; then
  echo "Setting up budget alert for billing account $BILLING_ACCOUNT_ID..."
  
  # Create Pub/Sub topic for budget alerts if it doesn't exist
  gcloud pubsub topics create budget-alerts --project=$project_id 2>/dev/null || echo "Pub/Sub topic already exists"
  
  # Create budget with $20 USD limit and alerts at 50% and 90%
  gcloud billing budgets create \
    --billing-account=$BILLING_ACCOUNT_ID \
    --display-name="Dragon Ecosystem Budget" \
    --budget-amount=20USD \
    --threshold-rules=threshold-percent=0.5 \
    --threshold-rules=threshold-percent=0.9 \
    --all-updates-rule-pubsub-topic=projects/$project_id/topics/budget-alerts 2>/dev/null || echo "Budget alert already exists or could not be created. You can set this up manually later."
else
  echo "No billing account found. Skipping budget setup."
fi

echo "Simplified Dragon Ecosystem deployment on GCP completed successfully!"
echo "Project ID: $project_id"
echo ""
echo "Next steps:"
echo "1. Deploy your smart contracts to Sonic chain"
echo "2. Update the contract-addresses.json file with deployed addresses"
echo "3. Update the secret: 'gcloud secrets versions add dragon-contracts --data-file=contract-addresses.json'"
echo "4. Upload NFT assets to Cloud Storage bucket: gs://dragon-nft-assets-$project_id"
echo "5. For the NFT metadata service and VRF monitoring, consider deploying those on a Compute Engine VM instance instead" 