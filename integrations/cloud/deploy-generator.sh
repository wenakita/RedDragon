#!/bin/bash
set -e

PROJECT_ID="sonic-red-dragon"
REGION="us-central1"
REPOSITORY="cloud-run-source-deploy"
SERVICE_NAME="dragon-dashboard-generator"
IMAGE_NAME="us-central1-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE_NAME}:latest"

echo "🔵 Starting deployment of ${SERVICE_NAME}..."

# Ensure repository exists
if ! gcloud artifacts repositories describe ${REPOSITORY} --project=${PROJECT_ID} --location=${REGION} >/dev/null 2>&1; then
  echo "🔵 Creating repository ${REPOSITORY}..."
  gcloud artifacts repositories create ${REPOSITORY} --repository-format=docker --location=${REGION} --project=${PROJECT_ID}
fi

# Build the image
echo "🔵 Building image using Cloud Build..."
gcloud builds submit ./integrations/cloud-run/generator \
  --project=${PROJECT_ID} \
  --tag=${IMAGE_NAME} \
  --timeout=15m

# Wait for build to complete
echo "🔵 Waiting for build to complete..."
sleep 30

# Check if image exists
echo "🔵 Verifying image exists..."
if ! gcloud artifacts docker images describe ${IMAGE_NAME} --project=${PROJECT_ID} >/dev/null 2>&1; then
  echo "❌ Image not found. Build may have failed."
  exit 1
fi

# Deploy to Cloud Run
echo "🔵 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image=${IMAGE_NAME} \
  --platform=managed \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --allow-unauthenticated

echo "✅ Deployment complete!"
echo "🌐 Service URL: $(gcloud run services describe ${SERVICE_NAME} --platform=managed --region=${REGION} --project=${PROJECT_ID} --format='value(status.url)')" 