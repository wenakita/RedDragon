# Dragon Lottery Trigger Function

This Cloud Function is designed to trigger the Dragon Lottery swap mechanism on a scheduled basis using Google Cloud Functions.

## Features

- Automatically triggers lottery swaps at scheduled intervals
- Can use either scratchers or promotional items for swaps
- Logs detailed information to Cloud Logging
- Configurable parameters through environment variables

## Prerequisites

- Google Cloud Platform account with billing enabled
- Firebase CLI or Google Cloud SDK installed
- Node.js and npm
- Access to a private key with sufficient funds for gas

## Setup

1. Copy `.env.example` to `.env` and fill in your specific values:
   ```
   cp .env.example .env
   ```

2. Update the environment variables in `.env` with your contract addresses, private key, and other settings.

3. Install dependencies:
   ```
   npm install
   ```

## Deployment

### Deploy to Google Cloud Functions

```bash
gcloud functions deploy lottery-trigger \
  --runtime nodejs16 \
  --trigger-http \
  --allow-unauthenticated \
  --env-vars-file .env \
  --memory=256MB \
  --region=us-central1
```

### Set up Cloud Scheduler

To automate the function execution on a schedule:

```bash
gcloud scheduler jobs create http dragon-lottery-trigger \
  --schedule="0 */6 * * *" \
  --uri="https://REGION-PROJECT_ID.cloudfunctions.net/lottery-trigger" \
  --http-method=GET \
  --oidc-service-account-email=PROJECT_ID@appspot.gserviceaccount.com
```

This example runs the lottery trigger every 6 hours.

## Security Considerations

- Never commit your `.env` file with private keys to version control
- Consider using Secret Manager for storing sensitive information
- Ensure your cloud function has appropriate IAM permissions
- Monitor function execution and gas costs regularly

## Testing

You can test the function locally before deployment:

```bash
npm install -g @google-cloud/functions-framework
functions-framework --target=triggerLottery
```

Then send a request to `http://localhost:8080/` 