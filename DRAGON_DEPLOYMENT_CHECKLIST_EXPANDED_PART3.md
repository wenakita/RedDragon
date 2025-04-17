# Dragon Ecosystem Deployment Checklist - Part 3

## Cloud Infrastructure Deployment

### 1. Set Up Secret Management

- [ ] Store contract addresses in Secret Manager
  ```bash
  echo '{
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
  }' > contracts.json
  gcloud secrets create dragon-contracts --replication-policy="automatic" --data-file=contracts.json
  ```
  - [ ] Verify the secret was created successfully
  - [ ] Test access to the secret with proper permissions

- [ ] Store deployment private key in Secret Manager
  ```bash
  echo -n "YOUR_PRIVATE_KEY" > private_key.txt
  gcloud secrets create deployment-key --replication-policy="automatic" --data-file=private_key.txt
  rm private_key.txt  # Remove the file to prevent accidental exposure
  ```
  - [ ] Verify the secret was created successfully
  - [ ] Test access with restricted permissions

- [ ] Set up IAM permissions for secrets
  ```bash
  gcloud secrets add-iam-policy-binding dragon-contracts \
    --member="serviceAccount:dragon-service@dragon-ecosystem.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
  
  gcloud secrets add-iam-policy-binding deployment-key \
    --member="serviceAccount:dragon-service@dragon-ecosystem.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
  ```
  - [ ] Verify IAM bindings are set correctly

### 2. Deploy Backend API

- [ ] Create service account for backend API
  ```bash
  gcloud iam service-accounts create dragon-api-sa \
    --display-name="Dragon API Service Account"
  ```
  - [ ] Verify service account creation

- [ ] Prepare backend API code
  ```bash
  cd backend
  npm install
  npm test  # Run unit tests before deployment
  ```
  - [ ] Ensure all tests pass before deployment

- [ ] Create Cloud Run service for backend API
  ```bash
  gcloud run deploy dragon-api \
    --source=./backend \
    --region=us-central1 \
    --allow-unauthenticated \
    --service-account=dragon-api-sa@dragon-ecosystem.iam.gserviceaccount.com \
    --set-secrets=CONTRACTS=dragon-contracts:latest,PRIVATE_KEY=deployment-key:latest \
    --set-env-vars="RPC_URL=https://rpc.soniclabs.com,CHAIN_ID=64165"
  ```
  - [ ] Verify deployment success
  - [ ] Test API endpoints for functionality

- [ ] Verify backend API connectivity
  - [ ] Test that the backend API can access the contract addresses
  - [ ] Test that the backend API can connect to the Sonic RPC
  - [ ] Test that the backend API can interact with the smart contracts
  - [ ] Monitor initial logs for errors

- [ ] Set up Cloud Logging for API
  ```bash
  gcloud logging sinks create dragon-api-logs \
    storage.googleapis.com/dragon-logs \
    --log-filter="resource.type=cloud_run_revision AND resource.labels.service_name=dragon-api"
  ```
  - [ ] Verify logs are being captured

### 3. Deploy Frontend

- [ ] Build frontend application with production configuration
  ```bash
  cd frontend
  npm install
  npm run build:production  # Use production configuration
  ```
  - [ ] Verify build completes without errors
  - [ ] Check for correct contract addresses in build output

- [ ] Create Cloud Storage bucket with proper naming
  ```bash
  # Create bucket with website configuration
  gsutil mb -l us-central1 gs://dragon-frontend-prod
  gsutil web set -m index.html -e 404.html gs://dragon-frontend-prod
  ```
  - [ ] Verify bucket creation and website configuration

- [ ] Upload frontend files with proper caching settings
  ```bash
  # Upload static assets with caching
  gsutil -h "Cache-Control:public,max-age=31536000" cp -r build/static gs://dragon-frontend-prod/static
  
  # Upload HTML and config files with no caching
  gsutil -h "Cache-Control:no-store" cp -r build/*.html build/*.json gs://dragon-frontend-prod/
  
  # Upload remaining files
  gsutil -m cp -r build/* gs://dragon-frontend-prod/
  ```
  - [ ] Verify all files were uploaded successfully

- [ ] Make bucket public with proper IAM settings
  ```bash
  gsutil iam ch allUsers:objectViewer gs://dragon-frontend-prod
  ```
  - [ ] Verify public access works correctly

- [ ] Set up Cloud CDN for frontend (optional but recommended)
  ```bash
  # Create backend bucket linked to the storage bucket
  gcloud compute backend-buckets create dragon-frontend-backend \
    --gcs-bucket-name=dragon-frontend-prod \
    --enable-cdn
  
  # Set up URL map
  gcloud compute url-maps create dragon-frontend-url-map \
    --default-backend-bucket=dragon-frontend-backend
  ```
  - [ ] Verify CDN setup works correctly

