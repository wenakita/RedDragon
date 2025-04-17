# Dragon Ecosystem Google Cloud Deployment Guide

This document outlines the process for deploying the Dragon ecosystem contracts to a production environment using Google Cloud Platform (GCP).

## Prerequisites

- Google Cloud Platform account with billing enabled
- Docker installed locally for container testing
- Node.js and npm installed locally
- Hardhat development environment configured
- Access to the Dragon ecosystem codebase and contracts
- Private keys for deployment wallets (securely stored)

## Architecture Overview

The Dragon ecosystem deployment consists of:

1. **Smart Contracts**: Deployed on the Sonic blockchain
2. **Backend Services**: Hosted on Google Cloud Run
3. **Monitoring**: Using Google Cloud Monitoring and Logging
4. **Secret Management**: Using Google Secret Manager
5. **Database**: Using Google Cloud Firestore

## Deployment Steps

### 1. Smart Contract Deployment

#### 1.1 Prepare Environment Variables

Create a `.env` file for deployment (this should not be committed to the repository):

```
# Network
SONIC_RPC_URL=https://mainnet.sonic.fantom.network/
SONIC_CHAIN_ID=64165

# Deployment keys (use environment variables for production)
DEPLOYER_PRIVATE_KEY=${DEPLOYER_KEY_FROM_SECRET_MANAGER}

# VRF Configuration
VRF_COORDINATOR=0x3Ba925fdeAe6B46d0BB4d424D829982Cb2F7309e
```

#### 1.2 Create the Deployment Script

Create a deployment script for the Dragon ecosystem contracts:

```javascript
// scripts/deploy-production.js
const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("Deploying Dragon ecosystem to production...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  
  // Load configuration
  const vrfCoordinator = process.env.VRF_COORDINATOR;
  console.log(`Using VRF Coordinator: ${vrfCoordinator}`);
  
  // Deploy VRFValidator
  const VRFValidator = await ethers.getContractFactory("VRFValidator");
  const vrfValidator = await VRFValidator.deploy(vrfCoordinator);
  await vrfValidator.deployed();
  console.log(`VRFValidator deployed to: ${vrfValidator.address}`);
  
  // Deploy other contracts with the configurable VRF coordinator
  // [Add deployment code for other contracts]
  
  console.log("Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

#### 1.3 Deploy Contracts

Run the deployment script:

```bash
npx hardhat run scripts/deploy-production.js --network sonic
```

### 2. Google Cloud Setup

#### 2.1 Set Up Google Cloud Project

```bash
# Create a new project
gcloud projects create dragon-ecosystem --name="Dragon Ecosystem"

# Set the project as active
gcloud config set project dragon-ecosystem

# Enable required APIs
gcloud services enable compute.googleapis.com \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  cloudmonitoring.googleapis.com
```

#### 2.2 Configure Secret Manager

Store deployment keys and sensitive configuration in Secret Manager:

```bash
# Create secrets
echo -n "PRIVATE_KEY_HERE" | gcloud secrets create deployer-key --data-file=-
echo -n "0x3Ba925fdeAe6B46d0BB4d424D829982Cb2F7309e" | gcloud secrets create vrf-coordinator --data-file=-

# Grant access to service accounts
gcloud secrets add-iam-policy-binding deployer-key \
  --member="serviceAccount:dragon-service@dragon-ecosystem.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Backend Service Deployment

#### 3.1 Create Docker Container

Create a `Dockerfile` for the backend service:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

CMD ["node", "index.js"]
```

#### 3.2 Build and Deploy to Cloud Run

```bash
# Build the container
gcloud builds submit --tag gcr.io/dragon-ecosystem/dragon-backend

# Deploy to Cloud Run
gcloud run deploy dragon-backend \
  --image gcr.io/dragon-ecosystem/dragon-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="DEPLOYER_KEY=deployer-key:latest,VRF_COORDINATOR=vrf-coordinator:latest"
```

### 4. Monitoring and Alerts

#### 4.1 Set Up Cloud Monitoring

Create monitoring dashboards for contract events:

```bash
# Install monitoring agent
gcloud beta compute instances update dragon-vm \
  --zone=us-central1-a \
  --update-container-args="monitoring-agent"
```

#### 4.2 Configure Alert Policies

```bash
# Create alert for VRF validation failures
gcloud alpha monitoring policies create \
  --policy-from-file=alerts/vrf-validation-alert.yaml
```

Example alert policy for VRF validation failures:

```yaml
# alerts/vrf-validation-alert.yaml
displayName: "VRF Validation Failures"
combiner: OR
conditions:
- displayName: "VRF Validation Failure Rate"
  conditionThreshold:
    filter: 'resource.type="cloud_run_revision" AND
             resource.labels.service_name="dragon-backend" AND
             log_name="projects/dragon-ecosystem/logs/vrf-validation" AND
             jsonPayload.status="failure"'
    aggregations:
    - alignmentPeriod: 300s
      perSeriesAligner: ALIGN_RATE
    comparison: COMPARISON_GT
    thresholdValue: 0.1
    duration: 60s
notificationChannels:
- projects/dragon-ecosystem/notificationChannels/1234567890
```

### 5. Database Setup

#### 5.1 Configure Firestore Database

```bash
# Create Firestore database
gcloud firestore databases create --region=us-central1

# Set up default security rules
gcloud firestore security-rules deploy firestore-rules.rules
```

### 6. Verification Process

After deployment, run the verification script to ensure everything is working correctly:

```bash
# Run verification
node scripts/verify-deployment.js

# Test VRF coordinator validation
node scripts/test-vrf-validation.js --coordinator=$VRF_COORDINATOR
```

## Updating VRF Coordinator

If PaintSwap confirms a different VRF coordinator address, use the following process to update it:

1. Update the secret in Secret Manager:

```bash
echo -n "NEW_COORDINATOR_ADDRESS" | gcloud secrets versions add vrf-coordinator --data-file=-
```

2. Call the `setOfficialVRFCoordinator` function on the deployed contract:

```javascript
// scripts/update-vrf-coordinator.js
const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const newCoordinator = process.env.NEW_VRF_COORDINATOR;
  console.log(`Updating VRF Coordinator to: ${newCoordinator}`);
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  
  // Connect to VRFValidator
  const VRFValidator = await ethers.getContractFactory("VRFValidator");
  const vrfValidator = VRFValidator.attach("DEPLOYED_VALIDATOR_ADDRESS");
  
  // Update the coordinator
  const tx = await vrfValidator.setOfficialVRFCoordinator(newCoordinator);
  await tx.wait();
  
  console.log(`VRF Coordinator updated successfully: ${tx.hash}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

## Maintenance Tasks

### Regular Monitoring

- Check VRF coordinator status daily
- Monitor contract interactions and events
- Check for any validation failures
- Verify subscription funding levels

### Emergency Procedures

In case of VRF service disruption:

1. Check if the coordinator address has changed
2. Verify subscription funding
3. If necessary, update the coordinator address using the process above
4. If critical, temporarily disable validation while investigating

## Conclusion

This deployment guide provides a comprehensive approach to deploying the Dragon ecosystem on Google Cloud Platform with a focus on secure and adaptable VRF integration. The configurable VRF coordinator pattern allows for easy updates if the correct address is confirmed to be different from the current one.

For any deployment issues, contact the Dragon development team at dev@dragon.example.com. 