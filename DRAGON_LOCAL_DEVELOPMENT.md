# Dragon Ecosystem Local Development Guide

This guide provides instructions for setting up a local development environment for the Dragon ecosystem before deploying to Google Cloud Platform. This approach allows you to develop and test your services locally first.

## Prerequisites

- Node.js (v16 or higher)
- Docker and Docker Compose
- Local MongoDB (for development data)
- Git

## Project Structure

Create a workspace directory structure for your local development:

```bash
mkdir -p dragon-ecosystem/{backend,metadata-service,monitoring,frontend,contracts}
cd dragon-ecosystem
```

## 1. Environment Setup

### Create a Local Environment Configuration

```bash
# Create a .env file for local development
cat > .env << EOF
# Blockchain Configuration
RPC_URL=https://rpc.soniclabs.com
CHAIN_ID=146
WEBSOCKET_URL=wss://wss.soniclabs.com

# Contract Addresses
DRAGON_TOKEN=0x0000...your_dragon_token_address
VRF_VALIDATOR=0x0000...your_vrf_validator_address
VRF_COORDINATOR=0x3Ba925fdeAe6B46d0BB4d424D829982Cb2F7309e
DELAYED_ENTRY_COMPENSATION=0x0000...your_whitelist_address
DRAGON_LOTTERY_SWAP=0x0000...your_lottery_swap_address
GOLD_SCRATCHER=0x0000...your_gold_scratcher_address
VE69LP=0x0000...your_ve69lp_address
VE69LP_FEE_DISTRIBUTOR=0x0000...your_fee_distributor_address
JACKPOT_VAULT=0x0000...your_jackpot_vault_address
LP_BOOSTER=0x0000...your_lp_booster_address
BEETS_ADAPTER=0x0000...your_beets_adapter_address
EXCHANGE_PAIR=0x0000...your_exchange_pair_address
RED_ENVELOPES=0x0000...your_red_envelopes_address
PROMOTIONAL_ITEM_REGISTRY=0x0000...your_promotional_item_registry_address

# Local Development Configuration
PORT=3000
METADATA_PORT=3001
MONITORING_PORT=3002
MONGODB_URI=mongodb://localhost:27017/dragon-dev

# Development Private Key (only for development!)
DEV_PRIVATE_KEY=your_development_private_key
EOF
```

### Set Up Contract JSON Configuration

```bash
# Create a structured contract addresses file
cat > contracts.json << EOF
{
  "tokens": {
    "dragon": "$DRAGON_TOKEN"
  },
  "vrf": {
    "validator": "$VRF_VALIDATOR",
    "coordinator": "$VRF_COORDINATOR"
  },
  "lottery": {
    "dragonLotterySwap": "$DRAGON_LOTTERY_SWAP",
    "goldScratcher": "$GOLD_SCRATCHER"
  },
  "whitelist": {
    "delayedEntryCompensation": "$DELAYED_ENTRY_COMPENSATION"
  },
  "ve69LP": {
    "ve69LP": "$VE69LP",
    "feeDistributor": "$VE69LP_FEE_DISTRIBUTOR"
  },
  "utility": {
    "jackpotVault": "$JACKPOT_VAULT",
    "lpBooster": "$LP_BOOSTER",
    "beetsAdapter": "$BEETS_ADAPTER", 
    "exchangePair": "$EXCHANGE_PAIR",
    "redEnvelopes": "$RED_ENVELOPES",
    "promotionalItemRegistry": "$PROMOTIONAL_ITEM_REGISTRY"
  },
  "constants": {
    "chainId": 64165,
    "rpcUrl": "https://rpc.soniclabs.com"
  }
}
EOF
```

## 2. NFT Metadata Service Development

### Create Metadata Service Structure

```bash
cd metadata-service
npm init -y
npm install express ethers dotenv cors

# Create basic directory structure
mkdir -p {src/{controllers,services,utils},public,test}
```

### Implement Basic Express App

```javascript
// src/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const { metadataRouter } = require('./controllers/metadata');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/metadata', metadataRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

module.exports = app;
```

### Create Server Entry Point

```javascript
// index.js
require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.METADATA_PORT || 3001;

app.listen(PORT, () => {
  console.log(`Metadata service running on port ${PORT}`);
});
```

### Implement Metadata Controller

