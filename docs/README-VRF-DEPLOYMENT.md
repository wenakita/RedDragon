# Dragon VRF System Deployment Guide

This guide outlines the steps to deploy and configure the cross-chain VRF (Verifiable Random Function) system for the Dragon ecosystem, which connects the Sonic chain to Arbitrum for secure randomness.

## Overview

The Dragon VRF system leverages Chainlink VRF on Arbitrum and LayerZero for cross-chain communication. It consists of two main components:

1. **ArbitrumVRFRequester**: Deployed on Arbitrum chain to request randomness from Chainlink VRF
2. **EnhancedSonicVRFConsumer**: Deployed on Sonic chain to request and process randomness

The system uses two types of cross-chain communication:
- **Standard Messaging**: For requesting randomness and receiving results
- **LayerZero Read**: For directly querying VRF configuration parameters from Arbitrum

## Prerequisites

- Node.js v16+ and npm/yarn installed
- Hardhat development environment set up
- Private keys with:
  - ETH on Arbitrum for deployment and VRF fees
  - SONIC tokens on Sonic chain for deployment
- RPC URLs for both Sonic and Arbitrum chains
- Chainlink VRF subscription set up on Arbitrum

## Environment Setup

1. Create a deployment environment file:

```bash
# Create deployment.env file
touch deployment.env
```

2. Add the following variables to `deployment.env`:

```
# General Configuration
SONIC_RPC_URL=https://rpc.sonicscan.org/
SONIC_PRIVATE_KEY=your_private_key_here
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
ARBITRUM_PRIVATE_KEY=your_arbitrum_private_key_here

# LayerZero Configuration
SONIC_LZ_ENDPOINT=0x9740FF91F1985D8d2B71494aE1A2f723bb3Ed9E4
ARBITRUM_LZ_ENDPOINT=0x3c2269811836af69497E5F486A85D7316753cf62
ARBITRUM_CHAIN_ID=110
SONIC_CHAIN_ID=146

# Token Addresses
WRAPPED_SONIC_ADDRESS=0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d

# VRF Configuration
CHAINLINK_VRF_COORDINATOR=0x41034678D6C633D8a95c75e1138A360a28bA15d1
CHAINLINK_VRF_SUBSCRIPTION_ID=1234
CHAINLINK_VRF_KEY_HASH=0x8472ba59cf7134dfe321f4d61a430c4857e8b19cdd5230b09952a92671c24409

# LayerZero Read Configuration
READ_LIB_1002_ADDRESS=0x117370A6C6A8874546b166469c59C57Da32E9D8B
```

3. Configure Hardhat network settings in `hardhat.config.js`:

```javascript
// Add to your hardhat.config.js
require("dotenv").config({ path: "./deployment.env" });

module.exports = {
  networks: {
    sonic: {
      url: process.env.SONIC_RPC_URL,
      accounts: [process.env.SONIC_PRIVATE_KEY],
      chainId: 146
    },
    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL,
      accounts: [process.env.ARBITRUM_PRIVATE_KEY],
      chainId: 42161
    }
  }
};
```

## Deployment Steps

### 1. Deploy ArbitrumVRFRequester on Arbitrum

This contract will be deployed on the Arbitrum chain to interact with Chainlink VRF.

```bash
npx hardhat run scripts/deploy-arbitrum-vrf-requester.js --network arbitrum
```

This will:
- Deploy ArbitrumVRFRequester
- Configure it with Chainlink VRF parameters
- Save the address in `deployments/arbitrum-contract-addresses.json`

After deployment, add the ArbitrumVRFRequester address to your `deployment.env` file:

```
ARBITRUM_VRF_REQUESTER_ADDRESS=0x...
```

### 2. Deploy EnhancedSonicVRFConsumer on Sonic

This contract will be deployed on the Sonic chain to request and process randomness.

```bash
npx hardhat run scripts/deploy-vrf-consumer.js --network sonic
```

