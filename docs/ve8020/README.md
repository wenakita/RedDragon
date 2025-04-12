# ve(80/20) System

The vote-escrowed 80/20 LP token system for the RedDragon ecosystem.

## Overview

The ve(80/20) system is a liquidity incentive mechanism inspired by Curve Finance's veCRV model. It allows users to lock their 80/20 LP tokens (80% DRAGON, 20% wS) for 1 week to 4 years to receive voting power and rewards.

## Key Components

The system consists of three main contracts:

1. **ve8020.sol**: Core contract for LP token locking and voting power calculation
2. **Ve8020FeeDistributor.sol**: Distributes transaction fees to ve(80/20) holders
3. **ve8020LotteryIntegrator.sol**: Connects voting power to lottery boost calculations

## Features

- **Time-Weighted Voting Power**: Longer locks provide more voting power
- **Fee Distribution**: 2.41% of all transaction fees redirected to ve(80/20) holders
- **Lottery Boost**: Up to 2.5x boost on lottery odds using Curve's formula
- **Governance Rights**: Voting power can be used for governance decisions

## Technical Details

### ve8020.sol

This contract manages LP token locks and voting power with:
- Locking periods from 1 week to 4 years
- Linear decay of voting power as lock approaches expiry
- Functions to create, extend, and withdraw locks
- Epoch-based checkpoint system for accurate voting power tracking

### Ve8020FeeDistributor.sol

Handles transaction fee distribution with:
- Weekly distribution epochs
- Proportional allocation based on voting power
- Claim mechanism for past epochs
- Support for external reward tokens

### ve8020LotteryIntegrator.sol

Connects the voting system to lottery boosts:
- Implements Curve-style boost formula
- Caps boost at 2.5x
- Optimized for gas efficiency
- Provides transparent boost calculations

## Boost Calculation

The boost is calculated using the formula:
```
min(2.5, 1 + 1.5 * (votingPowerRatio / lpRatio))
```

Where:
- `votingPowerRatio`: User's share of total voting power
- `lpRatio`: User's share of total LP tokens

This rewards users who lock tokens for longer durations with higher boosts proportional to their commitment.

## Integration with RedDragon Token

The system integrates with the RedDragon token through:
1. The `RedDragonFeeManager` contract which redirects transaction fees
2. The lottery boost mechanism which enhances rewards for ve(80/20) holders
3. Potential future governance integrations

## Documentation

For more information, see the following documents:
- [ve(80/20) Explanation](../ve8020_explanation.md): Detailed overview of the system
- [ve(80/20) Deployment Guide](../ve8020_deployment.md): Step-by-step deployment instructions
- [Boost Simulation Results](../../test/BoostSimulation.test.js): Analysis of boost calculations

## Scripts

The `scripts/deployment` directory contains scripts for:
- Deploying ve8020 contracts
- Configuring fee distribution
- Setting up lottery integration
- Testing the system

## Tests

The system is extensively tested with:
- Unit tests for each contract
- Integration tests for the full system
- Comprehensive boost simulations
- Gas optimization tests 