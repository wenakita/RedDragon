# RedDragon Token Ecosystem

This repository contains the smart contracts for the RedDragon token ecosystem, including the ve8020 token and fee distribution system.

## Overview

The RedDragon ecosystem consists of the following core contracts:

- `RedDragon.sol`: The main ERC20 token
- `ve8020.sol`: The voting escrow token for governance and rewards
- `Ve8020FeeDistributor.sol`: Contract for distributing rewards to ve8020 holders

## Key Features

- **ve8020 Token System**: Allows users to lock RedDragon tokens to gain voting power and earn rewards
- **Fee Distribution**: Automatically distributes rewards to ve8020 holders proportional to their voting power
- **Weekly Epochs**: Rewards are distributed on a weekly basis (epochs)

## Fee Distribution

The system now allocates 100% of fees to ve8020 token holders. This ensures maximum rewards for governance participants.

## Development

### Prerequisites

- Node.js v14+
- npm or yarn

### Installation

```bash
npm install
```

### Testing

```bash
npx hardhat test
```

### Deployment

```bash
npx hardhat run scripts/deploy.js
```

## License

MIT 