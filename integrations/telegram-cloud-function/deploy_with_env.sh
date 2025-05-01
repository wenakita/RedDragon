#!/bin/bash
# Usage: ./deploy_with_env.sh
# Deploys Google Cloud Function with all env vars from .env file

set -e

# Load all variables from .env (excluding comments and empty lines)
ENV_VARS=$(grep -v '^#' .env | grep -v '^$' | xargs | sed 's/ /,/g')

gcloud functions deploy telegramWebhook \
  --gen2 \
  --runtime=nodejs20 \
  --trigger-http \
  --entry-point=telegramWebhook \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-env-vars="$ENV_VARS"
