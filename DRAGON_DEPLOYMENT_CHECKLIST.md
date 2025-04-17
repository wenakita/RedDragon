# Dragon Ecosystem Deployment Checklist

This document provides a step-by-step checklist for deploying the entire Dragon ecosystem, including the new Whitelist Dragon NFT system for VRF outage compensation.

## Pre-Deployment Preparation

- [ ] Set up Google Cloud Platform account and project
  - Project name: `dragon-ecosystem`
  - Billing account attached
  - APIs enabled:
    - Compute Engine
    - Cloud Run
    - Secret Manager
    - Cloud Storage
    - BigQuery
    - Pub/Sub
    - Cloud Functions

- [ ] Prepare deployment wallets
  - [ ] Create deployment wallet
  - [ ] Fund with enough SONIC for deployment (min 10 SONIC)
  - [ ] Store private key securely

- [ ] Prepare RPC endpoints
  - [ ] Sonic Mainnet: `https://rpc.soniclabs.com`

## Smart Contract Deployment

### 1. Deploy Core Contracts

- [ ] Deploy Dragon Token
  ```bash
  npx hardhat run scripts/deploy-dragon.js --network sonic
  ```
  - [ ] Store deployed address: `______________`

- [ ] Deploy VRFValidator with configurable coordinator
  ```bash
  npx hardhat run scripts/deploy-vrf-validator.js --network sonic
  ```
  - [ ] Store deployed address: `______________`
  - [ ] Current coordinator address used: `0x3Ba925fdeAe6B46d0BB4d424D829982Cb2F7309e`

- [ ] Deploy DelayedEntryCompensation (Whitelist Dragon NFT)
  ```bash
  npx hardhat run scripts/deploy-whitelist-dragon.js --network sonic
  ```
  - [ ] Store deployed address: `______________`
  - [ ] Verify metadata URL is set to: `https://sonicreddragon.io/white/`

- [ ] Deploy RedEnvelopes
  ```bash
  npx hardhat run scripts/deploy-red-envelopes.js --network sonic
  ```
  - [ ] Store deployed address: `______________`
  - [ ] Verify initialization settings: 
    - [ ] Minimum amount: 10 DRAGON
    - [ ] Maximum claimers: 100
    - [ ] Fee percentage: 1%

- [ ] Deploy DragonLotterySwap
  ```bash
  npx hardhat run scripts/deploy-lottery-swap.js --network sonic
  ```
  - [ ] Store deployed address: `______________`

### 2. Configure Contract Linkages

- [ ] Set VRF verifier in DragonLotterySwap
  ```bash
  npx hardhat run scripts/set-vrf-verifier.js --network sonic
  ```

- [ ] Set compensation system in DragonLotterySwap
  ```bash
  npx hardhat run scripts/set-compensation-system.js --network sonic
  ```

- [ ] Set exchange pair in DragonLotterySwap
  ```bash
  npx hardhat run scripts/set-exchange-pair.js --network sonic
  ```

- [ ] Link Red Envelopes with DragonLotterySwap (if needed)
  ```bash
  npx hardhat run scripts/link-red-envelopes.js --network sonic
  ```

### 3. Verify All Contracts on Block Explorer

- [ ] Verify Dragon Token
  ```bash
  npx hardhat verify --network sonic [DRAGON_ADDRESS]
  ```

- [ ] Verify VRFValidator
  ```bash
  npx hardhat verify --network sonic [VRF_VALIDATOR_ADDRESS] [COORDINATOR_ADDRESS]
  ```

- [ ] Verify DelayedEntryCompensation
  ```bash
  npx hardhat verify --network sonic [COMPENSATION_ADDRESS]
  ```

- [ ] Verify RedEnvelopes
  ```bash
  npx hardhat verify --network sonic [RED_ENVELOPES_ADDRESS] [DRAGON_TOKEN_ADDRESS]
  ```

- [ ] Verify DragonLotterySwap
  ```bash
  npx hardhat verify --network sonic [LOTTERY_SWAP_ADDRESS] [WSONIC_ADDRESS] [VRF_ADDRESS] [REGISTRY_ADDRESS] [GOLD_SCRATCHER_ADDRESS]
  ```

## Cloud Infrastructure Deployment

### 1. Set Up Secret Management

- [ ] Store contract addresses in Secret Manager
  ```bash
  gcloud secrets create dragon-contracts --replication-policy="automatic"
  ```

- [ ] Store deployment private key in Secret Manager
  ```bash
  gcloud secrets create deployment-key --replication-policy="automatic"
  ```

### 2. Deploy Backend API

- [ ] Create Cloud Run service for backend API
  ```bash
  gcloud run deploy dragon-api \
    --source=./backend \
    --region=us-central1 \
    --allow-unauthenticated \
    --set-secrets=CONTRACTS=dragon-contracts:latest,PRIVATE_KEY=deployment-key:latest
  ```

### 3. Deploy Frontend

- [ ] Build frontend application
  ```bash
  cd frontend
  npm install
  npm run build
  ```

- [ ] Create Cloud Storage bucket
  ```bash
  gsutil mb -l us-central1 gs://dragon-frontend
  gsutil web set -m index.html gs://dragon-frontend
  ```

- [ ] Upload frontend files
  ```bash
  gsutil -m cp -r build/* gs://dragon-frontend/
  ```

- [ ] Make bucket public
  ```bash
  gsutil iam ch allUsers:objectViewer gs://dragon-frontend
  ```

### 4. Set Up NFT Metadata Server

- [ ] Create Cloud Run service for NFT metadata
  ```bash
  gcloud run deploy whitelist-metadata \
    --source=./metadata-service \
    --region=us-central1 \
    --allow-unauthenticated \
    --set-secrets=CONTRACTS=dragon-contracts:latest
  ```