```javascript
// src/controllers/metadata.js
const express = require('express');
const { getMetadataForToken } = require('../services/contract');

const router = express.Router();

// Get metadata for a token
router.get('/token/:id', async (req, res) => {
  try {
    const tokenId = req.params.id;
    
    // Get metadata from blockchain
    const tokenData = await getMetadataForToken(tokenId);
    
    // Format metadata according to OpenSea standards
    const metadata = {
      name: `Whitelist Dragon #${tokenId}`,
      description: 'A Whitelist Dragon NFT from the Dragon ecosystem.',
      image: `http://localhost:${process.env.METADATA_PORT}/images/dragon_${tokenId}.png`,
      attributes: [
        { trait_type: 'Original User', value: tokenData.originalUser },
        { trait_type: 'Swap Amount', value: tokenData.formattedAmount },
        { trait_type: 'Creation Date', value: tokenData.formattedTimestamp },
        { trait_type: 'Redeemed', value: tokenData.redeemed ? 'Yes' : 'No' }
      ]
    };
    
    res.status(200).json(metadata);
  } catch (error) {
    console.error(`Error serving metadata for token ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to retrieve token metadata' });
  }
});

module.exports = { metadataRouter: router };
```

### Implement Contract Interaction Service

```javascript
// src/services/contract.js
const ethers = require('ethers');
require('dotenv').config();

// ABI for the Whitelist Dragon NFT
const WHITELIST_DRAGON_ABI = [
  'function originalUserOf(uint256 tokenId) external view returns (address)',
  'function swapAmountOf(uint256 tokenId) external view returns (uint256)',
  'function mintTimestampOf(uint256 tokenId) external view returns (uint256)',
  'function isRedeemed(uint256 tokenId) external view returns (bool)'
];

// Get metadata for a token
async function getMetadataForToken(tokenId) {
  try {
    // Connect to blockchain
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    
    // Connect to contract
    const whitelistContract = new ethers.Contract(
      process.env.DELAYED_ENTRY_COMPENSATION,
      WHITELIST_DRAGON_ABI,
      provider
    );
    
    // Get token data
    const originalUser = await whitelistContract.originalUserOf(tokenId);
    const swapAmount = await whitelistContract.swapAmountOf(tokenId);
    const timestamp = await whitelistContract.mintTimestampOf(tokenId);
    const redeemed = await whitelistContract.isRedeemed(tokenId);
    
    // Format for display
    const formattedAmount = ethers.utils.formatEther(swapAmount);
    const formattedTimestamp = new Date(timestamp.toNumber() * 1000).toISOString();
    
    return {
      originalUser,
      swapAmount,
      formattedAmount,
      timestamp,
      formattedTimestamp,
      redeemed
    };
  } catch (error) {
    console.error(`Error fetching metadata for token ${tokenId}:`, error);
    throw error;
  }
}

module.exports = { getMetadataForToken };
```

### Create Placeholder Images

```bash
mkdir -p public/images
# Download a sample dragon image or create placeholder
curl -o public/images/dragon_placeholder.png https://example.com/placeholder.png
# Create a symbolic link for each token during development
ln -s public/images/dragon_placeholder.png public/images/dragon_1.png
```

### Create a Start Script

```bash
# package.json
{
  "name": "dragon-metadata-service",
  "version": "1.0.0",
  "description": "Metadata service for Dragon NFTs",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "jest"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "ethers": "^5.7.2",
    "express": "^4.18.2"
  },
  "devDependencies": {
    "jest": "^29.5.0",
    "nodemon": "^2.0.22"
  }
}
```

## 3. VRF Monitoring Implementation

### Create Monitoring Service Structure

```bash
cd ../monitoring
npm init -y
npm install express ethers dotenv node-cron mongodb
```

### Implement VRF Monitor

```javascript
// vrf-monitor.js
const ethers = require('ethers');
const { MongoClient } = require('mongodb');
require('dotenv').config();

// Connect to MongoDB
const mongoClient = new MongoClient(process.env.MONGODB_URI);
let db;

// Interface for checking VRF
const VRF_INTERFACE = [
  'function lastResponseTime() external view returns (uint256)',
  'function isActive() external view returns (bool)'
];

// Monitor VRF status
async function monitorVRF() {
  try {
    // Connect to MongoDB if not connected
    if (!db) {
      await mongoClient.connect();
      db = mongoClient.db();
      console.log('Connected to MongoDB');
    }
    
    // Connect to blockchain
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    
    // Connect to VRF validator
    const validator = new ethers.Contract(
      process.env.VRF_VALIDATOR,
      VRF_INTERFACE,
      provider
    );
    
    // Check VRF status
    const isActive = await validator.isActive();
    const lastResponse = await validator.lastResponseTime();
    const now = Math.floor(Date.now() / 1000);
    
    // Calculate outage duration if any
    const outageDuration = isActive ? 0 : now - lastResponse.toNumber();
    
    // Create status record
    const statusRecord = {
      timestamp: new Date(),
      status: isActive ? 'active' : 'inactive',
      lastResponseTime: new Date(lastResponse.toNumber() * 1000),
      outageDurationSeconds: outageDuration
    };
    
    // Save to MongoDB
    await db.collection('vrf_status').insertOne(statusRecord);
    
    // If inactive for more than 10 minutes (600 seconds), log warning
    if (!isActive && outageDuration > 600) {
      const alertRecord = {
        timestamp: new Date(),
        type: 'vrf_outage',
        severity: 'warning',
        duration: outageDuration,
        message: `VRF outage detected. Duration: ${Math.floor(outageDuration / 60)} minutes.`
      };
      
      await db.collection('alerts').insertOne(alertRecord);
      console.warn(`⚠️ VRF OUTAGE: ${alertRecord.message}`);
    }
    
    console.log(`VRF Status: ${isActive ? 'Active ✅' : 'Inactive ❌'}, Last response: ${statusRecord.lastResponseTime.toISOString()}`);
    
    return statusRecord;
  } catch (error) {
    console.error('Error monitoring VRF:', error);
    
    // Log error to database if connected
    if (db) {
      await db.collection('errors').insertOne({
        timestamp: new Date(),
        service: 'vrf-monitor',
        error: error.message,
        stack: error.stack
      });
    }
    
    throw error;
  }
}

// Export for use in API
module.exports = { monitorVRF };

// If run directly, execute monitor function
if (require.main === module) {
  monitorVRF()
    .then(status => console.log('Monitoring complete:', status))
    .catch(error => console.error('Monitoring failed:', error))
    .finally(() => mongoClient.close());
}
```

### Create Monitor API

```javascript
// index.js
const express = require('express');
const cron = require('node-cron');
const { monitorVRF } = require('./vrf-monitor');
require('dotenv').config();

const app = express();
const PORT = process.env.MONITORING_PORT || 3002;

// Latest VRF status
let lastStatus = null;

// Get VRF status endpoint
app.get('/api/vrf/status', async (req, res) => {
  try {
    // Return cached status if available and less than 1 minute old
    if (lastStatus && (Date.now() - new Date(lastStatus.timestamp).getTime()) < 60000) {
      return res.status(200).json(lastStatus);
    }
    
    // Otherwise, get fresh status
    const status = await monitorVRF();
    lastStatus = status;
    
    res.status(200).json(status);
  } catch (error) {
    console.error('Error getting VRF status:', error);
    res.status(500).json({ error: 'Failed to get VRF status' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Schedule monitoring job every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    console.log('Running scheduled VRF status check');
    lastStatus = await monitorVRF();
  } catch (error) {
    console.error('Scheduled VRF check failed:', error);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Monitoring service running on port ${PORT}`);
  
  // Run initial check
  monitorVRF()
    .then(status => {
      lastStatus = status;
      console.log('Initial VRF check complete');
    })
    .catch(error => console.error('Initial VRF check failed:', error));
});
```

## 4. Docker Development Environment

### Create a Docker Compose File for Local Services

```yaml
# docker-compose.yml
version: '3'

