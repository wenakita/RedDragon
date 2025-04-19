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

# Store contract addresses in Secret Manager
gcloud secrets create dragon-contracts --replication-policy="automatic"
gcloud secrets versions add dragon-contracts --data-file=contract-addresses.json

# Apply permissions for service accounts
gcloud secrets add-iam-policy-binding dragon-contracts \
  --member="serviceAccount:dragon-metadata-sa@$project_id.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding dragon-private-key \
  --member="serviceAccount:dragon-tx-executor-sa@$project_id.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding dragon-contracts \
  --member="serviceAccount:dragon-tx-executor-sa@$project_id.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Step 6: Deploy NFT Metadata Service
echo "Deploying NFT Metadata Service..."
# Create a source directory for the metadata service
mkdir -p metadata-service/src

# Create a basic package.json file
cat > metadata-service/package.json << EOF
{
  "name": "dragon-metadata-service",
  "version": "1.0.0",
  "description": "NFT Metadata service for Dragon Ecosystem",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "ethers": "^5.7.2",
    "@google-cloud/secret-manager": "^4.1.3"
  }
}
EOF

# Create the metadata service main file
cat > metadata-service/src/index.js << 'EOF'
const express = require('express');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { ethers } = require('ethers');

const secretClient = new SecretManagerServiceClient();
const app = express();
const PORT = process.env.PORT || 8080;

// Function to get contract addresses from Secret Manager
async function getContractAddresses() {
  try {
    const name = `projects/${process.env.GOOGLE_CLOUD_PROJECT}/secrets/dragon-contracts/versions/latest`;
    const [version] = await secretClient.accessSecretVersion({ name });
    return JSON.parse(version.payload.data.toString());
  } catch (error) {
    console.error('Error accessing secret:', error);
    throw error;
  }
}

