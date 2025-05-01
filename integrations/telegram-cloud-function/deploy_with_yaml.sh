#!/bin/bash
# Usage: ./deploy_with_yaml.sh
# Deploys Google Cloud Function with all env vars from gcf.env.yaml

set -e

YAML_FILE="gcf.env.yaml"

if [ ! -f "$YAML_FILE" ]; then
  echo "YAML file $YAML_FILE not found!"
  exit 1
fi

# Convert YAML to comma-separated key=value pairs
ENV_VARS=$(grep -v '^#' "$YAML_FILE" | grep -v '^$' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | sed 's/:[[:space:]]*/=/' | tr -d '"' | xargs | sed 's/ /,/g')

echo "Deploying with env vars:"
echo "$ENV_VARS"
echo

gcloud functions deploy telegramWebhook \
  --gen2 \
  --runtime=nodejs20 \
  --trigger-http \
  --entry-point=telegramWebhook \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-env-vars="$ENV_VARS"
