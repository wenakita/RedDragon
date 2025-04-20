# Dragon Project Cloud Functions

This directory contains Google Cloud Functions that support the Dragon Project's blockchain operations with off-chain infrastructure.

## Functions Overview

### 1. Lottery Trigger (`lottery-trigger/`)

A Cloud Function that automatically triggers the Dragon Lottery swap mechanism on a scheduled basis. It can use either scratchers or promotional items for swaps and logs detailed information to Cloud Logging.

### 2. Lottery Monitor (`lottery-monitor/`)

A Cloud Function that monitors Dragon Lottery events, stores them in BigQuery for analytics, and publishes them to PubSub for notifications and further processing.

### 3. Lottery Notifications (`lottery-notifications/`)

A Cloud Function that receives lottery events via PubSub and sends formatted notifications to Discord and Telegram channels. It provides real-time updates on lottery swaps and jackpot wins.

## Project Setup

To set up these cloud functions, follow these steps:

1. Make sure you have the Google Cloud SDK installed:
   ```
   curl https://sdk.cloud.google.com | bash
   gcloud init
   ```

2. Enable required Google Cloud APIs:
   ```
   gcloud services enable cloudfunctions.googleapis.com \
                          cloudbuild.googleapis.com \
                          cloudscheduler.googleapis.com \
                          bigquery.googleapis.com \
                          storage.googleapis.com \
                          logging.googleapis.com \
                          pubsub.googleapis.com \
                          run.googleapis.com \
                          artifactregistry.googleapis.com \
                          secretmanager.googleapis.com
   ```

3. Create a storage bucket:
   ```
   gsutil mb -p sonic-red-dragon -l us-central1 gs://sonic-red-dragon-bucket
   ```

4. Create a PubSub topic:
   ```
   gcloud pubsub topics create lottery-events
   ```

5. Set up secrets in Secret Manager (for notifications):
   ```
   # For Discord webhook
   echo -n "your-discord-webhook-url" | \
   gcloud secrets create discord-webhook \
   --replication-policy="automatic" \
   --data-file=-
   
   # For Telegram Bot token
   echo -n "your-telegram-bot-token" | \
   gcloud secrets create telegram-bot-token \
   --replication-policy="automatic" \
   --data-file=-
   
   # For Telegram chat ID
   echo -n "your-telegram-chat-id" | \
   gcloud secrets create telegram-chat-id \
   --replication-policy="automatic" \
   --data-file=-
   ```

## Deployment

Each function has its own detailed deployment instructions in its respective directory. Generally, you will:

1. Configure the `.env` file with your specific parameters
2. Deploy the function using `gcloud functions deploy`
3. Set up Cloud Scheduler to automate function execution (for trigger functions)

## Security Considerations

When implementing these cloud functions, be aware of:

- Private keys should never be stored in the code or committed to version control
- Use Secret Manager for sensitive information
- Set up proper IAM permissions
- Review the logging setup to ensure no sensitive data is logged
- Ensure secure connection to the blockchain RPC endpoints

## Compliance with Dragon Project Rules

These Cloud Functions have been designed with the Dragon Project Rules in mind:

- They do not interfere with the VRF implementation as the primary source of randomness
- They maintain the integrity of function visibility and security concerns
- They follow the configuration and naming standards

## Directory Structure

```
cloud-functions/
├── README.md                       # This file
├── lottery-trigger/                # Function to trigger lottery swaps
│   ├── index.js                    # Main function code
│   ├── package.json                # Dependencies
│   ├── .env.example                # Example environment variables
│   └── README.md                   # Function-specific documentation
├── lottery-monitor/                # Function to monitor lottery events
│   ├── index.js                    # Main function code
│   ├── package.json                # Dependencies
│   ├── .env.example                # Example environment variables
│   └── README.md                   # Function-specific documentation
└── lottery-notifications/          # Function to send notifications
    ├── index.js                    # Main function code
    ├── package.json                # Dependencies
    ├── .env.example                # Example environment variables
    └── README.md                   # Function-specific documentation
``` 