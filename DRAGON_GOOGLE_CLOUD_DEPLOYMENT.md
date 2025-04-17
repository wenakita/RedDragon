# Dragon Ecosystem - Google Cloud Deployment Guide

This guide outlines how to deploy, monitor, and manage the Dragon Ecosystem using Google Cloud Platform services.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Infrastructure Setup](#infrastructure-setup)
4. [Smart Contract Deployment](#smart-contract-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Monitoring Setup](#monitoring-setup)
7. [Analytics Pipeline](#analytics-pipeline)
8. [Backup and Recovery](#backup-and-recovery)
9. [Security Best Practices](#security-best-practices)
10. [CI/CD Pipeline](#cicd-pipeline)
11. [Cost Optimization](#cost-optimization)

## Architecture Overview

The Dragon Ecosystem on Google Cloud Platform will use the following services:

- **Compute Engine/GKE**: For deploying backend services and APIs
- **Cloud Storage**: For frontend assets and static files
- **Cloud Functions**: For webhook handlers and utilities
- **BigQuery**: For storing and analyzing chain data
- **Pub/Sub**: For real-time event handling
- **Cloud Monitoring**: For system monitoring and alerts
- **Secret Manager**: For secure storage of sensitive information
- **Firebase**: For authentication and real-time database functionality

### Architecture Diagram

```
+---------------------------------------------------+
|                    End Users                      |
+---------------------------+-----------------------+
                            |
+---------------------------v-----------------------+
|             Cloud Load Balancer (HTTPS)           |
+---------------------------+-----------------------+
                            |
       +-------------------+-------------------+
       |                                       |
+------v------+                       +--------v-----+
|             |                       |              |
| Cloud Run   |                       | Cloud Storage|
| (API Server)|                       | (Frontend)   |
|             |                       |              |
+------+------+                       +--------------+
       |
       |
+------v------+       +---------------+      +---------------+
|             |       |               |      |               |
| Firestore   |<----->| Cloud Pub/Sub |<---->| Cloud Functions|
| (User Data) |       | (Events)      |      | (Webhooks)     |
|             |       |               |      |               |
+------+------+       +---------------+      +-------+-------+
       |                                             |
       |                                             |
+------v------+       +---------------+      +-------v-------+
|             |       |               |      |               |
| BigQuery    |<----->| Data Pipeline |<---->| Blockchain    |
| (Analytics) |       | (ETL)         |      | (External)    |
|             |       |               |      |               |
+-------------+       +---------------+      +---------------+
```

## Prerequisites

Before starting deployment, ensure you have:

1. **Google Cloud Account**: Set up a Google Cloud account and create a new project
2. **gcloud CLI**: Install and configure the Google Cloud SDK
3. **Node.js**: Version 14+ for contract deployment
4. **Private Keys**: Secure private keys for contract deployment
5. **Domain Name**: A registered domain for your application

```bash
# Install Google Cloud SDK
curl https://sdk.cloud.google.com | bash
gcloud init

# Create a new project (if needed)
gcloud projects create dragon-ecosystem --name="Dragon Ecosystem"

# Set the active project
gcloud config set project dragon-ecosystem

# Enable required APIs
gcloud services enable compute.googleapis.com \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    cloudfunctions.googleapis.com \
    secretmanager.googleapis.com \
    firebase.googleapis.com \
    bigquery.googleapis.com \
    pubsub.googleapis.com \
    cloudscheduler.googleapis.com
```

## Infrastructure Setup

### 1. Set Up Secret Manager

Store sensitive information like private keys in Secret Manager:

```bash
# Create secrets for private keys and API keys
gcloud secrets create deployment-private-key --replication-policy="automatic"
gcloud secrets versions add deployment-private-key --data-file="./private_key.txt"

gcloud secrets create rpc-api-key --replication-policy="automatic" 
gcloud secrets versions add rpc-api-key --data-file="./api_key.txt"

# Grant access to the service account
gcloud secrets add-iam-policy-binding deployment-private-key \
    --member="serviceAccount:deployment-sa@dragon-ecosystem.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

### 2. Create Service Accounts

```bash
# Create service account for deployments
gcloud iam service-accounts create deployment-sa \
    --display-name="Dragon Deployment Service Account"

# Grant necessary permissions
gcloud projects add-iam-policy-binding dragon-ecosystem \
    --member="serviceAccount:deployment-sa@dragon-ecosystem.iam.gserviceaccount.com" \
    --role="roles/compute.admin"
```

### 3. Set Up Networking

```bash
# Create VPC network
gcloud compute networks create dragon-network --subnet-mode=auto

# Create firewall rules
gcloud compute firewall-rules create dragon-allow-internal \
    --network=dragon-network \
    --allow=tcp,udp,icmp \
    --source-ranges=10.0.0.0/8
```

## Smart Contract Deployment

### 1. Prepare Environment

Create a deployment VM with secure environment:

```bash
# Create deployment VM
gcloud compute instances create dragon-deployer \
    --zone=us-central1-a \
    --machine-type=e2-medium \
    --service-account=deployment-sa@dragon-ecosystem.iam.gserviceaccount.com \
    --scopes=cloud-platform

# SSH into the instance
gcloud compute ssh dragon-deployer
```

### 2. Setup Deployment Environment

On the deployment VM:

```bash
# Install dependencies
sudo apt-get update
sudo apt-get install -y nodejs npm git

# Clone repository
git clone https://github.com/your-org/dragon-contracts
cd dragon-contracts

# Install project dependencies
npm install

# Get secrets from Secret Manager
gcloud secrets versions access latest --secret=deployment-private-key > .env
```

### 3. Deploy Smart Contracts

Execute the deployment script:

```bash
# Compile contracts
npm run compile

# Deploy to Sonic chain
npx hardhat launch-red-dragon --network sonic

# Verify contracts
npx hardhat verify --network sonic [CONTRACT_ADDRESS]
```

### 4. Record Contract Addresses

Store contract addresses in Secret Manager for future reference:

```bash
# Save addresses to a file
echo "{
  \"dragon\": \"0x...\",
  \"dragonLotterySwap\": \"0x...\",
  \"ve69LP\": \"0x...\",
  \"goldScratcher\": \"0x...\"
}" > contract_addresses.json

# Store in Secret Manager
gcloud secrets create contract-addresses --replication-policy="automatic"
gcloud secrets versions add contract-addresses --data-file="./contract_addresses.json"
```

## Frontend Deployment

### 1. Set Up Cloud Storage for Frontend

```bash
# Create bucket for frontend
gsutil mb -l us-central1 gs://dragon-frontend

# Enable website hosting
gsutil web set -m index.html -e 404.html gs://dragon-frontend

# Make bucket public
gsutil iam ch allUsers:objectViewer gs://dragon-frontend
```

### 2. Deploy Frontend Files

```bash
# Build frontend
cd frontend
npm install
npm run build

# Upload to Cloud Storage
gsutil -m cp -r build/* gs://dragon-frontend/
```

### 3. Set Up Cloud CDN and Load Balancer

```bash
# Create load balancer backend
gcloud compute backend-buckets create dragon-frontend-backend \
    --gcs-bucket-name=dragon-frontend \
    --enable-cdn

# Create URL map
gcloud compute url-maps create dragon-frontend-url-map \
    --default-backend-bucket=dragon-frontend-backend

# Create HTTPS proxy
gcloud compute ssl-certificates create dragon-ssl-cert \
    --domains=dragon-app.com

gcloud compute target-https-proxies create dragon-https-proxy \
    --url-map=dragon-frontend-url-map \
    --ssl-certificates=dragon-ssl-cert

# Create forwarding rule
gcloud compute forwarding-rules create dragon-https-forwarding-rule \
    --target-https-proxy=dragon-https-proxy \
    --global \
    --ports=443
```

## Monitoring Setup

### 1. Set Up Custom Metrics for Smart Contracts

Create a Cloud Function to monitor on-chain events:

```bash
# Create a Pub/Sub topic for events
gcloud pubsub topics create dragon-contract-events

# Deploy Cloud Function
gcloud functions deploy monitorContractEvents \
    --runtime nodejs14 \
    --trigger-http \
    --allow-unauthenticated \
    --entry-point=monitorEvents \
    --source=./monitoring-function
```

The function code (monitoring-function/index.js) should:
1. Connect to the Sonic RPC
2. Listen for events from the Dragon contracts
3. Push events to Pub/Sub for further processing

### 2. Configure Cloud Monitoring Dashboards

```bash
# Create dashboard via gcloud (or use UI)
gcloud monitoring dashboards create \
    --config-from-file=./monitoring-dashboard.json
```

Dashboard should include:
- Token price and volume
- Transaction counts
- Active users
- Jackpot size
- Win/loss ratio
- Gas usage

### 3. Set Up Alerts

```bash
# Create alerts for critical events
gcloud alpha monitoring policies create \
    --policy-from-file=./alert-policies.json
```

Key alerts:
- Large jackpot wins
- Smart contract errors
- High gas prices
- Abnormal transaction patterns
- Large token movements

## Analytics Pipeline

### 1. Set Up BigQuery for Blockchain Data

```bash
# Create BigQuery dataset
bq mk --location=US dragon_analytics

# Create tables for different data types
bq mk --table dragon_analytics.transactions transaction_schema.json
bq mk --table dragon_analytics.lottery_events lottery_schema.json
bq mk --table dragon_analytics.token_holders token_holders_schema.json
```

### 2. Create ETL Pipeline with Cloud Dataflow

```bash
# Deploy Dataflow job for blockchain data extraction
gcloud dataflow jobs run extract-blockchain-data \
    --gcs-location=gs://dragon-dataflow/templates/extract-blockchain \
    --region=us-central1 \
    --parameters="input=Sonic-RPC,output=dragon_analytics.transactions"
```

### 3. Schedule Regular Data Updates

```bash
# Create Cloud Scheduler job to trigger updates
gcloud scheduler jobs create http update-analytics \
    --schedule="every 15 minutes" \
    --uri="https://us-central1-dragon-ecosystem.cloudfunctions.net/triggerDataUpdate" \
    --http-method=POST
```

## Backup and Recovery

### 1. Database Backup

```bash
# Set up regular Firestore backups
gcloud firestore export gs://dragon-backup/$(date +%Y-%m-%d)/
```

### 2. Configuration Backup

```bash
# Export all project configuration
gcloud config configurations export dragon-config

# Upload to secure storage
gsutil cp dragon-config gs://dragon-backup/config/
```

### 3. Recovery Plan Documentation

Create a recovery plan document with step-by-step instructions for:
- Restoring from backups
- Redeploying contracts (if needed)
- Recovering from various failure scenarios

## Security Best Practices

### 1. Enable VPC Service Controls

```bash
# Create service perimeter
gcloud access-context-manager perimeters create dragon-perimeter \
    --title="Dragon Security Perimeter" \
    --resources="projects/dragon-ecosystem" \
    --restricted-services=storage.googleapis.com,bigquery.googleapis.com
```

### 2. Set Up Cloud Security Scanner

```bash
# Create security scan
gcloud web-security-scanner scan-configs create dragon-security-scan \
    --display-name="Dragon Security Scan" \
    --starting-urls="https://dragon-app.com"
```

### 3. Enable Cloud Armor

```bash
# Create security policy
gcloud compute security-policies create dragon-security-policy \
    --description="Protection for Dragon endpoints"

# Add rules for DDoS protection
gcloud compute security-policies rules create 1000 \
    --security-policy=dragon-security-policy \
    --description="Block XSS attacks" \
    --expression="evaluatePreconfiguredExpr('xss-stable')" \
    --action="deny-403"
```

## CI/CD Pipeline

### 1. Set Up Cloud Build

Create a cloudbuild.yaml file:

```yaml
steps:
  # Test smart contracts
  - name: 'node:14'
    entrypoint: npm
    args: ['test']
    dir: 'contracts'
  
  # Deploy to testnet
  - name: 'node:14'
    entrypoint: npx
    args: ['hardhat', 'run', 'scripts/deploy.js', '--network', 'testnet']
    dir: 'contracts'
    
  # Build frontend
  - name: 'node:14'
    entrypoint: npm
    args: ['run', 'build']
    dir: 'frontend'
    
  # Deploy frontend to storage
  - name: 'gcr.io/cloud-builders/gsutil'
    args: ['-m', 'cp', '-r', 'frontend/build/*', 'gs://dragon-frontend/']
```

Set up the trigger:

```bash
# Create Cloud Build trigger for main branch
gcloud builds triggers create github \
    --repo-name=dragon-ecosystem \
    --repo-owner=your-org \
    --branch-pattern="^main$" \
    --build-config=cloudbuild.yaml
```

### 2. Configure Automated Testing

```bash
# Create schedule for daily tests
gcloud scheduler jobs create http run-daily-tests \
    --schedule="0 2 * * *" \
    --uri="https://cloudbuild.googleapis.com/v1/projects/dragon-ecosystem/triggers/trigger-id:run" \
    --http-method=POST
```

## Cost Optimization

### 1. Set Up Budget Alerts

```bash
# Create budget and alert
gcloud billing budgets create \
    --billing-account=BILLING_ACCOUNT_ID \
    --display-name="Dragon Ecosystem Budget" \
    --budget-amount=1000USD \
    --threshold-rules=threshold-percent=0.5 \
    --threshold-rules=threshold-percent=0.9
```

### 2. Configure Resource Scaling

For Cloud Run and other scalable services:

```bash
# Set up autoscaling for Cloud Run
gcloud run services update dragon-api \
    --min-instances=1 \
    --max-instances=10
```

### 3. Storage Class Optimization

```bash
# Move older logs to coldline storage
gsutil lifecycle set lifecycle-config.json gs://dragon-logs
```

Example lifecycle-config.json:
```json
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "SetStorageClass", "storageClass": "COLDLINE"},
        "condition": {
          "age": 30,
          "matchesStorageClass": ["STANDARD"]
        }
      }
    ]
  }
}
```

## Conclusion

This deployment guide provides a comprehensive approach to setting up the Dragon Ecosystem on Google Cloud Platform. By following these instructions, you'll have a scalable, secure, and monitored infrastructure that can handle the demands of a blockchain-based application.

For any questions or support, please contact the Dragon team.

---

## Appendix: Useful Commands for Management

### Project Management

```bash
# List all services in use
gcloud services list

# Check resource usage
gcloud compute instances list
gcloud container clusters list
gcloud run services list
```

### Monitoring and Maintenance

```bash
# View recent logs
gcloud logging read "resource.type=cloud_function AND resource.labels.function_name=monitorContractEvents"

# Check current alerts
gcloud alpha monitoring policies list

# View build history
gcloud builds list --limit=5
```

### Security Management

```bash
# View IAM policies
gcloud projects get-iam-policy dragon-ecosystem

# Check firewall rules
gcloud compute firewall-rules list --filter="network=dragon-network"
``` 