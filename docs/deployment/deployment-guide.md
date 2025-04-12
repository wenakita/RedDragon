# SonicRedDragon Deployment Guide

## Overview

This guide outlines the deployment process for the SonicRedDragon contracts, including:
- RedDragon token
- RedDragonPaintSwapVerifier
- RedDragonSwapLottery

## Prerequisites

- Node.js >= 16.0.0
- Hardhat
- PaintSwap VRF subscription
- Sufficient wS tokens for deployment and VRF subscription

## Deployment Steps

### 1. Environment Setup

1. Create a `.env` file with the following variables:
   ```
   PRIVATE_KEY=your_private_key
   SONIC_RPC_URL=https://rpc.soniclabs.com
   SONICSCAN_API_KEY=your_sonicscan_api_key
   VRF_COORDINATOR=0x3ba925fdeae6b46d0bb4d424d829982cb2f7309e
   WRAPPED_SONIC_ADDRESS=0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38
   LIQUIDITY_ADDRESS=your_liquidity_address
   DEVELOPMENT_ADDRESS=your_development_address
   BURN_ADDRESS=0x000000000000000000000000000000000000dEaD
   JACKPOT_ADDRESS=your_jackpot_address
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### 2. Contract Deployment

1. Deploy the RedDragonPaintSwapVerifier contract:
   ```bash
   npx hardhat run scripts/deploy-verifier.js --network sonic
   ```

2. Deploy the RedDragonSwapLottery contract:
   ```bash
   npx hardhat run scripts/deployment/deploy-lottery.js --network sonic
   ```

3. Deploy the RedDragon token:
   ```bash
   npx hardhat run scripts/deployment/deploy-reddragon.js --network sonic
   ```

All deployed addresses will be saved to `deployment-addresses-sonic.json`.

### 3. Post-Deployment Setup

1. Initialize the verifier with PaintSwap VRF settings:
   ```bash
   npx hardhat run scripts/deployment/setup-vrf.js --network sonic
   ```

2. Enable trading on the RedDragon token:
   ```bash
   npx hardhat run scripts/deployment/enable-trading.js --network sonic
   ```

3. Set the exchange pair for the RedDragon token:
   ```bash
   npx hardhat run scripts/deployment/set-exchange-pair.js --network sonic
   ```

4. Set the lottery address in the RedDragon token:
   ```bash
   npx hardhat run scripts/deployment/set-lottery-address.js --network sonic
   ```

## Contract Verification

Verify contracts on SonicScan:
```bash
npx hardhat verify --network sonic $(cat deployment-addresses-sonic.json | jq -r '.verifier')
npx hardhat verify --network sonic $(cat deployment-addresses-sonic.json | jq -r '.lottery') [CONSTRUCTOR_ARGS]
npx hardhat verify --network sonic $(cat deployment-addresses-sonic.json | jq -r '.redDragon') [CONSTRUCTOR_ARGS]
```

## Testing

Run the complete test suite to verify functionality:
```bash
npx hardhat test
```

To run specific tests:
```bash
npx hardhat test test/RedDragon.test.js
npx hardhat test test/RedDragonPaintSwapVerifier.test.js
npx hardhat test test/RedDragonRequirements.test.js
```

## Testing Best Practices

We've implemented several testing best practices to ensure the reliability and correctness of the contracts:

### Effective Test Setup

- Use the **fixtures pattern** to create efficient, reusable test environments
- Properly isolate tests to prevent state leakage between test cases

### VRF Testing Approach

- Implement robust **log parsing** instead of relying solely on event listeners, which can be flaky
- Use proper **timeout management** with clear error messages
- Add comprehensive **debug logging** throughout tests for easier troubleshooting

### Mock Implementation

- Create thorough mock implementations that accurately simulate external systems
- Add helper methods in mocks to facilitate testing
- Include proper error handling and reporting in mocks

### Test Reliability

- Implement multiple fallback approaches for critical functionality
- Add timeout protection to prevent tests from hanging indefinitely
- Use try/catch blocks with detailed error reporting

## Contracts Overview

### RedDragon.sol
Main token contract with:
- 10% fixed fee distribution (5% jackpot, 3% liquidity, 1% burn, 1% development)
- Special transaction limits for the first 69 transactions (1% max tx, 2% max wallet initially)
- Automatic detection of wS to DRAGON buys for lottery entries
- Fee exemption management for specific addresses

### RedDragonPaintSwapVerifier.sol
Verifiable random function implementation that:
- Interfaces with PaintSwap's VRF Coordinator for secure randomness
- Uses a two-step request/fulfill pattern for randomness generation
- Provides utility functions to convert randomness to usable ranges
- Includes threshold checking for probability-based outcomes
- Features admin functions to update VRF configuration

### RedDragonSwapLottery.sol
Lottery contract that:
- Maintains jackpot in wS tokens for better value stability
- Uses VRF for provably fair winner selection
- Features probability-based winning based on transaction size
- Processes buy events to determine winners in real-time
- Includes safeguards to prevent contract exploits

## Security Considerations

- Keep private keys secure
- Verify all contract addresses
- Test thoroughly before mainnet deployment
- Monitor contract interactions
- Keep backup of deployment addresses

## Troubleshooting

If you encounter issues:
1. Check gas prices and network congestion
2. Verify environment variables
3. Ensure sufficient gas tokens
4. Check contract verification status
5. Review transaction logs

## Support

For assistance:
- Join our Telegram: https://t.me/sonicreddragon
- Follow us on Twitter: https://x.com/sonicreddragon 