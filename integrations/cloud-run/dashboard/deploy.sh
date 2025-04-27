#!/bin/bash

# Dragon Dashboard Deployment Script
# This script builds and deploys the dashboard to Google Cloud Run

set -e

# Configuration
PROJECT_ID=${GCP_PROJECT:-"dragon-project"}
SERVICE_NAME="dragon-dashboard"
REGION="us-central1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Show script header
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN} Dragon Dashboard Deployment${NC}"
echo -e "${GREEN}================================================${NC}"

# Check for Google Cloud SDK
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: Google Cloud SDK not installed${NC}"
    echo "Please install the Google Cloud SDK first."
    exit 1
fi

# Check if logged in
echo -e "${YELLOW}Checking GCP authentication...${NC}"
ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null || echo "")
if [ -z "$ACTIVE_ACCOUNT" ]; then
    echo -e "${RED}Not authenticated with GCP.${NC}"
    echo "Please run 'gcloud auth login' first."
    exit 1
fi
echo -e "${GREEN}Authenticated as: $ACTIVE_ACCOUNT${NC}"

# Set the correct project
echo -e "${YELLOW}Setting GCP project to $PROJECT_ID...${NC}"
gcloud config set project $PROJECT_ID

# Build the app
echo -e "${YELLOW}Building dashboard...${NC}"
npm install
npm run build

# Deploy to Cloud Run
echo -e "${YELLOW}Deploying to Cloud Run...${NC}"
gcloud run deploy $SERVICE_NAME \
  --source=. \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars="REACT_APP_API_URL=https://dragon-api-${REGION}.run.app,REACT_APP_RPC_URL=https://rpc.soniclabs.com,REACT_APP_CHAIN_ID=146${REACT_APP_CONTRACT_DRAGON:+,REACT_APP_CONTRACT_DRAGON=$REACT_APP_CONTRACT_DRAGON}"

# Get the deployed URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN} Deployment Successful!${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "Dashboard URL: ${SERVICE_URL}"
echo -e "View logs: gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME'"
echo -e "${GREEN}================================================${NC}" 