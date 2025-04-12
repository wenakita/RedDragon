# ve(80/20) System Deployment Guide

This guide outlines the process for deploying the ve(80/20) system, which includes the voting escrow contract, fee distributor, and integrations.

## Prerequisites

Before beginning deployment, ensure you have:

- Node.js >= 16.0.0
- Hardhat installed
- A funded wallet with sufficient gas tokens
- RedDragon token already deployed
- 80/20 LP tokens created (Balancer or Shadowswap)
- Private key configured in `.env` file

## Step 1: Deploy the ve8020 Contract

The ve8020 contract is the core of the system, managing LP token locks and voting power.

```bash
npx hardhat run scripts/deployment/deploy-ve8020.js --network sonic
```

This will deploy the ve8020 contract with the following parameters:
- LP token address (80/20 DRAGON/wS LP token)
- Name: "Vote Escrowed 80/20 DRAGON-wS"
- Symbol: "ve80/20"
- Version: "1.0.0"

Record the deployed address as `VE8020_ADDRESS`.

## Step 2: Deploy the Ve8020FeeDistributor

The fee distributor handles the distribution of transaction fees to ve8020 holders.

```bash
npx hardhat run scripts/deployment/deploy-ve8020-fee-distributor.js --network sonic
```

This script will require:
- The ve8020 contract address
- RedDragon token address
- Initial distribution period (typically 1 week = 604800 seconds)

Record the deployed address as `VE8020_FEE_DISTRIBUTOR_ADDRESS`.

## Step 3: Deploy the RedDragonFeeManager

The fee manager redirects transaction fees from the RedDragon token to various destinations, including the ve8020 fee distributor.

```bash
npx hardhat run scripts/deployment/deploy-fee-manager.js --network sonic
```

This requires:
- RedDragon token address
- Ve8020FeeDistributor address
- Burn address (typically 0x000000000000000000000000000000000000dEaD)
- Lottery jackpot address
- Development wallet address

Record the deployed address as `REDDRAGON_FEE_MANAGER_ADDRESS`.

## Step 4: Deploy the ve8020LotteryIntegrator

This contract links the ve8020 system with the lottery to provide boosted odds for ve8020 holders.

```bash
npx hardhat run scripts/deployment/deploy-ve8020-lottery-integrator.js --network sonic
```

This requires:
- ve8020 contract address
- RedDragonSwapLottery address

Record the deployed address as `VE8020_LOTTERY_INTEGRATOR_ADDRESS`.

## Step 5: Configure the RedDragon Token

Update the RedDragon token to use the new fee manager for fee distribution.

```bash
npx hardhat run scripts/deployment/configure-reddragon-for-ve8020.js --network sonic
```

This will:
1. Set the fee manager address in the RedDragon token
2. Transfer fee collection rights to the fee manager
3. Update fee recipients to include the ve8020 fee distributor

## Step 6: Update the Lottery for Boost Integration

Configure the RedDragonSwapLottery contract to use the ve8020LotteryIntegrator for boost calculations.

```bash
npx hardhat run scripts/deployment/set-lottery-booster.js --network sonic
```

This will set the ve8020LotteryIntegrator as the boost provider for the lottery.

## Step 7: Verify Contracts on SonicScan

Verify all deployed contracts on SonicScan for transparency:

```bash
# Verify ve8020
npx hardhat verify --network sonic VE8020_ADDRESS LP_TOKEN_ADDRESS "Vote Escrowed 80/20 DRAGON-wS" "ve80/20" "1.0.0"

# Verify Ve8020FeeDistributor
npx hardhat verify --network sonic VE8020_FEE_DISTRIBUTOR_ADDRESS VE8020_ADDRESS REDDRAGON_TOKEN_ADDRESS 604800

# Verify RedDragonFeeManager
npx hardhat verify --network sonic REDDRAGON_FEE_MANAGER_ADDRESS REDDRAGON_TOKEN_ADDRESS VE8020_FEE_DISTRIBUTOR_ADDRESS "0x000000000000000000000000000000000000dEaD" LOTTERY_JACKPOT_ADDRESS DEVELOPMENT_WALLET_ADDRESS

# Verify ve8020LotteryIntegrator
npx hardhat verify --network sonic VE8020_LOTTERY_INTEGRATOR_ADDRESS VE8020_ADDRESS REDDRAGON_SWAP_LOTTERY_ADDRESS
```

## Step 8: Initial Configuration and Testing

Once deployed, perform these additional configuration steps:

1. Add initial rewards to the fee distributor:
```bash
npx hardhat run scripts/deployment/add-initial-rewards.js --network sonic
```

2. Test the entire system with a locking and claiming flow:
```bash
npx hardhat run scripts/deployment/test-ve8020-flow.js --network sonic
```

3. Check that boosts are correctly calculated:
```bash
npx hardhat run scripts/deployment/test-lottery-boost.js --network sonic
```

## Step 9: Post-Deployment Verification

After deployment, verify that:

1. Users can lock LP tokens for different durations (1 week to 4 years)
2. Voting power is correctly calculated based on lock amount and duration
3. Transaction fees are properly redirected to the fee distributor
4. Lottery boosts are correctly applied based on voting power
5. Users can claim their share of distributed fees

## Step 10: Documentation and Communication

Finally:

1. Document all deployed contract addresses
2. Update the project documentation with the new ve(80/20) system details
3. Create user guides explaining how to:
   - Acquire 80/20 LP tokens
   - Lock LP tokens in the ve8020 contract
   - Claim fee rewards
   - Extend or increase locks
   - Withdraw after lock expiry

## Important Addresses to Record

Keep a record of all these addresses:

- RedDragon Token: `REDDRAGON_TOKEN_ADDRESS`
- 80/20 LP Token: `LP_TOKEN_ADDRESS`
- ve8020 Contract: `VE8020_ADDRESS`
- Ve8020FeeDistributor: `VE8020_FEE_DISTRIBUTOR_ADDRESS`
- RedDragonFeeManager: `REDDRAGON_FEE_MANAGER_ADDRESS`
- ve8020LotteryIntegrator: `VE8020_LOTTERY_INTEGRATOR_ADDRESS`
- RedDragonSwapLottery: `REDDRAGON_SWAP_LOTTERY_ADDRESS`
- Burn Address: `0x000000000000000000000000000000000000dEaD`
- Development Wallet: `DEVELOPMENT_WALLET_ADDRESS`
- Lottery Jackpot: `LOTTERY_JACKPOT_ADDRESS`

## Troubleshooting

If you encounter issues during deployment:

1. **Contract Initialization Fails**: Check that all addresses are correct and valid
2. **Gas Errors**: Ensure your wallet has sufficient funds for deployment
3. **Permission Errors**: Verify that your wallet has the correct permissions on existing contracts
4. **Integration Issues**: Test each component individually before connecting them

## Security Considerations

1. The ve8020 system manages significant value, so ensure proper security audits
2. Consider implementing a timelock for administrative functions
3. Use multisig wallets for owner/admin functions
4. Thoroughly test all functions before mainnet deployment
5. Consider a phased rollout with increasing fees redirected to the ve8020 system 