### 4. Set Up NFT Metadata Server

- [ ] Prepare metadata server code
  ```bash
  cd metadata-service
  npm install
  npm test  # Run tests before deployment
  ```
  - [ ] Verify tests pass

- [ ] Create Cloud Run service for NFT metadata
  ```bash
  gcloud run deploy whitelist-metadata \
    --source=./metadata-service \
    --region=us-central1 \
    --allow-unauthenticated \
    --set-secrets=CONTRACTS=dragon-contracts:latest \
    --set-env-vars="RPC_URL=https://rpc.soniclabs.com,CHAIN_ID=64165"
  ```
  - [ ] Verify deployment success
  - [ ] Test metadata endpoints

- [ ] Configure domain for metadata service
  ```bash
  # First verify domain ownership
  gcloud domains verify sonicreddragon.io
  
  # Map domain to service
  gcloud run domain-mappings create \
    --service=whitelist-metadata \
    --domain=sonicreddragon.io
  ```
  - [ ] Verify domain mapping works
  - [ ] Test metadata access through domain

- [ ] Set up proper CORS headers
  ```bash
  # This would be configured in the metadata service code
  gcloud run services update whitelist-metadata \
    --set-env-vars="ALLOWED_ORIGINS=https://dragon-frontend-prod.storage.googleapis.com,https://app.sonicreddragon.io"
  ```
  - [ ] Verify CORS headers are working properly

### 5. Deploy Red Envelopes Service

- [ ] Prepare Red Envelopes service code
  ```bash
  cd red-envelopes-service
  npm install
  npm test  # Run tests before deployment
  ```
  - [ ] Verify tests pass

- [ ] Create Cloud Run service for Red Envelopes API
  ```bash
  gcloud run deploy red-envelopes-api \
    --source=./red-envelopes-service \
    --region=us-central1 \
    --allow-unauthenticated \
    --set-secrets=CONTRACTS=dragon-contracts:latest \
    --set-env-vars="RPC_URL=https://rpc.soniclabs.com,CHAIN_ID=64165"
  ```
  - [ ] Verify deployment success
  - [ ] Test Red Envelopes API endpoints

- [ ] Create Cloud Function for envelope expiration
  ```bash
  gcloud functions deploy checkExpiredEnvelopes \
    --runtime=nodejs16 \
    --trigger-http \
    --allow-unauthenticated \
    --source=./functions/envelope-checker \
    --set-secrets=CONTRACTS=dragon-contracts:latest,PRIVATE_KEY=deployment-key:latest
  ```
  - [ ] Verify function deployment
  - [ ] Test function manually

- [ ] Configure Cloud Scheduler for Red Envelope expiration checks
  ```bash
  gcloud scheduler jobs create http check-red-envelopes \
    --schedule="every 1 hours" \
    --uri="https://us-central1-dragon-ecosystem.cloudfunctions.net/checkExpiredEnvelopes" \
    --http-method=POST \
    --oidc-service-account=dragon-api-sa@dragon-ecosystem.iam.gserviceaccount.com
  ```
  - [ ] Verify scheduler job creation
  - [ ] Test scheduled job execution

### 6. Deploy Monitoring Services

- [ ] Create service account for monitoring
  ```bash
  gcloud iam service-accounts create dragon-monitoring-sa \
    --display-name="Dragon Monitoring Service Account"
  ```
  - [ ] Verify service account creation

- [ ] Set up Cloud Functions for contract event monitoring
  ```bash
  gcloud functions deploy monitorDragonEvents \
    --runtime=nodejs16 \
    --trigger-http \
    --allow-unauthenticated \
    --source=./monitoring-function \
    --service-account=dragon-monitoring-sa@dragon-ecosystem.iam.gserviceaccount.com \
    --set-secrets=CONTRACTS=dragon-contracts:latest \
    --set-env-vars="RPC_URL=https://rpc.soniclabs.com,CHAIN_ID=64165"
  ```
  - [ ] Verify function deployment
  - [ ] Test monitoring manually

- [ ] Create Pub/Sub topic for event notifications
  ```bash
  gcloud pubsub topics create dragon-events
  ```
  - [ ] Verify topic creation
  - [ ] Test publishing and subscribing

- [ ] Create Pub/Sub subscription for event processing
  ```bash
  gcloud pubsub subscriptions create process-dragon-events \
    --topic=dragon-events \
    --ack-deadline=60 \
    --message-retention-duration=7d
  ```
  - [ ] Verify subscription creation

