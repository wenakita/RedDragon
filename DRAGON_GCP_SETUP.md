# Google Cloud Platform Setup Guide for Dragon Ecosystem

This guide provides detailed steps for setting up the Google Cloud Platform (GCP) environment required for the Dragon ecosystem deployment.

## Prerequisites

- Google Cloud account
- Billing enabled on your GCP account
- Local Google Cloud SDK installation
- Project contracts already deployed to the blockchain

## 1. Initial Setup and Authentication

```bash
# Install Google Cloud SDK (if not already installed)
# For Ubuntu/Debian:
sudo apt-get update && sudo apt-get install apt-transport-https ca-certificates gnupg
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
sudo apt-get update && sudo apt-get install google-cloud-sdk

# Initialize and authenticate
gcloud init
# Follow the prompts to log in and select your project
```

## 2. Create and Configure GCP Project

```bash
# Create a new GCP project
gcloud projects create dragon-ecosystem --name="Dragon Ecosystem"

# Set the new project as the current project
gcloud config set project dragon-ecosystem

# Enable required APIs
gcloud services enable compute.googleapis.com \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    secretmanager.googleapis.com \
    cloudfunctions.googleapis.com \
    bigquery.googleapis.com \
    pubsub.googleapis.com \
    cloudscheduler.googleapis.com \
    artifactregistry.googleapis.com \
    storage-api.googleapis.com \
    eventarc.googleapis.com \
    logging.googleapis.com \
    monitoring.googleapis.com
```

## 3. Set Up Secret Management

### 3.1 Create and Store Contract Secrets

```bash
# Create a JSON file with all contract addresses
cat > contract-addresses.json << EOF
{
  "dragon": "0x...",
  "vrfValidator": "0x...",
  "delayedEntryCompensation": "0x...",
  "dragonLotterySwap": "0x...",
  "goldScratcher": "0x...",
  "promotionalItemRegistry": "0x...",
  "ve69LP": "0x...",
  "ve69LPFeeDistributor": "0x...",
  "dragonExchangePair": "0x...",
  "dragonJackpotVault": "0x...",
  "dragonLPBooster": "0x...",
  "dragonBeetsAdapter": "0x...",
  "redEnvelopes": "0x..."
}
EOF

# Create the secret
gcloud secrets create dragon-contracts --replication-policy="automatic"

# Add the version with contract addresses
gcloud secrets versions add dragon-contracts --data-file=contract-addresses.json

# Store private key for transactions (HANDLE WITH CARE)
echo "YOUR_PRIVATE_KEY" > private-key.txt
gcloud secrets create deployment-key --replication-policy="automatic" 
gcloud secrets versions add deployment-key --data-file=private-key.txt
rm private-key.txt  # Remove the file to prevent accidental exposure
```

### 3.2 Set Up Service Accounts

```bash
# Create service account for API services
gcloud iam service-accounts create dragon-api-sa \
    --display-name="Dragon API Service Account"

# Create service account for monitoring
gcloud iam service-accounts create dragon-monitoring-sa \
    --display-name="Dragon Monitoring Service Account"

# Grant secret access to service accounts
gcloud secrets add-iam-policy-binding dragon-contracts \
    --member="serviceAccount:dragon-api-sa@dragon-ecosystem.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding dragon-contracts \
    --member="serviceAccount:dragon-monitoring-sa@dragon-ecosystem.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding deployment-key \
    --member="serviceAccount:dragon-api-sa@dragon-ecosystem.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

## 4. Deploy Frontend

### 4.1 Create Storage Bucket for Frontend

```bash
# Create storage bucket
gsutil mb -l us-central1 gs://dragon-frontend

# Configure for website hosting
gsutil web set -m index.html -e 404.html gs://dragon-frontend

