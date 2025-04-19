# Dragon Ecosystem Google Cloud Integration

This directory contains integrations with Google Cloud services for monitoring, analytics, and visualization of the Dragon Ecosystem's phased rollout.

## Features

- **Real-time monitoring** of smart contract events
- **Analytics tracking** for user interactions
- **Data visualization** via Google Data Studio / Looker Studio dashboards
- **Phase-specific metrics** for each rollout phase
- **Alerting and notifications** for critical events

## Setup

### Prerequisites

- Google Cloud SDK installed (https://cloud.google.com/sdk/docs/install)
- Node.js v16 or higher
- Google Cloud account with billing enabled
- ABI files for Dragon Ecosystem contracts

### Automatic Setup

Run the setup script to configure your Google Cloud environment:

```bash
# From the project root
cd integrations
npm install
npm run setup:google
```

This script will:
1. Create a Google Cloud project (or use an existing one)
2. Enable required APIs
3. Create a service account with necessary permissions
4. Set up BigQuery datasets and tables
5. Create Cloud Storage buckets
6. Configure PubSub topics
7. Generate an environment file (.env.google)

### Manual Configuration

After running the setup script, you'll need to:

1. Update the `.env.google` file with your specific configuration:
   - Add contract addresses
   - Configure Google Analytics settings
   - Set Looker Studio dashboard IDs (if available)

2. Copy ABI files:
   - Place the contract ABIs in the `abis` directory
   - Required ABIs: `BeetsLP.json`, `ve69LP.json`, `ve69LPPoolVoting.json`, `DragonShadowV3Swapper.json`

## Deployment

### Deploy Monitoring Functions

```bash
# Deploy contract monitoring function
npm run deploy:monitoring

# Deploy analytics processing function
npm run deploy:analytics

# Deploy dashboard server
npm run deploy:dashboard

# Deploy all components
npm run deploy:all
```

### Update Dashboards

```bash
# Update BigQuery views for dashboard data
npm run update:views

# Regenerate and deploy dashboards
npm run update:dashboards
```

## Monitoring Phases

Each phase of the Dragon Ecosystem rollout has dedicated monitoring and analytics:

### Phase 1: BeetsLP 69/31 with Locking

- LP token creation and locking activity
- Lock duration distribution
- User engagement metrics

### Phase 2: Voting Infrastructure

- Voting patterns
- Vote distribution across partners
- Voting power utilization

### Phase 3: Partner Integration

- Partner-specific boosts
- Transaction volume through partners
- Boost effectiveness

### Phase 4: Full Ecosystem

- Complete ecosystem performance
- Cross-phase comparison
- Growth metrics

## Dashboards

After deployment, dashboards will be available at:

```
https://storage.googleapis.com/dragon-dashboard-assets-PROJECT_ID/index.html
```

Where `PROJECT_ID` is your Google Cloud project ID.

## Development

### Local Testing

```bash
# Start the dashboard server locally
npm run start:local
```

### Analytics Export

```bash
# Export analytics data to Cloud Storage
npm run export:analytics
```

## Troubleshooting

### Common Issues

1. **Missing ABIs**: Ensure all required ABIs are in the `abis` directory
2. **Authentication Errors**: Check that the service account key is correctly referenced
3. **API Limits**: Increase quotas in Google Cloud Console if needed

### Logs

View logs in the Google Cloud Console:
- Cloud Functions logs: https://console.cloud.google.com/functions
- Cloud Run logs: https://console.cloud.google.com/run
- BigQuery logs: https://console.cloud.google.com/bigquery

## File Structure

```
google/
├── abis/                   # Contract ABIs
│   ├── BeetsLP.json
│   ├── ve69LP.json
│   ├── ve69LPPoolVoting.json
│   └── DragonShadowV3Swapper.json
├── analytics.js            # Google Analytics integration
├── contract-monitoring.js  # Smart contract event monitoring
├── dashboard.js            # Dashboard creation and deployment
├── setup.js                # Google Cloud setup script
└── README.md               # This file
```

## Architecture

```
┌────────────────┐    ┌───────────────┐    ┌────────────────┐
│ Smart Contract │───►│ Cloud Function │───►│    PubSub      │
└────────────────┘    └───────────────┘    └────────────────┘
                                                   │
                                                   ▼
┌────────────────┐    ┌───────────────┐    ┌────────────────┐
│   Dashboard    │◄───│  Cloud Run    │◄───│    BigQuery    │
└────────────────┘    └───────────────┘    └────────────────┘
``` 