services:
  # MongoDB for local development
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=dragon-dev

  # Metadata service
  metadata-service:
    build:
      context: ./metadata-service
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    volumes:
      - ./metadata-service:/app
      - /app/node_modules
    environment:
      - PORT=3001
      - RPC_URL=${RPC_URL}
      - CHAIN_ID=${CHAIN_ID}
      - DELAYED_ENTRY_COMPENSATION=${DELAYED_ENTRY_COMPENSATION}
    depends_on:
      - mongodb

  # Monitoring service
  monitoring-service:
    build:
      context: ./monitoring
      dockerfile: Dockerfile
    ports:
      - "3002:3002"
    volumes:
      - ./monitoring:/app
      - /app/node_modules
    environment:
      - PORT=3002
      - RPC_URL=${RPC_URL}
      - CHAIN_ID=${CHAIN_ID}
      - VRF_VALIDATOR=${VRF_VALIDATOR}
      - MONGODB_URI=mongodb://mongodb:27017/dragon-dev
    depends_on:
      - mongodb

volumes:
  mongodb_data:
```

### Create Dockerfiles for Each Service

```dockerfile
# metadata-service/Dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3001

CMD ["npm", "run", "dev"]
```

```dockerfile
# monitoring/Dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3002

CMD ["node", "index.js"]
```

## 5. Testing Your Local Services

### Start the Development Environment

```bash
# Start all services
docker-compose up -d

