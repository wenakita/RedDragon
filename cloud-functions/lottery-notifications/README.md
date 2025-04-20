# Dragon Lottery Notifications Function

This Cloud Function generates and sends notifications for Dragon Lottery events via Discord and Telegram. It's triggered by PubSub messages published by the lottery-monitor function.

## Features

- Processes lottery and jackpot win events
- Formats event data into user-friendly notifications
- Supports multiple notification channels (Discord, Telegram)
- Uses Secret Manager for secure storage of API keys and tokens

## Prerequisites

- Google Cloud Platform account with billing enabled
- PubSub topic set up for lottery events
- Secret Manager with the following secrets configured:
  - `discord-webhook`: Discord webhook URL
  - `telegram-bot-token`: Telegram Bot API token
  - `telegram-chat-id`: Telegram chat ID where notifications will be sent
- Firebase CLI or Google Cloud SDK installed
- Node.js and npm

## Setup

1. Copy `.env.example` to `.env` and fill in your specific values:
   ```
   cp .env.example .env
   ```

2. Update the environment variables in `.env` with your contract addresses and settings.

3. Install dependencies:
   ```
   npm install
   ```

4. Set up secrets in Secret Manager:
   ```bash
   # For Discord webhook
   echo -n "https://discord.com/api/webhooks/your-webhook-url" | \
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

### Deploy to Google Cloud Functions

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

## Notification Format

### Discord Notifications

Notifications are sent as rich embeds with:
- Title indicating event type (e.g., "🎉 Jackpot Winner!")
- Message with details about the swap or win
- Link to the transaction on the block explorer
- Color coding (red for important notifications, blue for normal notifications)

### Telegram Notifications

Notifications are sent as markdown-formatted messages with:
- Bold title indicating event type
- Message with details about the swap or win
- Link to the transaction on the block explorer

## Security Considerations

- Never commit your `.env` file to version control
- Use Secret Manager for all sensitive API keys and tokens
- Ensure proper IAM permissions for the function to access Secret Manager
- Consider implementing rate limiting to prevent spam in case of high event volumes

## Testing

To test locally, you can simulate a PubSub message:

1. Create a sample message file:
   ```
   {
     "data": {
       "event_type": "JackpotWon",
       "user_address": "0x1234567890abcdef1234567890abcdef12345678",
       "jackpot_amount": "1000000000000000000000",
       "lottery_type": "2",
       "transaction_hash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
     }
   }
   ```

2. Base64 encode the message:
   ```
   cat sample-message.json | base64
   ```

3. Use the output to construct a test event payload for local testing. 