- [ ] Configure domain for metadata service
  ```bash
  gcloud run domain-mappings create \
    --service=whitelist-metadata \
    --domain=sonicreddragon.io
  ```

### 5. Deploy Red Envelopes Service

- [ ] Create Cloud Run service for Red Envelopes API
  ```bash
  gcloud run deploy red-envelopes-api \
    --source=./red-envelopes-service \
    --region=us-central1 \
    --allow-unauthenticated \
    --set-secrets=CONTRACTS=dragon-contracts:latest
  ```

- [ ] Configure Cloud Scheduler for Red Envelope expiration checks
  ```bash
  gcloud scheduler jobs create http check-red-envelopes \
    --schedule="every 1 hours" \
    --uri="https://us-central1-dragon-ecosystem.cloudfunctions.net/checkExpiredEnvelopes" \
    --http-method=POST
  ```

### 6. Deploy Monitoring Services

- [ ] Set up Cloud Functions for contract event monitoring
  ```bash
  gcloud functions deploy monitorDragonEvents \
    --runtime=nodejs16 \
    --trigger-http \
    --allow-unauthenticated \
    --set-secrets=CONTRACTS=dragon-contracts:latest
  ```

- [ ] Create Pub/Sub topic for event notifications
  ```bash
  gcloud pubsub topics create dragon-events
  ```

- [ ] Set up Cloud Scheduler for regular monitoring
  ```bash
  gcloud scheduler jobs create http monitor-contracts \
    --schedule="every 5 minutes" \
    --uri="https://us-central1-dragon-ecosystem.cloudfunctions.net/monitorDragonEvents" \
    --http-method=POST
  ```

## Data Analytics Setup

### 1. Create BigQuery Dataset

- [ ] Set up dataset for analytics
  ```bash
  bq mk --location=US dragon_analytics
  ```

- [ ] Create tables for different data types
  ```bash
  bq mk --table dragon_analytics.whitelist_nfts whitelist_schema.json
  bq mk --table dragon_analytics.vrf_outages vrf_outages_schema.json
  bq mk --table dragon_analytics.red_envelopes red_envelopes_schema.json
  ```

### 2. Create Dashboard

- [ ] Set up Looker Studio dashboard for NFT analytics
  - Whitelist Dragon NFTs issued
  - Redemption rates
  - VRF outage tracking
  - Red Envelopes analytics
  - User analytics

## Post-Deployment Verification

### 1. Test Contract Functionality

- [ ] Test Dragon token transfers
- [ ] Test Lottery Swap functionality
- [ ] Test VRF integration:
  - [ ] With VRF available
  - [ ] With VRF unavailable (should issue Whitelist Dragon NFT)
- [ ] Test NFT redemption for whitelist
- [ ] Verify whitelist status tracking
- [ ] Test Red Envelopes functionality:
  - [ ] Create envelope
  - [ ] Claim from envelope
  - [ ] Verify fee distribution
  - [ ] Test expiration functionality

### 2. Verify Frontend Integration

- [ ] Test swap interface
- [ ] Test NFT wallet integration
- [ ] Test whitelist status display
- [ ] Test Red Envelopes UI
- [ ] Test profile features

### 3. Verify Monitoring

- [ ] Confirm events are being tracked
- [ ] Test alerting functionality
- [ ] Verify data is flowing to BigQuery

## Security Checklist

- [ ] Run security scan on all smart contracts
- [ ] Set up Cloud Armor to protect APIs
- [ ] Configure VPC Service Controls
- [ ] Set up IAM permissions with least privilege
- [ ] Enable Cloud Logging for all services
- [ ] Set up budget alerts

## Documentation

- [ ] Update API documentation
- [ ] Document contract addresses and functions
- [ ] Create user guide for Whitelist Dragon NFT redemption
- [ ] Create user guide for Red Envelopes functionality
- [ ] Document monitoring and alerting setup
- [ ] Create recovery procedures

## Maintenance Plan

- [ ] Schedule regular contract audits
- [ ] Plan for VRF coordinator address updates if needed
- [ ] Schedule backups for all data
- [ ] Create incident response plan
- [ ] Schedule regular health checks

---

## Quick Reference: Deployed Resources

| Resource | Address/URL | Notes |
|----------|-------------|-------|
| Dragon Token | `0x_____________` | ERC20 token |
| DragonLotterySwap | `0x_____________` | Main lottery logic |
| VRFValidator | `0x_____________` | Configurable VRF validator |
| DelayedEntryCompensation | `0x_____________` | Whitelist Dragon NFT |
| RedEnvelopes | `0x_____________` | Red Envelopes contract |
| Backend API | https://dragon-api-xxx.run.app | Cloud Run service |
| Frontend | https://dragon-frontend.storage.googleapis.com | Cloud Storage |
| Metadata Service | https://sonicreddragon.io/white/ | NFT metadata |
| Red Envelopes API | https://red-envelopes-xxx.run.app | Red Envelopes service |

## Important Commands

```bash
# Check contract status
npx hardhat run scripts/check-status.js --network sonic

# Update VRF coordinator if needed
npx hardhat run scripts/update-coordinator.js --network sonic --address NEW_ADDRESS

# View whitelist status
npx hardhat run scripts/check-whitelist.js --network sonic --address USER_ADDRESS

# Issue manual whitelist entry (admin only)
npx hardhat run scripts/add-to-whitelist.js --network sonic --address USER_ADDRESS --amount AMOUNT

# Get Red Envelope information
npx hardhat run scripts/check-red-envelope.js --network sonic --id ENVELOPE_ID

# Create test Red Envelope (admin only)
npx hardhat run scripts/create-test-envelope.js --network sonic --amount AMOUNT --claimers NUM_CLAIMERS
``` 