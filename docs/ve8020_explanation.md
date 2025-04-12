# ve(80/20) - Vote Escrowed LP Token System with Fee Distribution

## Overview

The ve(80/20) system is a voting and boosting mechanism based on locked 80/20 LP tokens. This system is inspired by Curve Finance's veCRV model but adapted specifically for the Red Dragon ecosystem. The model now includes redirecting transaction fees to ve(80/20) holders, creating additional utility and incentives for long-term liquidity providers.

## Key Features

1. **LP Token Locking**: Users lock their 80/20 LP tokens (instead of DRAGON tokens) for a period between 1 week and 4 years.
2. **Time-weighted Voting Power**: Longer lock periods result in greater voting power.
3. **Linear Decay**: Voting power gradually decreases as the lock approaches expiration.
4. **Curve-style Boost**: The system provides boosted rewards in the lottery using the Curve Finance boost formula.
5. **Governance Rights**: ve(80/20) holders can participate in governance decisions.
6. **Fee Distribution**: A portion of transaction fees from token transfers are distributed to ve(80/20) holders.

## Fee Distribution Model

### Previous Model
- 6.9% Jackpot
- 1.5% Liquidity wallet
- 0.69% Burn
- 0.91% Development wallet

### New Model
- 6.9% Jackpot (unchanged)
- 0.69% Burn (unchanged)
- 2.41% to ve(80/20) holders via veDistributor

This new model rewards long-term liquidity providers by redistributing a portion of transaction fees to ve(80/20) holders based on their voting power (which is determined by the amount and duration of LP tokens they've locked).

## Benefits Over veDRAGON

### For Users

1. **Better Alignment with LP Providers**: By locking LP tokens instead of DRAGON tokens, the system better rewards users who provide liquidity.
2. **Triple Incentivization**: Users now earn:
   - Trading fees from their LP position
   - Boosted rewards in the lottery
   - A share of transaction fees from DRAGON token transfers
3. **Reduced Sell Pressure**: LP tokens naturally reduce sell pressure compared to single-token staking.
4. **Protocol-Owned Liquidity**: The system encourages long-term liquidity provision.

### For the Protocol

1. **Locked Liquidity**: Encourages deeper and more stable liquidity pools.
2. **Reduced Volatility**: LP tokens are inherently less volatile than single assets.
3. **Protocol-aligned Voters**: Governance is controlled by users who have skin in the game through LP positions.
4. **Sustainable Tokenomics**: Creates a circular economy where DRAGON emissions and transaction fees are partially absorbed into LP positions.
5. **Capital Efficiency**: By redirecting fees to ve(80/20) holders through the veDistributor, the system creates stronger incentives for liquidity provision.

## How the Boost Works

The boost formula follows the Curve Finance model but with some adjustments:

```
min(2.5, 1 + 1.5 * (votingPowerRatio / lpRatio))
```

Where:
- `votingPowerRatio`: User's percentage of total voting power
- `lpRatio`: User's percentage of total LP tokens
- `1.0` (1.0x): Base boost component (minimum)
- `1.5`: Multiplier for the variable boost component
- `2.5` (2.5x): Maximum possible boost

This formula rewards users who lock their LP tokens for longer periods (increasing their voting power) with higher boosts in the lottery system. The maximum boost is capped at 2.5x, which means a user can have up to 2.5 times higher chance to win the lottery compared to having no boost.

For example, if a user has 10% of the total LP tokens but 20% of the total voting power (by locking for a longer period), their boost would be:

```
min(2.5, 1 + 1.5 * (0.2 / 0.1)) = min(2.5, 1 + 1.5 * 2) = min(2.5, 4) = 2.5
```

Achieving the maximum 2.5x boost.

## How Fee Distribution Works

1. **Epoch-Based Distribution**: The veDistributor collects fees over weekly epochs.
2. **Proportional Allocation**: Fees are distributed proportionally to each user's voting power.
3. **Claim Mechanism**: Users claim their share of fees from past epochs.
4. **Time-Weighted Rewards**: Longer lock periods result in higher voting power, therefore higher rewards.

## How to Participate

1. **Acquire 80/20 LP Tokens**: Provide liquidity to the DRAGON/ETH 80/20 pool to receive LP tokens.
2. **Lock Your LP Tokens**: Visit the ve(80/20) dashboard and lock your LP tokens for your chosen duration (1 week to 4 years).
3. **Boost Your Rewards**: Your lottery probability will automatically be boosted based on your locked LP tokens.
4. **Earn Transaction Fees**: Automatically receive a share of transaction fees proportional to your voting power.
5. **Participate in Governance**: Use your voting power to vote on protocol decisions.

## Strategies for Maximization

To maximize your returns:
1. **Lock for 4 Years**: The maximum lock period provides the highest voting power and fee share.
2. **Maintain the Right Ratio**: Aim to have your percentage of voting power equal to or greater than your percentage of LP tokens to maximize boost.
3. **Regularly Add to Your Lock**: Increase your locked amount to maintain your position as the total supply grows.
4. **Extend Your Lock**: Extend your lock before it starts to decay significantly.
5. **Claim Rewards Regularly**: Claim your fee rewards from completed epochs.

## Technical Implementation

The ve(80/20) system consists of these main contracts:
- `ve8020.sol`: The core contract managing LP token locks and voting power calculation.
- `Ve8020FeeDistributor.sol`: Distributes transaction fees to ve(80/20) holders.
- `RedDragonFeeManager.sol`: Redirects transaction fees to the veDistributor.
- `ve8020LotteryIntegrator.sol`: Connects the ve8020 system with the lottery for boosting.
- The existing `RedDragonSwapLottery.sol` which uses the voting power for boost calculations.

## Conclusion

The ve(80/20) system with fee distribution creates a powerful flywheel effect: 
1. Users lock LP tokens to earn fee rewards and boost lottery odds
2. This deepens liquidity and reduces token volatility
3. The improved trading experience attracts more volume
4. Higher volume generates more fees for ve(80/20) holders
5. The increased rewards attract more users to lock LP tokens

This creates a sustainable tokenomic model that aligns the interests of all stakeholders in the Red Dragon ecosystem, rewarding long-term participants and creating lasting value. 