# Check logs for a specific service
docker-compose logs -f metadata-service
```

### Test Metadata Service

```bash
# Test metadata endpoint
curl http://localhost:3001/api/metadata/token/1
```

### Test VRF Monitor

```bash
# Test VRF status endpoint
curl http://localhost:3002/api/vrf/status
```

## 6. Creating a Red Envelope Service

### Create Red Envelope Service Structure

```bash
cd ../red-envelope-service
npm init -y
npm install express ethers dotenv cors mongodb
```

### Implement Red Envelope Contract Interface

```javascript
// src/services/contract.js
const ethers = require('ethers');
require('dotenv').config();

// ABI for Red Envelopes (simplified)
const RED_ENVELOPE_ABI = [
  'function createEnvelope(uint256 amount, uint256 maxClaimers, uint256 expiryTime) external returns (uint256)',
  'function getEnvelope(uint256 envelopeId) external view returns (address creator, uint256 amount, uint256 maxClaimers, uint256 claimedCount, uint256 expiryTime, bool reclaimed)',
  'function claimFromEnvelope(uint256 envelopeId) external',
  'function reclaimExpiredEnvelope(uint256 envelopeId) external',
  'function getEnvelopeCount() external view returns (uint256)',
  'event EnvelopeCreated(uint256 indexed envelopeId, address indexed creator, uint256 amount, uint256 maxClaimers, uint256 expiryTime)',
  'event EnvelopeClaimed(uint256 indexed envelopeId, address indexed claimer, uint256 amount)',
  'event EnvelopeReclaimed(uint256 indexed envelopeId, address indexed creator, uint256 reclaimedAmount)'
];

// Create a provider and signer
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);

// Only use private key if provided (for admin functions)
let signer = null;
if (process.env.DEV_PRIVATE_KEY) {
  signer = new ethers.Wallet(process.env.DEV_PRIVATE_KEY, provider);
}

// Connect to Red Envelope contract
const redEnvelopeContract = new ethers.Contract(
  process.env.RED_ENVELOPES,
  RED_ENVELOPE_ABI,
  signer || provider
);

// Get envelope details
async function getEnvelope(envelopeId) {
  try {
    const envelope = await redEnvelopeContract.getEnvelope(envelopeId);
    
    return {
      id: envelopeId,
      creator: envelope.creator,
      amount: ethers.utils.formatEther(envelope.amount),
      maxClaimers: envelope.maxClaimers.toNumber(),
      claimedCount: envelope.claimedCount.toNumber(),
      expiryTime: new Date(envelope.expiryTime.toNumber() * 1000),
      reclaimed: envelope.reclaimed,
      isExpired: envelope.expiryTime.toNumber() < Math.floor(Date.now() / 1000)
    };
  } catch (error) {
    console.error(`Error getting envelope ${envelopeId}:`, error);
    throw error;
  }
}