// Metadata endpoint for Whitelist Dragon NFTs
app.get('/white/:tokenId', async (req, res) => {
  try {
    const tokenId = req.params.tokenId;
    const addresses = await getContractAddresses();
    
    // Placeholder for actual contract interaction
    // In a real implementation, we would fetch token data from the blockchain
    
    const metadata = {
      name: `Whitelist Dragon #${tokenId}`,
      description: 'A Whitelist Dragon NFT from the Dragon ecosystem.',
      image: `https://storage.googleapis.com/dragon-nft-assets-${process.env.GOOGLE_CLOUD_PROJECT}/whitelist/${tokenId}.png`,
      attributes: [
        { trait_type: 'Token ID', value: tokenId },
        { trait_type: 'Type', value: 'Whitelist Dragon' }
      ]
    };
    
    res.status(200).json(metadata);
  } catch (error) {
    console.error(`Error serving metadata for token ${req.params.tokenId}:`, error);
    res.status(500).json({ error: 'Failed to retrieve token metadata' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`Metadata service listening on port ${PORT}`);
});
EOF

# Deploy the metadata service to Cloud Run
echo "Deploying to Cloud Run. This may take several minutes..."
gcloud run deploy whitelist-metadata \
  --source=./metadata-service \
  --region=us-central1 \
  --platform=managed \
  --memory=512Mi \
  --concurrency=80 \
  --min-instances=1 \
  --max-instances=10 \
  --allow-unauthenticated \
  --service-account=dragon-metadata-sa@$project_id.iam.gserviceaccount.com

# Step 7: Setup BigQuery for Analytics
echo "Setting up BigQuery for analytics..."
bq mk --location=US dragon_analytics

# Create schema for whitelist NFTs
cat > whitelist_schema.json << EOF
[
  {"name": "token_id", "type": "INTEGER", "mode": "REQUIRED"},
  {"name": "owner", "type": "STRING", "mode": "REQUIRED"},
  {"name": "original_user", "type": "STRING", "mode": "REQUIRED"},
  {"name": "swap_amount", "type": "NUMERIC", "mode": "REQUIRED", "precision": "38", "scale": "18"},
  {"name": "timestamp", "type": "TIMESTAMP", "mode": "REQUIRED"},
  {"name": "redeemed", "type": "BOOLEAN", "mode": "REQUIRED"},
  {"name": "redemption_timestamp", "type": "TIMESTAMP", "mode": "NULLABLE"}
]
EOF

# Create whitelist NFTs table
bq mk --table dragon_analytics.whitelist_nfts whitelist_schema.json

# Step 8: Setup VRF Monitoring
echo "Setting up VRF monitoring..."
mkdir -p vrf-monitor

# Create package.json for VRF monitor
cat > vrf-monitor/package.json << EOF
{
  "name": "vrf-monitor",
  "version": "1.0.0",
  "description": "Monitors VRF status for Dragon ecosystem",
  "main": "index.js",
  "dependencies": {
    "ethers": "^5.7.2",
    "@google-cloud/secret-manager": "^4.1.3",
    "@google-cloud/logging": "^9.8.1"
  }
}
EOF

# Create VRF monitoring function
cat > vrf-monitor/index.js << 'EOF'
const { ethers } = require('ethers');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { Logging } = require('@google-cloud/logging');

const secretClient = new SecretManagerServiceClient();
const logging = new Logging();
const log = logging.log('vrf-outages');

// Interface for checking VRF
const VRF_INTERFACE = [
  'function lastResponseTime() external view returns (uint256)',
  'function isActive() external view returns (bool)'
];

exports.monitorVRF = async (req, res) => {
  try {
    // Get contract addresses
    const contractsSecret = await secretClient.accessSecretVersion({
      name: \`projects/\${process.env.GOOGLE_CLOUD_PROJECT}/secrets/dragon-contracts/versions/latest\`
    });
    const contracts = JSON.parse(contractsSecret[0].payload.data.toString());
    
    // Connect to blockchain
    const provider = new ethers.providers.JsonRpcProvider(contracts.constants.rpcUrl);
    
    // Connect to VRF
    const validator = new ethers.Contract(contracts.vrf.validator, VRF_INTERFACE, provider);
    
    // Check VRF status
    const isActive = await validator.isActive();
    const lastResponse = await validator.lastResponseTime();
    const now = Math.floor(Date.now() / 1000);
    
    // Calculate outage duration if any
    const outageDuration = isActive ? 0 : now - lastResponse.toNumber();
    
    // Log status
    const metadata = {
      resource: {
        type: 'cloud_function',
        labels: {
          function_name: 'monitorVRF',
          region: 'us-central1'
        }
      },
      severity: isActive ? 'INFO' : 'WARNING'
    };
    
    const logData = {
      vrf_status: isActive ? 'active' : 'inactive',
      last_response_time: new Date(lastResponse.toNumber() * 1000).toISOString(),
      outage_duration_seconds: outageDuration,
      timestamp: new Date().toISOString()
    };
    
    // Write to custom log
    const entry = log.entry(metadata, logData);
    await log.write(entry);
    
    res.status(200).json({
      status: isActive ? 'active' : 'inactive',
      lastResponseTime: new Date(lastResponse.toNumber() * 1000).toISOString(),
      outageDurationSeconds: outageDuration
    });
  } catch (error) {
    console.error('Error monitoring VRF:', error);
    res.status(500).send('Failed to monitor VRF');
  }
};
EOF

# Deploy VRF monitoring function
echo "Deploying Cloud Function for VRF monitoring. This may take several minutes..."
gcloud functions deploy monitor-vrf \
  --gen2 \
  --runtime=nodejs18 \
  --region=us-central1 \
  --source=./vrf-monitor \
  --entry-point=monitorVRF \
  --trigger-http \
  --memory=256Mi \
  --timeout=60s \
  --service-account=dragon-monitoring-sa@$project_id.iam.gserviceaccount.com

# Create scheduler to run every 5 minutes
gcloud scheduler jobs create http monitor-vrf-job \
  --schedule="*/5 * * * *" \
  --uri="https://us-central1-$project_id.cloudfunctions.net/monitor-vrf" \
  --http-method=POST \
  --oidc-service-account=dragon-monitoring-sa@$project_id.iam.gserviceaccount.com \
  --time-zone="UTC"

# Step 9: Create storage bucket for NFT assets
echo "Creating storage bucket for NFT assets..."
gsutil mb -l us-central1 gs://dragon-nft-assets-$project_id

# Upload sample NFT images if they exist
if [ -d "deployment-files/sample-nft-images" ]; then
  echo "Uploading sample NFT images to Cloud Storage..."
  gsutil -m cp -r deployment-files/sample-nft-images/* gs://dragon-nft-assets-$project_id/whitelist/
fi

# Make bucket publicly accessible for NFT images
gsutil iam ch allUsers:objectViewer gs://dragon-nft-assets-$project_id

# Step 10: Setup budget alert
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
    --all-updates-rule-pubsub-topic=projects/$project_id/topics/budget-alerts || echo "Could not create budget alert. You can set this up manually later."
else
  echo "No billing account found. Skipping budget setup."
fi

echo "Dragon Ecosystem deployment on GCP completed successfully!"
echo "Project ID: $project_id"
echo ""
echo "Next steps:"
echo "1. Deploy your smart contracts to Sonic chain"
echo "2. Update the contract-addresses.json file with deployed addresses"
echo "3. Update the secret: 'gcloud secrets versions add dragon-contracts --data-file=contract-addresses.json'"
echo "4. Upload NFT assets to Cloud Storage bucket: gs://dragon-nft-assets-$project_id"
echo "5. Setup domain mappings for your services if needed" 
