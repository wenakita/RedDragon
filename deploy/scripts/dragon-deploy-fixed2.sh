#!/bin/bash
# Dragon Ecosystem GCP Deployment Script

# Exit on error
set -e

# Check if continuing from a previous run
CONTINUE=false
if [ "$1" == "--continue" ]; then
  CONTINUE=true
  echo "Continuing from previous run..."
fi

echo "Starting Dragon Ecosystem GCP Deployment..."

# Step 1: Setup GCP Project
if [ "$CONTINUE" = false ]; then
  echo "Setting up GCP Project..."
  timestamp=$(date +%Y%m%d%H%M)
  project_id="dragon-ecosystem-${timestamp}"
  echo "Using project ID: ${project_id}"

  # Create project
  echo "Creating project $project_id..."
  gcloud projects create $project_id --name="Dragon Ecosystem"

  # Set as current project
  gcloud config set project $project_id

  echo "Project created. You need to link a billing account before continuing."
  echo "Run './add-billing.sh' to link a billing account, then run this script with --continue option."
  exit 0
else
  # Get current project
  project_id=$(gcloud config get-value project)
  echo "Using existing project: $project_id"
  
  # Verify billing is enabled before proceeding
  echo "Verifying billing account status..."
  BILLING_INFO=$(gcloud billing projects describe $project_id 2>/dev/null || echo "NOT_FOUND")
  
  if [[ "$BILLING_INFO" == *"NOT_FOUND"* || "$BILLING_INFO" != *"billingEnabled: true"* ]]; then
    echo "ERROR: Billing account is not enabled for this project."
    echo "Please link a billing account using one of these methods:"
    echo "1. Run './add-billing.sh' to link a billing account through the command line"
    echo "2. Follow the manual steps in 'manual-billing-setup.md'"
    exit 1
  fi
  
  echo "Billing account verified. Proceeding with deployment..."
fi

# Step 2: Enable required APIs
echo "Enabling required APIs..."
echo "This may take a few minutes..."

# Enable APIs one by one to better handle errors
echo "Enabling Compute Engine API..."
gcloud services enable compute.googleapis.com

echo "Enabling Cloud Run API..."
gcloud services enable run.googleapis.com

echo "Enabling Secret Manager API..."
gcloud services enable secretmanager.googleapis.com

echo "Enabling Cloud Functions API..."
gcloud services enable cloudfunctions.googleapis.com

echo "Enabling BigQuery API..."
gcloud services enable bigquery.googleapis.com

echo "Enabling Pub/Sub API..."
gcloud services enable pubsub.googleapis.com

echo "Enabling Cloud Scheduler API..."
gcloud services enable cloudscheduler.googleapis.com

echo "Enabling Artifact Registry API..."
gcloud services enable artifactregistry.googleapis.com

echo "Enabling Storage API..."
gcloud services enable storage-api.googleapis.com

# Step 4: Store secrets
echo "Storing secrets in Secret Manager..."
# Store API key and private key from deployment-files directory
gcloud secrets describe sonicscan-api-key >/dev/null 2>&1 || \
  gcloud secrets create sonicscan-api-key --replication-policy="automatic"
gcloud secrets versions add sonicscan-api-key --data-file=./deployment-files/api_key.txt

gcloud secrets describe dragon-private-key >/dev/null 2>&1 || \
  gcloud secrets create dragon-private-key --replication-policy="automatic"
gcloud secrets versions add dragon-private-key --data-file=./deployment-files/private_key.txt

# Step 5: Create contract addresses JSON file
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

