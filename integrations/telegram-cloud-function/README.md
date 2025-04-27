# Telegram Google Cloud Function

This is a minimal Google Cloud Function for handling Telegram webhook updates using [Telegraf](https://telegraf.js.org/).

## Features
- Loads the Telegram bot token from Google Secret Manager
- Handles HTTP requests for the Telegram bot webhook
- Minimal, production-ready structure

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure your Google Secret Manager:**
   Ensure you have a secret named `telegram-bot-token` in your Google Cloud project.

3. **Deploy the function:**
   ```bash
   gcloud functions deploy telegramWebhook \
     --gen2 \
     --runtime=nodejs20 \
     --trigger-http \
     --entry-point=telegramWebhook \
     --region=us-central1 \
     --allow-unauthenticated
   ```

## Notes
- The function expects the environment variable `GCP_PROJECT`, `GOOGLE_CLOUD_PROJECT`, or `PROJECT_ID` to be set (Google Cloud sets these automatically).
- Extend `index.js` with your bot logic as needed.
