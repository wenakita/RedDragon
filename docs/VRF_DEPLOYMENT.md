# Cross-Chain VRF Deployment Guide

This document provides detailed instructions for deploying and configuring the cross-chain Verifiable Random Function (VRF) system used in the Dragon token lottery.

## Overview

The Dragon token system uses a cross-chain VRF solution that:

1. Triggers on Sonic chain when users swap wS for DRAGON tokens
2. Requests randomness from Chainlink VRF on Arbitrum (for better randomness quality)
3. Returns the randomness to Sonic chain via LayerZero
4. Processes lottery results based on the returned randomness

## Architecture

```
[User Swap on Sonic] → [DragonSwapTrigger] → [SonicVRFConsumer]
           ↑                                          │
           │                                          │ LayerZero
           │                                          ▼
[Lottery Processing] ← [SonicVRFReceiver] ← [ArbitrumVRFRequester] ← [Chainlink VRF]
```

## Prerequisites

- ETH on both Sonic and Arbitrum chains
- LINK tokens on Arbitrum for VRF subscription
- Deployed Dragon token contract
- LayerZero endpoints configured

## Deployment Steps

### 1. Configure Environment Variables

Create or update your `.env` file with the following variables:

```bash
# VRF Configuration
VRF_COORDINATOR_ARBITRUM=0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e
VRF_SUBSCRIPTION_ID=65914062761074472397678945586748169687979388122746586980459153805795126649565
VRF_KEY_HASH=0x8472ba59cf7134dfe321f4d61a430c4857e8b19cdd5230b09952a92671c24409
LINK_TOKEN_ARBITRUM=0xf97f4df75117a78c1A5a0DBb814Af92458539FB4

# LayerZero Configuration
LZ_ENDPOINT_ARBITRUM=0x3c2269811836af69497E5F486A85D7316753cf62
LZ_ENDPOINT_SONIC=0xB4e1Ff7882474BB93042be9AD5E1fA387949B860
LZ_SONIC_CHAIN_ID=146
LZ_ARBITRUM_CHAIN_ID=110

# Token Addresses
WRAPPED_SONIC_ADDRESS=0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38
DRAGON_TOKEN_ADDRESS=your_deployed_dragon_address

# Deployment Private Keys (KEEP THESE SECURE!)
ARBITRUM_DEPLOYER_PRIVATE_KEY=your_arbitrum_private_key
SONIC_DEPLOYER_PRIVATE_KEY=your_sonic_private_key
```

### 2. Update the Deployment Script

Edit the `test/deployment/deploy_cross_chain_vrf.js` file to use environment variables:

```javascript
require('dotenv').config();

// Configuration for Arbitrum deployment
const ARBITRUM_CONFIG = {
  vrfCoordinator: process.env.VRF_COORDINATOR_ARBITRUM,
  subscriptionId: process.env.VRF_SUBSCRIPTION_ID,
  keyHash: process.env.VRF_KEY_HASH,
  linkToken: process.env.LINK_TOKEN_ARBITRUM,
  layerZeroEndpoint: process.env.LZ_ENDPOINT_ARBITRUM,
  sonicChainId: parseInt(process.env.LZ_SONIC_CHAIN_ID),
};

// Configuration for Sonic deployment
const SONIC_CONFIG = {
  layerZeroEndpoint: process.env.LZ_ENDPOINT_SONIC,
  arbitrumChainId: parseInt(process.env.LZ_ARBITRUM_CHAIN_ID),
  wrappedSonic: process.env.WRAPPED_SONIC_ADDRESS,
  dragonToken: process.env.DRAGON_TOKEN_ADDRESS,
};
```

### 3. Create Chainlink VRF Subscription on Arbitrum (Pre-Deployment)

1. Go to the Chainlink VRF Subscription Manager on Arbitrum: https://vrf.chain.link/arbitrum
2. Connect your wallet
3. Click "Create Subscription"
4. Fund the subscription with LINK tokens (minimum 3 LINK recommended)
5. Make note of the subscription ID and update it in your `.env` file

### 4. Deploy the Cross-Chain VRF Contracts

Run the deployment script:

```bash
npx hardhat run test/deployment/deploy_cross_chain_vrf.js --network sonic
```