- [ ] Set up Cloud Scheduler for regular monitoring
  ```bash
  gcloud scheduler jobs create http monitor-contracts \
    --schedule="every 5 minutes" \
    --uri="https://us-central1-dragon-ecosystem.cloudfunctions.net/monitorDragonEvents" \
    --http-method=POST \
    --oidc-service-account=dragon-monitoring-sa@dragon-ecosystem.iam.gserviceaccount.com
  ```
  - [ ] Verify scheduler job creation
  - [ ] Test scheduled job execution

- [ ] Create alert policies for critical events
  ```bash
  gcloud alpha monitoring policies create \
    --policy-from-file=monitoring-alerts/critical-alerts.json
  ```
  - [ ] Verify alert policy creation
  - [ ] Test alert triggering

## Data Analytics Setup

### 1. Create BigQuery Dataset

- [ ] Set up dataset for analytics with proper permissions
  ```bash
  bq mk --location=US --description="Dragon Ecosystem Analytics" dragon_analytics
  ```
  - [ ] Verify dataset creation

- [ ] Create table schema definitions
  ```bash
  # Create schema files for each table
  cat > whitelist_schema.json << EOL
  [
    {"name": "token_id", "type": "INTEGER", "mode": "REQUIRED"},
    {"name": "owner", "type": "STRING", "mode": "REQUIRED"},
    {"name": "original_user", "type": "STRING", "mode": "REQUIRED"},
    {"name": "swap_amount", "type": "NUMERIC", "mode": "REQUIRED"},
    {"name": "timestamp", "type": "TIMESTAMP", "mode": "REQUIRED"},
    {"name": "redeemed", "type": "BOOLEAN", "mode": "REQUIRED"},
    {"name": "redemption_timestamp", "type": "TIMESTAMP", "mode": "NULLABLE"}
  ]
  EOL
  # Similar schema definitions for other tables...
  ```
  - [ ] Verify schema files are created correctly

- [ ] Create tables for different data types
  ```bash
  bq mk --table dragon_analytics.whitelist_nfts whitelist_schema.json
  bq mk --table dragon_analytics.vrf_outages vrf_outages_schema.json
  bq mk --table dragon_analytics.red_envelopes red_envelopes_schema.json
  bq mk --table dragon_analytics.token_transfers token_transfers_schema.json
  bq mk --table dragon_analytics.lottery_entries lottery_entries_schema.json
  bq mk --table dragon_analytics.ve69lp_locks ve69lp_locks_schema.json
  bq mk --table dragon_analytics.fee_distributions fee_distributions_schema.json
  bq mk --table dragon_analytics.jackpot_changes jackpot_changes_schema.json
  bq mk --table dragon_analytics.winning_events winning_events_schema.json
  ```
  - [ ] Verify table creation for each table
  - [ ] Test sample data insertion

- [ ] Set up data export from Pub/Sub to BigQuery
  ```bash
  # Create new subscription with BigQuery as the destination
  gcloud pubsub subscriptions create dragon-events-to-bigquery \
    --topic=dragon-events \
    --bigquery-table=dragon-ecosystem:dragon_analytics.events \
    --write-metadata
  ```
  - [ ] Verify subscription creation
  - [ ] Test data flow from Pub/Sub to BigQuery

### 2. Create Dashboard

- [ ] Prepare Looker Studio dashboard queries
  ```sql
  -- Sample Whitelist NFT Analytics Query
  SELECT 
    DATE(timestamp) as date,
    COUNT(*) as nfts_issued,
    SUM(CASE WHEN redeemed THEN 1 ELSE 0 END) as nfts_redeemed,
    SUM(swap_amount) as total_swap_amount
  FROM 
    `dragon-ecosystem.dragon_analytics.whitelist_nfts`
  GROUP BY 
    date
  ORDER BY 
    date;
  ```
  - [ ] Test query execution and results

- [ ] Set up Looker Studio dashboard for NFT analytics
  - [ ] Create charts for:
    - [ ] Whitelist Dragon NFTs issued
    - [ ] Redemption rates
    - [ ] VRF outage tracking
    - [ ] Red Envelopes analytics
    - [ ] User acquisition metrics
    - [ ] Token transfers
    - [ ] Lottery entries
    - [ ] ve69LP locks
    - [ ] Fee distributions
    - [ ] Jackpot growth
    - [ ] Winning frequency
    - [ ] User retention

