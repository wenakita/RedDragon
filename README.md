# RedDragon Token Ecosystem

This is the official repository for the RedDragon token ecosystem, featuring the ve8020 voting escrow system and optimized fee distribution.

## Core Components

The RedDragon ecosystem consists of the following main contracts:

- `RedDragon.sol`: The main ERC20 token
- `ve8020.sol`: The voting escrow token for governance and rewards
- `Ve8020FeeDistributor.sol`: Contract for distributing rewards to ve8020 holders

## Key Features

- **ve8020 Token System**: Lock RedDragon tokens to gain voting power and earn rewards
- **Simplified Fee Distribution**: 100% of fees go directly to ve8020 holders
- **Weekly Epochs**: Automatic distribution of rewards on a weekly basis
- **Optimized for Gas**: Streamlined contracts with minimal overhead
- **Governance Ready**: Voting power proportional to lock duration and amount

## Recent Updates

We've significantly optimized the codebase by:

1. **Removing Budget Management**: All fees now go directly to ve8020 holders
2. **Removing Unused Vaults**: Simplified architecture with no development vault
3. **Eliminating Deprecated Code**: Completely removed deprecated interfaces and contracts
4. **Streamlining Core Contracts**: Focused on essential functionality only

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