This script will:
- Deploy ArbitrumVRFRequester on Arbitrum
- Deploy SonicVRFConsumer on Sonic
- Link them together via LayerZero

### 5. Post-Deployment Configuration

#### 5.1 Add VRF Consumer to Subscription

After deployment, you need to add the ArbitrumVRFRequester as a consumer:

1. Go to the Chainlink VRF Subscription page
2. Find your subscription
3. Click "Add Consumer"
4. Enter the ArbitrumVRFRequester contract address
5. Set a gas limit of 500,000 for the VRF callback

#### 5.2 Fund Contracts with ETH

Both contracts need ETH for cross-chain messaging:

```bash
# Create a .env variable with the deployed addresses
# VRF_CONSUMER_SONIC=0x...
# VRF_REQUESTER_ARBITRUM=0x...

# Send ETH to SonicVRFConsumer
npx hardhat send-eth --to $VRF_CONSUMER_SONIC --amount 1.0 --network sonic

# Send ETH to ArbitrumVRFRequester
npx hardhat send-eth --to $VRF_REQUESTER_ARBITRUM --amount 0.5 --network arbitrum
```

### 6. Connect Dragon Token with VRF Consumer

Update the Dragon token to work with the VRF Consumer:

```bash
# Add the deployed VRF consumer address to .env
# VRF_CONSUMER_SONIC=0x...

npx hardhat run --network sonic scripts/connect-dragon-to-vrf.js
```

Or manually call:

```javascript
// Using ethers.js
const Dragon = await ethers.getContractAt("Dragon", process.env.DRAGON_TOKEN_ADDRESS);
await Dragon.setVRFConnector(process.env.VRF_CONSUMER_SONIC);
```

### 7. Setup LayerZero Read (Optional Enhancement)

For enhanced VRF functionality:

1. Update the `setup_layerzero_read.js` script to use environment variables
2. Run the script:
   ```bash
   npx hardhat run test/deployment/setup_layerzero_read.js --network sonic
   ```

## Testing the VRF System

### Basic Testing

1. Ensure all contracts are properly funded with ETH
2. Perform a test swap of wS to DRAGON tokens
3. Monitor events from the contracts to verify proper message passing
4. Check if the randomness is received and processed correctly

### Monitoring VRF Requests

Use the following scripts to monitor VRF activity:

```bash
# Check pending VRF requests
npx hardhat vrf-status --network sonic

# View VRF fulfillment history
npx hardhat vrf-history --network sonic
```

### Simulating VRF for Testing

For local testing without actual cross-chain calls:

```bash
# Run the VRF simulation
npx hardhat run test/scripts/vrf-simulation.js
```

## Environment Variables Security

### Best Practices

1. **Never commit `.env` files to version control**
   - Ensure `.env` is in your `.gitignore` file
   - Use `.env.example` as a template without real values

2. **Restrict access to `.env` files**
   - Limit file permissions: `chmod 600 .env`
   - Only share with trusted team members

3. **Use different environment files for different environments**
   - `.env.development`
   - `.env.production`
   - `.env.test`

4. **Rotate sensitive values periodically**
   - Change private keys after major deployments
   - Update API keys regularly

### Example `.env.example` file

Create a template that others can use without exposing real values:

```bash
# VRF Configuration
VRF_COORDINATOR_ARBITRUM=0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e
VRF_SUBSCRIPTION_ID=your_subscription_id
VRF_KEY_HASH=0x8472ba59cf7134dfe321f4d61a430c4857e8b19cdd5230b09952a92671c24409
LINK_TOKEN_ARBITRUM=0xf97f4df75117a78c1A5a0DBb814Af92458539FB4

# LayerZero Configuration
LZ_ENDPOINT_ARBITRUM=0x3c2269811836af69497E5F486A85D7316753cf62
LZ_ENDPOINT_SONIC=0xB4e1Ff7882474BB93042be9AD5E1fA387949B860
LZ_SONIC_CHAIN_ID=146
LZ_ARBITRUM_CHAIN_ID=110

# Token Addresses
WRAPPED_SONIC_ADDRESS=0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38
DRAGON_TOKEN_ADDRESS=your_deployed_dragon_address

# Deployment Private Keys (KEEP THESE SECURE!)
ARBITRUM_DEPLOYER_PRIVATE_KEY=your_arbitrum_private_key
SONIC_DEPLOYER_PRIVATE_KEY=your_sonic_private_key

# Deployed Contract Addresses
VRF_CONSUMER_SONIC=your_deployed_vrf_consumer_address
VRF_REQUESTER_ARBITRUM=your_deployed_vrf_requester_address
```