# Upload frontend files (after building)
cd frontend
npm run build
gsutil -h "Cache-Control:public,max-age=31536000" cp -r build/static/* gs://dragon-frontend/static/
gsutil -h "Cache-Control:no-store" cp build/*.html gs://dragon-frontend/
gsutil -m cp -r build/* gs://dragon-frontend/

# Make bucket publicly accessible
gsutil iam ch allUsers:objectViewer gs://dragon-frontend
```

### 4.2 Set Up Cloud CDN (Optional but Recommended)

```bash
# Create backend bucket
gcloud compute backend-buckets create dragon-frontend-backend \
    --gcs-bucket-name=dragon-frontend \
    --enable-cdn

# Create URL map
gcloud compute url-maps create dragon-frontend-url-map \
    --default-backend-bucket=dragon-frontend-backend

# Create HTTPS proxy
gcloud compute ssl-certificates create dragon-ssl-cert \
    --domains=app.sonicreddragon.io

gcloud compute target-https-proxies create dragon-https-proxy \
    --url-map=dragon-frontend-url-map \
    --ssl-certificates=dragon-ssl-cert

# Create forwarding rule
gcloud compute forwarding-rules create dragon-https-forwarding-rule \
    --target-https-proxy=dragon-https-proxy \
    --global \
    --ports=443
```

## 5. Deploy Backend Services

### 5.1 NFT Metadata Service

```bash
# Deploy Cloud Run service for NFT metadata
cd metadata-service
gcloud run deploy whitelist-metadata \
    --source=. \
    --region=us-central1 \
    --platform=managed \
    --allow-unauthenticated \
    --service-account=dragon-api-sa@dragon-ecosystem.iam.gserviceaccount.com \
    --set-secrets=CONTRACTS=dragon-contracts:latest \
    --set-env-vars="RPC_URL=https://rpc.soniclabs.com,CHAIN_ID=64165"

# Map custom domain (if applicable)
gcloud run domain-mappings create \
    --service=whitelist-metadata \
    --domain=metadata.sonicreddragon.io \
    --region=us-central1
```

### 5.2 Main API Service

```bash
# Deploy Cloud Run service for main API
cd api-service
gcloud run deploy dragon-api \
    --source=. \
    --region=us-central1 \
    --platform=managed \
    --allow-unauthenticated \
    --service-account=dragon-api-sa@dragon-ecosystem.iam.gserviceaccount.com \
    --set-secrets=CONTRACTS=dragon-contracts:latest,PRIVATE_KEY=deployment-key:latest \
    --set-env-vars="RPC_URL=https://rpc.soniclabs.com,CHAIN_ID=64165"

# Map custom domain (if applicable)
gcloud run domain-mappings create \
    --service=dragon-api \
    --domain=api.sonicreddragon.io \
    --region=us-central1
```

### 5.3 Red Envelopes Service

```bash
# Deploy Cloud Run service for Red Envelopes
cd red-envelopes-service
gcloud run deploy red-envelopes-api \
    --source=. \
    --region=us-central1 \
    --platform=managed \
    --allow-unauthenticated \
    --service-account=dragon-api-sa@dragon-ecosystem.iam.gserviceaccount.com \
    --set-secrets=CONTRACTS=dragon-contracts:latest \
    --set-env-vars="RPC_URL=https://rpc.soniclabs.com,CHAIN_ID=64165"
```

## 6. Set Up Monitoring and Analytics

### 6.1 Create BigQuery Dataset and Tables

```bash
# Create dataset
bq mk --location=US dragon_analytics

# Create tables (using schema definition files)
bq mk --table dragon_analytics.whitelist_nfts schemas/whitelist_nfts_schema.json
bq mk --table dragon_analytics.vrf_outages schemas/vrf_outages_schema.json
bq mk --table dragon_analytics.red_envelopes schemas/red_envelopes_schema.json
bq mk --table dragon_analytics.token_transfers schemas/token_transfers_schema.json
bq mk --table dragon_analytics.lottery_entries schemas/lottery_entries_schema.json
```

### 6.2 Set Up Event Monitoring

```bash
# Create Pub/Sub topic for events
gcloud pubsub topics create dragon-events

# Deploy Cloud Function for event monitoring
cd monitoring-function
gcloud functions deploy monitor-contract-events \
    --gen2 \
    --runtime=nodejs18 \
    --region=us-central1 \
    --source=. \
    --entry-point=monitorEvents \
    --trigger-http \
    --service-account=dragon-monitoring-sa@dragon-ecosystem.iam.gserviceaccount.com \
    --set-secrets=CONTRACTS=dragon-contracts:latest \
    --set-env-vars="RPC_URL=https://rpc.soniclabs.com,CHAIN_ID=64165,PUBSUB_TOPIC=dragon-events"

# Create Cloud Scheduler job to trigger monitoring
gcloud scheduler jobs create http monitor-contracts \
    --schedule="every 5 minutes" \
    --uri="https://us-central1-dragon-ecosystem.cloudfunctions.net/monitor-contract-events" \
    --http-method=POST \
    --oidc-service-account=dragon-monitoring-sa@dragon-ecosystem.iam.gserviceaccount.com
```

### 6.3 Set Up Red Envelope Expiration Check

```bash
# Deploy Cloud Function for envelope expiration check
cd envelope-checker-function
gcloud functions deploy check-expired-envelopes \
    --gen2 \
    --runtime=nodejs18 \
    --region=us-central1 \
    --source=. \
    --entry-point=checkExpiredEnvelopes \
    --trigger-http \
    --service-account=dragon-api-sa@dragon-ecosystem.iam.gserviceaccount.com \
    --set-secrets=CONTRACTS=dragon-contracts:latest,PRIVATE_KEY=deployment-key:latest \
    --set-env-vars="RPC_URL=https://rpc.soniclabs.com,CHAIN_ID=64165"

# Create Cloud Scheduler job to check expired envelopes
gcloud scheduler jobs create http check-expired-envelopes \
    --schedule="every 1 hours" \
    --uri="https://us-central1-dragon-ecosystem.cloudfunctions.net/check-expired-envelopes" \
    --http-method=POST \
    --oidc-service-account=dragon-api-sa@dragon-ecosystem.iam.gserviceaccount.com
```

### 6.4 Set Up BigQuery Export

```bash
# Create Pub/Sub subscription that pushes to BigQuery
gcloud pubsub subscriptions create events-to-bigquery \
    --topic=dragon-events \
    --bigquery-table=dragon-ecosystem:dragon_analytics.events \
    --use-topic-schema \
    --write-metadata
```

## 7. Set Up Alerting

```bash
# Create notification channels (email)
gcloud alpha monitoring channels create \
    --display-name="Dragon Ops Email" \
    --type=email \
    --channel-labels=email_address=ops@sonicreddragon.io

# Create alert policy for VRF outages
gcloud alpha monitoring policies create \
    --display-name="VRF Outage Alert" \
    --conditions="condition-type=metric, filter='metric.type=\"logging.googleapis.com/user/vrf_outage\" resource.type=\"cloud_function\"', threshold-value=0, comparison=COMPARISON_GT, duration=300s" \
    --notification-channels=CHANNEL_ID \
    --combiner=OR
```

## 8. Final Security Configuration

```bash
# Set up Cloud Armor security policy (optional)
gcloud compute security-policies create dragon-security-policy \
    --description="Protection for Dragon endpoints"

# Add rules for DDoS protection
gcloud compute security-policies rules create 1000 \
    --security-policy=dragon-security-policy \
    --description="Block XSS attacks" \
    --expression="evaluatePreconfiguredExpr('xss-stable')" \
    --action="deny-403"

# Apply security policy to load balancer (if created)
gcloud compute backend-services update dragon-backend-service \
    --security-policy=dragon-security-policy
```

## Verification Checklist

- [ ] Frontend is accessible and correctly displays contract data
- [ ] NFT metadata service returns correct data for Whitelist Dragon NFTs
- [ ] Main API successfully interacts with contracts
- [ ] Event monitoring is capturing contract events
- [ ] Data is flowing into BigQuery tables
- [ ] Red Envelope expiration check is working
- [ ] Alerts are being triggered appropriately

## Troubleshooting

- Check Cloud Run logs: `gcloud logs read --limit=50 --project=dragon-ecosystem`
- Check function logs: `gcloud functions logs read monitor-contract-events --project=dragon-ecosystem`
- Test secret access: `gcloud run services describe dragon-api --region=us-central1 --format="value(spec.template.spec.containers[0].env)"` 