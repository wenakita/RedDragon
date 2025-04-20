# Dragon Project Cloud Functions Deployment Guide

This document provides step-by-step instructions for deploying all the cloud functions for the Dragon Project.

## Prerequisites

1. Google Cloud SDK is installed and initialized:
   ```bash
   curl https://sdk.cloud.google.com | bash
   gcloud init
   ```

2. Node.js and npm are installed

## Initial Setup (Already Completed)

The following steps have already been completed for the project:

1. Created and linked billing account:
   ```bash
   gcloud billing projects link sonic-red-dragon --billing-account=01F42B-707B0B-A0E6CC
   ```

2. Enabled necessary Google Cloud APIs:
   ```bash
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

3. Created storage bucket:
   ```bash
   gsutil mb -p sonic-red-dragon -l us-central1 gs://sonic-red-dragon-bucket
   ```

4. Created PubSub topic:
   ```bash
   gcloud pubsub topics create lottery-events
   ```

5. Set up secrets in Secret Manager:
   ```bash
   echo -n "https://discord.com/api/webhooks/your-webhook-url" | \
   gcloud secrets create discord-webhook --replication-policy="automatic" --data-file=-
   
   echo -n "your-telegram-bot-token" | \
   gcloud secrets create telegram-bot-token --replication-policy="automatic" --data-file=-
   
   echo -n "your-telegram-chat-id" | \
   gcloud secrets create telegram-chat-id --replication-policy="automatic" --data-file=-
   ```

## Media Resource Setup

1. For the lottery notifications, you can use either of these approaches:

   **Option 1: (Recommended) Use the local MP4 file directly**
   - The MP4 file is already included in the `lottery-notifications` directory
   - This file will be uploaded with the function when deployed
   - No additional configuration needed - the function will use this file automatically

   **Option 2: (Fallback) Upload the Dragon MP4 animation to Cloud Storage:**
   ```bash
   # Navigate to the directory containing the MP4 file
   cd cloud-functions/lottery-notifications

   # Upload the file to Cloud Storage with public access
   gsutil cp "20250419_0659_Dragon's Fiery Jackpot_simple_compose_01js75h2ebejb822q9dvtmjq1c.mp4" gs://sonic-red-dragon-bucket/dragon-jackpot.mp4

   # Make the file publicly accessible
   gsutil acl ch -u AllUsers:R gs://sonic-red-dragon-bucket/dragon-jackpot.mp4
   ```

   The URL for this file is:
   ```
   https://storage.googleapis.com/sonic-red-dragon-bucket/dragon-jackpot.mp4
   ```

   Configure this URL as the `DRAGON_MP4_URL` environment variable in the `.env` file (it will be used as a fallback if the local file can't be sent).

## Function Deployment

### 1. Lottery Trigger Function

1. Navigate to the function directory:
   ```bash
   cd cloud-functions/lottery-trigger
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create an `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

4. Edit the `.env` file with your specific values:
   ```bash
   nano .env
   ```
   
   Update the contract addresses, RPC URL, and private key.

5. Deploy the function:
   ```bash
   gcloud functions deploy lottery-trigger \
     --runtime nodejs16 \
     --trigger-http \
     --allow-unauthenticated \
     --env-vars-file .env \
     --memory=256MB \
     --region=us-central1
   ```

6. Set up a scheduler to run the function every 6 hours:
   ```bash
   gcloud scheduler jobs create http dragon-lottery-trigger \
     --schedule="0 */6 * * *" \
     --uri="$(gcloud functions describe lottery-trigger --region=us-central1 --format='value(httpsTrigger.url)')" \
     --http-method=GET \
     --oidc-service-account-email=sonic-red-dragon@appspot.gserviceaccount.com
   ```

### 2. Lottery Monitor Function

1. Navigate to the function directory:
   ```bash
   cd ../lottery-monitor
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create an `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

4. Edit the `.env` file with your specific values:
   ```bash
   nano .env
   ```
   
   Update the contract address and RPC URL.

5. Deploy the function:
   ```bash
   gcloud functions deploy lottery-monitor \
     --runtime nodejs16 \
     --trigger-http \
     --allow-unauthenticated \
     --env-vars-file .env \
     --memory=256MB \
     --timeout=540s \
     --region=us-central1
   ```

6. Set up a scheduler to run the function every 15 minutes:
   ```bash
   gcloud scheduler jobs create http dragon-lottery-monitor \
     --schedule="*/15 * * * *" \
     --uri="$(gcloud functions describe lottery-monitor --region=us-central1 --format='value(httpsTrigger.url)')" \
     --http-method=GET \
     --oidc-service-account-email=sonic-red-dragon@appspot.gserviceaccount.com
   ```

### 3. Lottery Notifications Function

1. Navigate to the function directory:
   ```bash
   cd ../lottery-notifications
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create an `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

4. Edit the `.env` file with your specific values:
   ```bash
   nano .env
   ```
   
   Update the token addresses and notification settings. The MP4 URL is optional since the function will first try to use the local MP4 file included in the deployment.

5. Deploy the function (including the MP4 file):
   ```bash
   gcloud functions deploy lottery-notifications \
     --gen2 \
     --runtime=nodejs16 \
     --trigger-topic=lottery-events \
     --entry-point=lotteryNotifications \
     --env-vars-file .env \
     --memory=256MB \
     --region=us-central1
   ```

## Verification

1. Verify the functions have been deployed:
   ```bash
   gcloud functions list
   ```

2. Verify the scheduler jobs have been created:
   ```bash
   gcloud scheduler jobs list
   ```

3. Test the trigger function manually:
   ```bash
   curl $(gcloud functions describe lottery-trigger --region=us-central1 --format='value(httpsTrigger.url)')
   ```

4. Check the function logs:
   ```bash
   gcloud functions logs read lottery-trigger --limit=50
   gcloud functions logs read lottery-monitor --limit=50
   gcloud functions logs read lottery-notifications --limit=50
   ```

## Updating Functions

To update a function after making changes:

1. Navigate to the function directory

2. Re-deploy using the same deployment command as above

## Troubleshooting

- If a function fails, check the logs for error messages
- Ensure all environment variables are correctly set
- Verify that the contract addresses are correct
- Check that the RPC endpoint is available and responding
- Verify that the private key has sufficient funds for gas (for trigger function)
- Ensure that the required APIs are enabled in Google Cloud
- Check IAM permissions for accessing Secret Manager

## Security Notes

- The private key for the trigger function should have minimal funds, only enough for gas
- Regularly rotate the private key for additional security
- Consider using Secret Manager for storing private keys instead of environment variables
- Do not use the same private key for dev/test and production environments 