# RedDragon Token & Ve8020 Ecosystem

This repository contains the smart contracts for the RedDragon token ecosystem and the Ve8020 staking system.

## Key Components

### Core Contracts

- **RedDragon Token**: The main ERC-20 token
- **Ve8020**: Vote-escrow token implementation for staking and governance
- **Ve8020FeeDistributor**: Distributes fees between rewards and liquidity

### Utility Contracts

- **RedDragonBalancerIntegration**: Manages 80/20 Balancer/Beets liquidity pools
- **RedDragonPaintSwapVerifier**: VRF randomness verification
- **RedDragonSwapLottery**: Lottery system for $wS/$DRAGON swaps
- **RedDragonJackpotVault**: Collects and distributes jackpot funds

## Features

1. **Automatic Reward Distribution**: Weekly distribution of rewards to ve8020 holders
2. **Optimized Gas Usage**: Streamlined contract implementations
3. **Standardized VRF Implementation**: Secure, verifiable randomness
4. **Balancer Integration**: 80/20 weighted pools for optimal liquidity
5. **Lottery System**: Chance-based jackpot for traders

## Documentation

- [VRF Implementation Guide](VRF_IMPLEMENTATION_GUIDE.md)
- [Balancer Migration](BALANCER_MIGRATION.md)

## Security

The contracts have been refactored to:
- Remove unnecessary interfaces
- Implement direct functionality where possible
- Optimize gas usage
- Add batch processing for large operations
- Improve error handling

## License

MIT 