## Troubleshooting

### Common Issues

#### 1. LayerZero Message Failures

- **Symptom**: Messages don't arrive at the destination chain
- **Possible causes**:
  - Insufficient ETH for cross-chain fees
  - Incorrect chain IDs
  - Incorrect trusted remote addresses
- **Solution**:
  - Check ETH balances on both contracts
  - Verify chain IDs are correct
  - Check trusted remote configuration with `getTrustedRemote()` function

#### 2. VRF Randomness Not Received

- **Symptom**: Randomness request is sent but never fulfilled
- **Possible causes**:
  - Insufficient LINK in subscription
  - VRF consumer not added to subscription
  - Gas limit too low for callback
- **Solution**:
  - Check subscription balance on Chainlink VRF website
  - Verify consumer is added to subscription
  - Increase gas limit for VRF callback

#### 3. Cross-Chain Delays

- **Symptom**: Long delays in cross-chain message delivery
- **Possible causes**:
  - Network congestion
  - Low gas price
  - LayerZero congestion
- **Solution**:
  - Increase gas price for critical operations
  - Monitor network status
  - Check LayerZero status page

## Security Considerations

### Randomness Security

- VRF randomness is secured by Chainlink's cryptographic proofs
- The system is designed to be manipulation-resistant
- No player, validator, or developer can predict or manipulate the randomness

### Cross-Chain Security

- LayerZero provides secure message passing with multiple validation layers
- All cross-chain messages are verified cryptographically
- Trusted remote configurations prevent malicious contract impersonation

### Economic Security

- The system uses economic incentives to prevent exploitation
- Chainlink VRF requires LINK payment, creating economic security
- LayerZero fees ensure proper message delivery

## Maintenance

### Regular Maintenance Tasks

1. **Monitor LINK Balance**:
   - Check the VRF subscription balance regularly
   - Set up alerts for low LINK balance
   - Replenish when balance falls below 5 LINK

2. **Monitor ETH Balance**:
   - Check ETH balances on both contracts
   - Set up alerts for low ETH balance
   - Replenish when balance falls below 0.5 ETH

3. **Update VRF Configuration**:
   - Periodically review gas limits and key hash
   - Update if necessary for better performance/cost

### Emergency Procedures

1. **Pause VRF if necessary**:
   ```javascript
   // Using ethers.js
   const SonicVRFConsumer = await ethers.getContractAt("SonicVRFConsumer", process.env.VRF_CONSUMER_SONIC);
   await SonicVRFConsumer.setPaused(true);
   ```

2. **Transfer ownership in emergency**:
   ```javascript
   // Using ethers.js
   const ArbitrumVRFRequester = await ethers.getContractAt("ArbitrumVRFRequester", process.env.VRF_REQUESTER_ARBITRUM);
   await ArbitrumVRFRequester.transferOwnership(newOwnerAddress);
   ```

## Reference

### Contract Functions

#### ArbitrumVRFRequester

- `setSonicVRFConsumer(address)`: Update the Sonic VRF consumer address
- `setVRFConfig(address,uint64,bytes32)`: Update VRF configuration parameters
- `setRequestConfig(uint16,uint32)`: Update request configurations
- `withdrawETH(address,uint256)`: Withdraw ETH from the contract

#### SonicVRFConsumer

- `onSwapWSToDragon(address,uint256)`: Called when a user swaps wS for DRAGON
- `setWinThreshold(uint256)`: Update the winning threshold
- `setJackpotPercentage(uint256)`: Update jackpot percentage
- `addToJackpot(uint256)`: Add funds to the jackpot
- `setPaused(bool)`: Pause/unpause the VRF functionality

### Event Monitoring

Monitor these events to track VRF activity:

- `VRFRequested(uint64 indexed requestId, address indexed user)`
- `RandomnessReceived(uint64 indexed requestId, uint256 randomness)`
- `JackpotWon(address indexed winner, uint256 amount)` 