- [ ] Set up scheduled exports for reporting
  ```bash
  # Schedule a daily export of analytics to Cloud Storage
  bq query --destination_table=dragon_ecosystem:dragon_analytics.daily_summary \
    --use_legacy_sql=false \
    --schedule="every 24 hours" \
    "SELECT DATE(timestamp) as date, COUNT(*) as total_events FROM dragon_ecosystem.dragon_analytics.events GROUP BY date"
  ```
  - [ ] Verify scheduled export creation
  - [ ] Test export execution

## Post-Deployment Verification

### 1. Test Contract Functionality

#### 1.1 Core Token and Financial Contracts

- [ ] Test Dragon token transfers
  - [ ] Normal transfers between accounts
  - [ ] Transfers with fee application
  - [ ] Check fee distribution to various addresses

- [ ] Test ve69LP functionality:
  - [ ] Create lock
  - [ ] Increase lock amount
  - [ ] Increase lock time
  - [ ] Withdraw
  - [ ] Check voting power calculation

- [ ] Test ve69LPFeeDistributor functionality:
  - [ ] Add reward token
  - [ ] Remove reward token
  - [ ] Claim fees
  - [ ] Check reward calculation based on lock

- [ ] Test DragonExchangePair functionality:
  - [ ] Swap WSONIC to DRAGON
  - [ ] Swap DRAGON to WSONIC
  - [ ] Check fee application

- [ ] Test DragonJackpotVault functionality:
  - [ ] Add to jackpot
  - [ ] Withdraw from jackpot
  - [ ] Check access controls

#### 1.2 Lottery and Game Contracts

- [ ] Test Lottery Swap functionality
  - [ ] Normal swap without winning
  - [ ] Test with simulated win
  - [ ] Check jackpot growth

- [ ] Test VRF integration:
  - [ ] With VRF available
  - [ ] With VRF unavailable (should issue Whitelist Dragon NFT)
  - [ ] Test retry mechanism

- [ ] Test NFT redemption for whitelist
  - [ ] Redeem NFT
  - [ ] Verify whitelist status
  - [ ] Test whitelist benefits

- [ ] Test GoldScratcher functionality:
  - [ ] Mint scratcher
  - [ ] Apply scratcher to swap
  - [ ] Verify boost
  - [ ] Test various rarity levels

- [ ] Test Red Envelopes functionality:
  - [ ] Create envelope
  - [ ] Claim from envelope
  - [ ] Verify fee distribution
  - [ ] Test expiration functionality
  - [ ] Test reclaim functionality

- [ ] Test PromotionalItemRegistry functionality:
  - [ ] Register item
  - [ ] Unregister item
  - [ ] Get item
  - [ ] Use item in lottery

#### 1.3 Integration Testing

- [ ] Test DragonLPBooster functionality:
  - [ ] Calculate boost
  - [ ] Apply boost to lottery entries
  - [ ] Test different boost levels

- [ ] Test DragonBeetsAdapter functionality:
  - [ ] Interact with Balancer/Beets
  - [ ] Check LP integration

- [ ] Test full system flow
  - [ ] User buys DRAGON with WSONIC
  - [ ] User enters lottery
  - [ ] User locks in ve69LP
  - [ ] User claims fees
  - [ ] User creates and shares a Red Envelope

### 2. Verify Frontend Integration

- [ ] Test swap interface
  - [ ] Connect wallet
  - [ ] Swap tokens
  - [ ] View swap history

- [ ] Test NFT wallet integration
  - [ ] View owned NFTs
  - [ ] Transfer NFTs
  - [ ] Redeem Whitelist Dragon

- [ ] Test whitelist status display
  - [ ] Check whitelist status
  - [ ] View whitelist benefits

- [ ] Test Red Envelopes UI
  - [ ] Create envelope
  - [ ] Share envelope
  - [ ] Claim from envelope
  - [ ] View history

- [ ] Test GoldScratcher UI
  - [ ] Purchase scratcher
  - [ ] Scratch card animation
  - [ ] Apply boost

- [ ] Test ve69LP UI
  - [ ] Create lock
  - [ ] Manage lock
  - [ ] View rewards

- [ ] Test profile features
  - [ ] View history
  - [ ] Manage assets
  - [ ] Set preferences

### 3. Verify Monitoring

- [ ] Confirm events are being tracked
  - [ ] Check event logs
  - [ ] Verify data structure

- [ ] Test alerting functionality
  - [ ] Trigger test alerts
  - [ ] Verify notification delivery

- [ ] Verify data is flowing to BigQuery
  - [ ] Check tables for data
  - [ ] Run test queries

- [ ] Verify dashboard functionality
  - [ ] Check all metrics
  - [ ] Test interactive features 