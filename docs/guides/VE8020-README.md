# RedDragon ve(80/20) System

## Overview

The ve(80/20) system is inspired by Curve Finance's voting-escrow (ve) model, allowing users to lock 80/20 LP tokens (80% DRAGON, 20% wS) for 1 week to 4 years to receive voting power, fee rewards, and lottery boost.

## Key Features

- **Lock LP Tokens**: Lock your 80/20 DRAGON-wS LP tokens for 1 week to 4 years
- **Earn Fee Share**: Receive a share of 2.41% of all DRAGON token transfers
- **Boost Lottery Odds**: Get up to 2.5x boost in the lottery based on your voting power
- **No LP Burning**: LP tokens are not burned at all

## How It Works

1. **Create LP Position**: Add liquidity to the 80/20 DRAGON-wS pool
2. **Lock LP Tokens**: Lock your LP tokens in the ve8020 contract
3. **Receive Voting Power**: Get voting power based on amount and lock time
4. **Collect Rewards**: Claim your share of fees from the fee distributor
5. **Enjoy Lottery Boost**: Your lottery odds are boosted based on your voting power

## Boost Formula

The boost follows Curve's formula: `min(2.5, 1 + 1.5 * (votingPowerRatio / lpRatio))`

Where:
- `votingPowerRatio` = Your voting power / Total voting power
- `lpRatio` = Your LP tokens / Total LP supply

## Components

- **ve8020**: Core contract for locking LP tokens and calculating voting power
- **Ve8020FeeDistributor**: Distributes transaction fees to ve8020 holders
- **RedDragonFeeManager**: Manages fee distribution from the token contract

## Deployment

The system is deployed on Sonic using the `ve8020-complete-deployment.js` script:

```bash
# Update your .env file with these values:
RED_DRAGON_ADDRESS="0x..."      # Existing RedDragon token address
JACKPOT_VAULT_ADDRESS="0x..."   # Address to receive jackpot fees
WRAPPED_SONIC_ADDRESS="0x..."   # wS token address
LP_TOKEN_ADDRESS="0x..."        # 80/20 LP token address (optional)

# Run the deployment script
npx hardhat run scripts/deployment/ve8020-complete-deployment.js --network sonic
```

## User Guide

### Locking LP Tokens

```solidity
// Approve LP tokens first
await lpToken.approve(ve8020Address, amount);

// Lock tokens for a period (in seconds)
await ve8020.createLock(amount, unlockTime);
```

### Extending Lock Time

```solidity
// Extend an existing lock
await ve8020.extendLockTime(newUnlockTime);
```

### Increasing Lock Amount

```solidity
// Approve additional LP tokens
await lpToken.approve(ve8020Address, additionalAmount);

// Increase locked amount
await ve8020.increaseLockAmount(additionalAmount);
```

### Claiming Rewards

```solidity
// Claim rewards for a specific epoch
await feeDistributor.claimEpochRewards(epoch);

// Or claim rewards for multiple epochs at once
await feeDistributor.claimMultipleEpochs([epoch1, epoch2, epoch3]);
```

### Withdrawing LP Tokens

```solidity
// Only works after lock expiration
await ve8020.withdraw();
```

## Key Benefits

1. **Triple Incentives**:
   - Trading fees from the LP position
   - Share of 2.41% of all DRAGON transfers
   - Boosted lottery odds (up to 2.5x)

2. **Long-term Alignment**:
   - Longer lock times = More voting power = More rewards
   - Encourages long-term liquidity provision

3. **No LP Burning**:
   - LP tokens are not burned at all
   - 100% of LP tokens go to the fee collector 