This will:
- Deploy EnhancedSonicVRFConsumer
- Configure it with proper parameters
- Fund it with ETH for LayerZero fees
- Save the address in `deployments/contract-addresses.json`

### 3. Configure LayerZero Read for Cross-Chain Queries

Set up the LayerZero Read functionality to enable direct state queries from Arbitrum.

```bash
npx hardhat run scripts/deploy-vrf-layerzero-read.js --network sonic
```

This will:
- Set send and receive libraries for the read channel
- Configure DVNs (Decentralized Verifier Network) for validation
- Activate the read channel in the EnhancedSonicVRFConsumer

### 4. Integrate with Dragon Ecosystem

Connect the VRF system to the Dragon ecosystem.

```bash
npx hardhat run scripts/integrate-vrf-with-dragon.js --network sonic
```

This will:
- Update OmniDragon to use the EnhancedSonicVRFConsumer
- Configure permissions
- Fund the jackpot for testing

## Testing the Deployment

### 1. Query VRF State from Arbitrum

Test the LayerZero Read functionality by querying VRF parameters from Arbitrum.

```bash
npx hardhat run scripts/query-vrf-state.js --network sonic
```

### 2. Check the Query Results

After waiting for the cross-chain query response (1-2 minutes), check the results.

```bash
npx hardhat run scripts/check-vrf-state.js --network sonic
```

### 3. Test the Lottery Functionality

Swap wS for DRAGON tokens to trigger the lottery mechanism.

## Contract Architecture

```
Sonic Chain                                 Arbitrum Chain
+----------------------+  LayerZero   +----------------------+
| EnhancedSonicVRF     | <----------> | ArbitrumVRFRequester |
| Consumer             |  Messaging   |                      |
|                      |              |                      |
| - Requests randomness|              | - Receives requests  |
| - Processes results  |              | - Calls Chainlink VRF|
| - Handles lottery    |              | - Returns randomness |
+----------------------+              +----------------------+
         ^                                       ^
         |                                       |
         v                                       v
+----------------------+              +----------------------+
| OmniDragon Token     |              | Chainlink VRF        |
|                      |              | Coordinator          |
| - Triggers lottery   |              |                      |
| - Handles token swaps|              | - Provides verified  |
|                      |              |   randomness         |
+----------------------+              +----------------------+
```

## Troubleshooting

### Common Issues

1. **LayerZero Read Not Working**:
   - Ensure the ReadLib1002 address is correct
   - Verify DVN configuration
   - Ensure the contract has sufficient ETH for fees

2. **VRF Errors**:
   - Verify Chainlink VRF subscription is active
   - Ensure the subscription has sufficient LINK tokens
   - Check that ArbitrumVRFRequester is added as a consumer

3. **Permission Errors**:
   - Verify that the proper permissions are set between contracts
   - Ensure you're using the proper owner account for deployment

## Maintenance

### Managing the VRF System

- **Update VRF Parameters**: You can update parameters on both contracts:
  ```bash
  npx hardhat run scripts/update-vrf-params.js --network sonic
  npx hardhat run scripts/update-vrf-params.js --network arbitrum
  ```

- **Funding Contracts**:
  - Fund ArbitrumVRFRequester with ETH for gas fees
  - Fund EnhancedSonicVRFConsumer with ETH for LayerZero fees
  - Fund Chainlink VRF subscription with LINK tokens

### Security Considerations

- Regularly check for updates to Chainlink VRF and LayerZero
- Monitor gas usage on both chains
- Implement proper access controls for admin functions

## References

- [LayerZero Documentation](https://layerzero.gitbook.io/)
- [Chainlink VRF Documentation](https://docs.chain.link/vrf)
- [Dragon Ecosystem Documentation](https://docs.example.com/dragon)

## Support

If you encounter any issues during deployment, please contact:
- Telegram: https://t.me/sonicreddragon
- Twitter: https://x.com/sonicreddragon 