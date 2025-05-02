#!/bin/bash

# Set environment variables for local BigQuery and Firestore debug
export GOOGLE_CLOUD_PROJECT="sonic-red-dragon"
export PROJECT_ID="sonic-red-dragon"
export BQ_DATASET_ID="referrals"
export BQ_TABLE_ID="referrals_imported"

# Run the debug script
node scripts/print_latest_bigquery_firestore.js
