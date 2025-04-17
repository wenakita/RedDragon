# Dragon Ecosystem GCP Setup Guide

This practical guide walks through the implementation of the Dragon ecosystem on Google Cloud Platform, with specific examples tailored to your smart contracts.

## Project Setup Process

### Step 1: Create Your Project and Enable Billing

```bash
# Create the project
gcloud projects create dragon-ecosystem --name="Dragon Ecosystem"

# Set as current project
gcloud config set project dragon-ecosystem

# Link your billing account (required for most GCP services)
gcloud billing projects link dragon-ecosystem --billing-account=YOUR_BILLING_ACCOUNT_ID
```

**Important:** You'll need a billing account before enabling most services. You can view your billing accounts with:
```bash
gcloud billing accounts list
```

### Step 2: Enable Required Services

```bash
# Enable core services (run this as a single command)
gcloud services enable compute.googleapis.com \
    run.googleapis.com \
    secretmanager.googleapis.com \
    cloudfunctions.googleapis.com \
    bigquery.googleapis.com \
    pubsub.googleapis.com \
    cloudscheduler.googleapis.com \
    artifactregistry.googleapis.com \
    storage-api.googleapis.com
```

## Secure Contract Storage Implementation

### Step 1: Organize Contract Addresses JSON

Create a structured contract addresses file that makes services easier to maintain:

```bash
cat > contract-addresses.json << EOF
{
  "tokens": {
    "dragon": "0x0000...your_deployed_address"
  },
  "vrf": {
    "validator": "0x0000...your_deployed_address",
    "coordinator": "0x3Ba925fdeAe6B46d0BB4d424D829982Cb2F7309e"
  },
  "lottery": {
    "dragonLotterySwap": "0x0000...your_deployed_address",
    "goldScratcher": "0x0000...your_deployed_address"
  },
  "whitelist": {
    "delayedEntryCompensation": "0x0000...your_deployed_address"
  },
  "ve69LP": {
    "ve69LP": "0x0000...your_deployed_address",
    "feeDistributor": "0x0000...your_deployed_address"
  },
  "utility": {
    "jackpotVault": "0x0000...your_deployed_address",
    "lpBooster": "0x0000...your_deployed_address",
    "beetsAdapter": "0x0000...your_deployed_address", 
    "exchangePair": "0x0000...your_deployed_address",
    "redEnvelopes": "0x0000...your_deployed_address",
    "promotionalItemRegistry": "0x0000...your_deployed_address"
  },
  "constants": {
    "chainId": 64165,
    "rpcUrl": "https://rpc.soniclabs.com"
  }
}
EOF
```

### Step 2: Create Service Accounts With Least Privilege

```bash
# Create service accounts with specific purposes
gcloud iam service-accounts create dragon-metadata-sa \
    --display-name="Dragon NFT Metadata Service"

gcloud iam service-accounts create dragon-monitoring-sa \
    --display-name="Dragon Monitoring Service"

gcloud iam service-accounts create dragon-tx-executor-sa \
    --display-name="Dragon Transaction Executor"
```

**Security Best Practice:** Create dedicated service accounts for each function that requires different permissions.

### Step 3: Store Secrets with Appropriate Permissions

```bash
# Create and store the contract addresses
gcloud secrets create dragon-contracts --replication-policy="automatic"
gcloud secrets versions add dragon-contracts --data-file=contract-addresses.json

# Create admin secret for services that need to send transactions
gcloud secrets create dragon-private-key --replication-policy="automatic" 
echo "YOUR_PRIVATE_KEY" | gcloud secrets versions add dragon-private-key --data-file=- 

# Apply granular permissions - metadata service only needs read access to contract data
gcloud secrets add-iam-policy-binding dragon-contracts \
    --member="serviceAccount:dragon-metadata-sa@dragon-ecosystem.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

# Transaction executor needs both contracts and private key
gcloud secrets add-iam-policy-binding dragon-private-key \
    --member="serviceAccount:dragon-tx-executor-sa@dragon-ecosystem.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

## Metadata Service Implementation

The NFT metadata service is critical for ensuring your Whitelist Dragon NFTs display correctly in wallets.

### Step 1: Create a Basic Metadata Service Structure

```
metadata-service/
├── package.json
├── index.js
├── src/
│   ├── app.js
│   ├── controllers/
│   │   └── metadata.js
│   ├── services/
│   │   └── contract.js
│   └── utils/
│       └── secretManager.js
└── test/
    └── metadata.test.js
