#!/bin/bash
set -e

PROJECT_ID="sonic-red-dragon"
SERVICE_NAME="dragon-dashboard-generator"
BUCKET_NAME="sonic-red-dragon-dashboard"

# Get the service account for the Cloud Run service
SERVICE_ACCOUNT=$(gcloud run services describe ${SERVICE_NAME} \
  --platform=managed \
  --region=us-central1 \
  --project=${PROJECT_ID} \
  --format="value(spec.template.spec.serviceAccountName)")

echo "Service account for ${SERVICE_NAME} is ${SERVICE_ACCOUNT}"

# Grant the service account access to the bucket
echo "Granting Object Viewer access to ${SERVICE_ACCOUNT} on bucket ${BUCKET_NAME}..."
gsutil iam ch "serviceAccount:${SERVICE_ACCOUNT}:roles/storage.objectViewer" gs://${BUCKET_NAME}

# Grant the service account permissions to sign URLs
echo "Granting Storage Object User role to ${SERVICE_ACCOUNT}..."
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/storage.objectUser"

echo "✅ Permissions set up successfully!" 