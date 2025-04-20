# Dragon Lottery Monitor Function

This Cloud Function monitors Dragon Lottery events on the blockchain, stores them in BigQuery, and publishes them to PubSub for further processing.

## Features

- Scans blockchain for lottery and jackpot events
- Stores event data in BigQuery for analytics
- Publishes events to PubSub for notifications and further processing
- Configurable block range for scanning

## Prerequisites

- Google Cloud Platform account with billing enabled
- BigQuery dataset and table setup
- PubSub topic created
- Firebase CLI or Google Cloud SDK installed
- Node.js and npm

## Setup

1. Copy `.env.example` to `.env` and fill in your specific values:
   ```
   cp .env.example .env
   ```

2. Update the environment variables in `.env` with your contract addresses and other settings.

3. Install dependencies:
   ```
   npm install
   ```

4. Create the PubSub topic:
   ```
   gcloud pubsub topics create lottery-events
   ```

## Deployment

### Deploy to Google Cloud Functions

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

### Set up Cloud Scheduler

To automate the function execution on a schedule:

```bash
gcloud scheduler jobs create http dragon-lottery-monitor \
  --schedule="*/15 * * * *" \
  --uri="https://REGION-PROJECT_ID.cloudfunctions.net/monitorLottery" \
  --http-method=GET \
  --oidc-service-account-email=PROJECT_ID@appspot.gserviceaccount.com
```

This example runs the lottery monitor every 15 minutes.

## BigQuery Analytics

Once data is collected in BigQuery, you can run queries like:

```sql
-- Get the total number of lottery swaps
SELECT COUNT(*) as total_swaps
FROM `PROJECT_ID.dragon_lottery.lottery_events`
WHERE event_type = 'LotterySwapExecuted';

-- Get the total amount won in jackpots
SELECT SUM(CAST(jackpot_amount AS NUMERIC)) as total_jackpot_amount
FROM `PROJECT_ID.dragon_lottery.lottery_events`
WHERE event_type = 'JackpotWon';

-- Get the number of winners per day
SELECT DATE(timestamp) as day, COUNT(*) as winners
FROM `PROJECT_ID.dragon_lottery.lottery_events`
WHERE is_winner = true
GROUP BY day
ORDER BY day DESC;
```

## Security Considerations

- Never commit your `.env` file to version control
- Consider using Secret Manager for storing sensitive information
- Ensure your cloud function has appropriate IAM permissions
- Set up appropriate access controls for BigQuery data

## Testing

You can test the function locally before deployment:

```bash
npm install -g @google-cloud/functions-framework
functions-framework --target=monitorLottery
```

Then send a request to `http://localhost:8080/` 