```

### Step 2: Implement Metadata Controller

Here's a simplified implementation example:

```javascript
// src/controllers/metadata.js
const { getContractAddresses } = require('../utils/secretManager');
const { getMetadataForToken } = require('../services/contract');

// Handler for /token/:id requests
exports.getTokenMetadata = async (req, res) => {
  try {
    const tokenId = req.params.id;
    const addresses = await getContractAddresses();
    
    // Use contract service to get NFT details from blockchain
    const tokenData = await getMetadataForToken(
      addresses.whitelist.delayedEntryCompensation,
      tokenId
    );
    
    // Format as standard ERC721 metadata
    const metadata = {
      name: `Whitelist Dragon #${tokenId}`,
      description: 'A Whitelist Dragon NFT from the Dragon ecosystem.',
      image: `https://storage.googleapis.com/dragon-nft-assets/whitelist/${tokenId}.png`,
      attributes: [
        { trait_type: 'Original User', value: tokenData.originalUser },
        { trait_type: 'Swap Amount', value: tokenData.swapAmount },
        { trait_type: 'Creation Date', value: tokenData.timestamp },
        { trait_type: 'Redeemed', value: tokenData.redeemed ? 'Yes' : 'No' }
      ]
    };
    
    res.status(200).json(metadata);
  } catch (error) {
    console.error(`Error serving metadata for token ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to retrieve token metadata' });
  }
};
```

### Step 3: Deploy the Metadata Service

```bash
cd metadata-service

# Deploy to Cloud Run with optimized settings
gcloud run deploy whitelist-metadata \
    --source=. \
    --region=us-central1 \
    --platform=managed \
    --memory=512Mi \
    --concurrency=80 \
    --min-instances=1 \
    --max-instances=10 \
    --allow-unauthenticated \
    --service-account=dragon-metadata-sa@dragon-ecosystem.iam.gserviceaccount.com \
    --set-secrets=CONTRACTS=dragon-contracts:latest \
    --set-env-vars="NODE_ENV=production"

# Configure domain mapping for the NFT standard
gcloud run domain-mappings create \
    --service=whitelist-metadata \
    --domain=white.sonicreddragon.io \
    --region=us-central1
```

**Performance Optimization:** Setting min-instances=1 keeps one instance always warm, reducing cold start issues for NFT display in wallets.

## Event Monitoring and Analytics Implementation

### Step 1: Create Analytics Tables with Appropriate Schema

Create schema files for each data type:

```bash
cat > schemas/whitelist_nfts_schema.json << EOF
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

# Create dataset and tables
bq mk --location=US dragon_analytics
bq mk --table dragon_analytics.whitelist_nfts schemas/whitelist_nfts_schema.json
```

### Step 2: Implement Event Monitoring Function

Create a Cloud Function that monitors blockchain events:

```javascript
// monitor-events/index.js
const { ethers } = require('ethers');
const { PubSub } = require('@google-cloud/pubsub');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const secretClient = new SecretManagerServiceClient();
const pubsub = new PubSub();

// Monitor for whitelist-related events
exports.monitorEvents = async (req, res) => {
  try {
    // Get contract addresses from Secret Manager
    const contractsSecret = await secretClient.accessSecretVersion({
      name: 'projects/dragon-ecosystem/secrets/dragon-contracts/versions/latest'
    });
    const contracts = JSON.parse(contractsSecret[0].payload.data.toString());
    
    // Connect to blockchain
    const provider = new ethers.providers.JsonRpcProvider(contracts.constants.rpcUrl);
    
    // Set up contract interfaces
    const WhitelistContract = new ethers.Contract(
      contracts.whitelist.delayedEntryCompensation,
      ['event DelayedEntryRegistered(address indexed user, uint256 swapAmount, uint256 entryIndex, uint256 tokenId)'],
      provider
    );
    
    // Get events from the last block
    const lastBlock = await provider.getBlockNumber();
    const fromBlock = lastBlock - 100; // Look back 100 blocks
    
    // Get whitelist events
    const whitelistEvents = await WhitelistContract.queryFilter(
      WhitelistContract.filters.DelayedEntryRegistered(),
      fromBlock,
      'latest'
    );
    
    // Process events and publish to Pub/Sub
    const topic = pubsub.topic('dragon-events');
    
    for (const event of whitelistEvents) {
      const eventData = {
        eventType: 'DelayedEntryRegistered',
        user: event.args.user,
        swapAmount: event.args.swapAmount.toString(),
        entryIndex: event.args.entryIndex.toString(),
        tokenId: event.args.tokenId.toString(),
        blockNumber: event.blockNumber,
        timestamp: (await provider.getBlock(event.blockNumber)).timestamp,
        transactionHash: event.transactionHash
      };
      
      // Publish to Pub/Sub for BigQuery insertion
      await topic.publish(Buffer.from(JSON.stringify(eventData)));
      
      console.log(`Published event: ${eventData.eventType}, TokenID: ${eventData.tokenId}`);
    }
    
    res.status(200).send(`Processed ${whitelistEvents.length} whitelist events`);
  } catch (error) {
    console.error('Error monitoring events:', error);
    res.status(500).send('Failed to monitor events');
  }
};
```

### Step 3: Deploy Monitoring Function and Schedule It

```bash
cd monitor-events

gcloud functions deploy monitor-whitelist-events \
    --gen2 \
    --runtime=nodejs18 \
    --region=us-central1 \
    --source=. \
    --entry-point=monitorEvents \
    --trigger-http \
    --memory=256Mi \
    --timeout=60s \
    --service-account=dragon-monitoring-sa@dragon-ecosystem.iam.gserviceaccount.com \
    --set-secrets=CONTRACTS=dragon-contracts:latest

# Create scheduler to run every 5 minutes
gcloud scheduler jobs create http monitor-whitelist-events-job \
    --schedule="*/5 * * * *" \
    --uri="https://us-central1-dragon-ecosystem.cloudfunctions.net/monitor-whitelist-events" \
    --http-method=POST \
    --oidc-service-account=dragon-monitoring-sa@dragon-ecosystem.iam.gserviceaccount.com \
    --time-zone="UTC"
```

## Red Envelope Service Deployment

### Step 1: Deploy the Red Envelope API

```bash
cd red-envelope-service

gcloud run deploy red-envelope-api \
    --source=. \
    --region=us-central1 \
    --platform=managed \
    --memory=1Gi \
    --concurrency=50 \
    --allow-unauthenticated \
    --service-account=dragon-api-sa@dragon-ecosystem.iam.gserviceaccount.com \
    --set-secrets=CONTRACTS=dragon-contracts:latest \
    --set-env-vars="RPC_URL=https://rpc.soniclabs.com,CHAIN_ID=64165"
```

### Step 2: Create Envelope Expiration Checker

```bash
cd envelope-checker

# Deploy function with transaction capability
gcloud functions deploy check-expired-envelopes \
    --gen2 \
    --runtime=nodejs18 \
    --region=us-central1 \
    --source=. \
    --entry-point=checkExpiredEnvelopes \
    --trigger-http \
    --service-account=dragon-tx-executor-sa@dragon-ecosystem.iam.gserviceaccount.com \
    --set-secrets=CONTRACTS=dragon-contracts:latest,PRIVATE_KEY=dragon-private-key:latest \
    --set-env-vars="RPC_URL=https://rpc.soniclabs.com,CHAIN_ID=64165"

# Schedule to run hourly
gcloud scheduler jobs create http check-expired-envelopes-job \
    --schedule="0 * * * *" \
    --uri="https://us-central1-dragon-ecosystem.cloudfunctions.net/check-expired-envelopes" \
    --http-method=POST \
    --oidc-service-account=dragon-tx-executor-sa@dragon-ecosystem.iam.gserviceaccount.com
```

## Managing VRF Outages

### Step 1: Create a VRF Monitoring Function

This function checks the PaintSwap VRF status and alerts on outages:

```javascript
// vrf-monitor/index.js
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
      name: 'projects/dragon-ecosystem/secrets/dragon-contracts/versions/latest'
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
    
    // If inactive for more than 10 minutes, create a metric for alerting
    if (!isActive && outageDuration > 600) {
      const metric = {
        resource: {
          type: 'cloud_function',
          labels: {
            function_name: 'monitorVRF',
            region: 'us-central1'
          }
        },
        metric: {
          type: 'logging.googleapis.com/user/vrf_outage',
          labels: {
            severity: 'critical',
            duration_minutes: Math.floor(outageDuration / 60)
          }
        },
        points: [
          {
            interval: {
              endTime: {
                seconds: now
              }
            },
            value: {
              int64Value: 1
            }
          }
        ]
      };
      
      await logging.projectWriteMetrics('dragon-ecosystem', [metric]);
    }
    
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
```

### Step 2: Set Up Alerting for VRF Outages

```bash
# Create notification channel for email
gcloud alpha monitoring channels create \
    --display-name="Dragon Ops Discord Webhook" \
    --type=webhook \
    --channel-labels="url=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL"

# Get the channel ID
CHANNEL_ID=$(gcloud alpha monitoring channels list --format="value(name)" --filter="displayName=Dragon Ops Discord Webhook")

# Create alert policy
gcloud alpha monitoring policies create \
    --display-name="VRF Outage Alert" \
    --user-labels="severity=critical,component=vrf" \
    --conditions="condition-type=metric, filter='metric.type=\"logging.googleapis.com/user/vrf_outage\" resource.type=\"cloud_function\"', threshold-value=0, comparison=COMPARISON_GT, duration=60s" \
    --notification-channels=$CHANNEL_ID \
    --documentation="# VRF Outage Detected\n\nThe PaintSwap VRF coordinator appears to be down or unresponsive. Users swapping during this time will receive Whitelist Dragon NFTs instead of lottery entries. Please check the VRF status and reach out to PaintSwap team if necessary."
```

## Cost Optimization Strategies

To keep your GCP costs manageable:

1. **Set Budget Alerts**
   ```bash
   gcloud billing budgets create \
       --billing-account=YOUR_BILLING_ACCOUNT_ID \
       --display-name="Dragon Ecosystem Budget" \
       --budget-amount=500USD \
       --threshold-rules=threshold-percent=0.5 \
       --threshold-rules=threshold-percent=0.9
   ```

2. **Use Cloud Run Autoscaling Efficiently**
   ```bash
   # Update service with cost-efficient settings
   gcloud run services update whitelist-metadata \
       --min-instances=0 \
       --max-instances=5 \
       --cpu-throttling
   ```

3. **Schedule Non-Critical Functions for Batch Processing**
   ```bash
   # Analytics jobs run less frequently to reduce costs
   gcloud scheduler jobs update http analytics-job \
       --schedule="0 */6 * * *"  # Run every 6 hours instead of continuously
   ```

## Troubleshooting Common Issues

### Issue: Secret Manager Access Problems

Verify service account permissions:
```bash
gcloud projects get-iam-policy dragon-ecosystem \
    --format="table(bindings.role,bindings.members)" \
    --flatten="bindings[].members" \
    --filter="bindings.members:serviceAccount:dragon-api-sa@dragon-ecosystem.iam.gserviceaccount.com"
```

### Issue: Cloud Run Service Failures

Check logs with structured query:
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=whitelist-metadata AND severity>=ERROR" \
    --project=dragon-ecosystem \
    --limit=10
```

### Issue: Network Connectivity to Blockchain

Test RPC connectivity from Cloud Shell:
```bash
curl -X POST https://rpc.soniclabs.com \
    -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
``` 