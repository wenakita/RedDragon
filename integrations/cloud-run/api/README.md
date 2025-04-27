# Dragon API

A REST API for the Dragon Project on Sonic blockchain.

## Features

- Get Dragon token information
- Get Jackpot information
- Get user balances
- All endpoints are read-only (view functions)

## Endpoints

- `GET /` - API status and contract addresses
- `GET /api/dragon/info` - Get Dragon token information
- `GET /api/jackpot/info` - Get Jackpot information
- `GET /api/user/:address` - Get user balance

## Deployment

### Local Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Deploy to Google Cloud Run

```bash
# From the project root
cd integrations/cloud-run/api

# Deploy using gcloud
gcloud run deploy dragon-api \
  --project=sonic-red-dragon \
  --region=us-central1 \
  --source=. \
  --allow-unauthenticated
```

## Environment Variables

The following environment variables need to be set:

- `PORT` - Port to listen on (defaults to 8080)
- `CONTRACT_DRAGON` - Dragon token contract address
- `CONTRACT_JACKPOT` - Jackpot contract address 