// Check for expired envelopes
async function checkExpiredEnvelopes() {
  try {
    // This would be admin functionality requiring a private key
    if (!signer) {
      throw new Error('Private key required for admin functions');
    }
    
    const envelopeCount = await redEnvelopeContract.getEnvelopeCount();
    const now = Math.floor(Date.now() / 1000);
    const expiredEnvelopes = [];
    
    // Check last 100 envelopes for simplicity (in production would be more sophisticated)
    const startId = Math.max(1, envelopeCount.toNumber() - 100);
    
    for (let i = startId; i <= envelopeCount.toNumber(); i++) {
      try {
        const envelope = await redEnvelopeContract.getEnvelope(i);
        
        // If expired, not reclaimed, and still has funds
        if (
          envelope.expiryTime.toNumber() < now && 
          !envelope.reclaimed && 
          envelope.claimedCount.toNumber() < envelope.maxClaimers.toNumber()
        ) {
          expiredEnvelopes.push({
            id: i,
            creator: envelope.creator,
            remaining: envelope.maxClaimers.toNumber() - envelope.claimedCount.toNumber(),
            expiredAt: new Date(envelope.expiryTime.toNumber() * 1000)
          });
          
          // Attempt to reclaim
          // In a real service, you'd want to queue these and process carefully
          console.log(`Reclaiming expired envelope #${i}`);
          const tx = await redEnvelopeContract.reclaimExpiredEnvelope(i);
          await tx.wait();
          console.log(`Reclaimed envelope #${i}, tx: ${tx.hash}`);
        }
      } catch (error) {
        console.error(`Error processing envelope ${i}:`, error);
        // Continue to the next envelope
      }
    }
    
    return expiredEnvelopes;
  } catch (error) {
    console.error('Error checking expired envelopes:', error);
    throw error;
  }
}

module.exports = {
  getEnvelope,
  checkExpiredEnvelopes
};
```

### Create Development Scripts

Create scripts to start all your services together:

```bash
# Create start script
cat > start-dev.sh << 'EOF'
#!/bin/bash
echo "Starting Dragon Ecosystem Development Environment"

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "docker-compose is required but not installed. Please install it first."
    exit 1
fi

# Start Docker services
echo "Starting Docker services..."
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 5

# Check service health
echo "Checking service health..."
metadata_health=$(curl -s http://localhost:3001/health | grep -o "ok")
monitor_health=$(curl -s http://localhost:3002/health | grep -o "ok")

if [[ "$metadata_health" == "ok" && "$monitor_health" == "ok" ]]; then
    echo "All services are up and running!"
    echo "Metadata service: http://localhost:3001"
    echo "Monitoring service: http://localhost:3002"
    echo "MongoDB: mongodb://localhost:27017/dragon-dev"
else
    echo "Some services failed to start properly. Check the logs with: docker-compose logs"
fi
EOF

chmod +x start-dev.sh
```

## Preparing for Cloud Deployment

When you're ready to deploy to Google Cloud, you'll need to package your services:

### Create Production Dockerfiles

```dockerfile
# metadata-service/Dockerfile.prod
FROM node:16-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

FROM node:16-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY --from=builder /app/index.js ./

ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "index.js"]
```

### Create Cloud Build Configuration

```yaml
# cloudbuild.yaml
steps:
  # Build metadata service
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/${PROJECT_ID}/metadata-service:${SHORT_SHA}', '-f', 'metadata-service/Dockerfile.prod', './metadata-service']
  
  # Build monitoring service
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/${PROJECT_ID}/monitoring-service:${SHORT_SHA}', '-f', 'monitoring/Dockerfile', './monitoring']
  
  # Push images to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/${PROJECT_ID}/metadata-service:${SHORT_SHA}']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/${PROJECT_ID}/monitoring-service:${SHORT_SHA}']
  
  # Deploy to Cloud Run when ready
  # - name: 'gcr.io/cloud-builders/gcloud'
  #   args: ['run', 'deploy', 'metadata-service', '--image', 'gcr.io/${PROJECT_ID}/metadata-service:${SHORT_SHA}', '--region', 'us-central1', '--platform', 'managed']

images:
  - 'gcr.io/${PROJECT_ID}/metadata-service:${SHORT_SHA}'
  - 'gcr.io/${PROJECT_ID}/monitoring-service:${SHORT_SHA}'
```

## Development Testing Strategy

1. **Test contract interactions locally**: Use your local services to test interactions with deployed contracts on the Sonic chain.

2. **Simulate VRF outages**: Use the monitoring service to test your system's response to VRF outages.

3. **Test NFT metadata display**: Ensure your metadata service correctly renders NFT information for wallets.

4. **Monitor blockchain events**: Test your event monitoring for whitelist registrations and other important events.

Once you've validated your services locally, you'll be ready to deploy them to Google Cloud using the commands in the `DRAGON_GCP_SETUP_GUIDE.md` file. 