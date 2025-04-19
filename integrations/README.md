# Dragon Ecosystem Integrations

This directory contains integration modules for connecting the Dragon Ecosystem with external services and platforms. These integrations enable monitoring, analytics, and marketing automation for the phased rollout of the Dragon Ecosystem.

## Available Integrations

### [Google Cloud Integration](./google/README.md)

Comprehensive integration with Google Cloud services for:
- Analytics tracking with Google Analytics + BigQuery
- Real-time monitoring of smart contract events
- Dashboards for visualizing ecosystem metrics
- Phase-specific data views for the rollout process

## Phased Rollout Integration

All integrations are designed to support the phased rollout approach outlined in the project documentation. Each phase has dedicated monitoring, analytics, and marketing components:

### Phase 1: BeetsLP 69/31 with Locking
- LP token creation tracking
- Lock duration analytics
- Liquidity growth monitoring

### Phase 2: Voting Infrastructure
- Voting activity tracking
- Partner vote distribution
- Voting power utilization

### Phase 3: Partner Integration
- Partner boost analytics
- Transaction volume monitoring
- Performance comparison

### Phase 4: Full Ecosystem
- Comprehensive ecosystem metrics
- Cross-phase performance analysis
- Long-term growth tracking

## Usage

Each integration has its own setup and usage instructions. Generally, the process involves:

1. Install dependencies: `npm install`
2. Run the setup script: `npm run setup:[integration-name]`
3. Configure environment variables
4. Deploy the integration: `npm run deploy:[integration-name]`

See the README in each integration directory for specific instructions.

## Development

To add a new integration:

1. Create a new directory: `mkdir integrations/[new-integration-name]`
2. Create standard files:
   - `README.md` - Documentation
   - `setup.js` - Setup script
   - `index.js` - Main entry point
3. Add scripts to the main `package.json`
4. Document the integration in this README

## Requirements

- Node.js v16 or higher
- Access to relevant external services (API keys, credentials)
- Project ABI files for contract interactions

## Future Integrations

Planned integrations include:
- Twitter/X API for automated marketing
- Discord integration for notifications
- Snapshots for governance coordination
- Zapier/IFTTT for workflow automation 