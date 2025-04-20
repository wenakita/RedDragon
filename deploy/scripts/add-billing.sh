#!/bin/bash
# Script to add billing account to GCP project

# Exit on error
set -e

# Get the project ID (the last created one)
PROJECT_ID=$(gcloud projects list --format="value(projectId)" --sort-by=createTime | tail -n 1)
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
echo "Most recently created project ID: $PROJECT_ID (Number: $PROJECT_NUMBER)"

# Check if billing is already enabled
BILLING_INFO=$(gcloud billing projects describe $PROJECT_ID 2>/dev/null || echo "NOT_FOUND")
if [[ "$BILLING_INFO" != *"NOT_FOUND"* ]]; then
  echo "Billing is already enabled for this project."
  echo "You can continue with the deployment:"
  echo "./dragon-deploy.sh --continue"
  exit 0
fi

# List available billing accounts
echo "Available billing accounts:"
gcloud billing accounts list

# If no billing accounts are found
if [ $? -ne 0 ] || [ -z "$(gcloud billing accounts list --format='value(name)')" ]; then
  echo "No billing accounts found. Please create one at https://console.cloud.google.com/billing"
  echo "After creating a billing account, run this script again."
  exit 1
fi

echo ""
echo "Please enter your billing account ID from the list above:"
read BILLING_ACCOUNT_ID

# Link billing account to project
echo "Linking billing account $BILLING_ACCOUNT_ID to project $PROJECT_ID..."
gcloud billing projects link $PROJECT_ID --billing-account=$BILLING_ACCOUNT_ID

# Verify billing is linked
echo "Verifying billing account linkage..."
BILLING_VERIFY=$(gcloud billing projects describe $PROJECT_ID --format="value(billingEnabled)")

if [ "$BILLING_VERIFY" = "True" ]; then
  echo "Billing account linked successfully."
  
  # Create the PubSub topic for budget alerts
  echo "Creating PubSub topic for budget alerts..."
  gcloud services enable pubsub.googleapis.com --project=$PROJECT_ID || true
  gcloud pubsub topics create budget-alerts --project=$PROJECT_ID || true
  
  # Set up budget with $20 limit
  echo "Setting up budget alert..."
  gcloud billing budgets create \
    --billing-account=$BILLING_ACCOUNT_ID \
    --display-name="Dragon Ecosystem Budget" \
    --budget-amount=20USD \
    --threshold-rules=threshold-percent=0.5 \
    --threshold-rules=threshold-percent=0.9 \
    --all-updates-rule-pubsub-topic=projects/$PROJECT_ID/topics/budget-alerts || echo "Could not set up budget alert. You can set this up manually later."
  
  echo ""
  echo "You can now continue with the deployment script:"
  echo "./dragon-deploy.sh --continue"
else
  echo "ERROR: Failed to link billing account. Please verify your billing account ID and try again."
  echo "If the problem persists, try linking the billing account manually through the Google Cloud Console:"
  echo "https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID"
  exit 1
fi 