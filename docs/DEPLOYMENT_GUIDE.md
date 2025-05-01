# Dragon Token System Deployment Guide

This document outlines the complete deployment process for the Dragon token system with cross-chain VRF functionality.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Red Dragon Core System Deployment](#red-dragon-core-system-deployment)
- [Cross-Chain VRF System Deployment](#cross-chain-vrf-system-deployment)
- [LayerZero Read Setup](#layerzero-read-setup)
- [Integration and Configuration](#integration-and-configuration)
- [Verification](#verification)
- [Monitoring Setup](#monitoring-setup)
- [Production Considerations](#production-considerations)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js v16+ and npm
- Hardhat
- Access to Sonic and Arbitrum networks
- Wallet with ETH on both networks
- LINK tokens for Chainlink VRF subscription funding on Arbitrum

## Initial Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/SonicRedDragon/dragon-token.git
   cd dragon-token
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create a `.env` file with required credentials**:
   ```
   PRIVATE_KEY=your_wallet_private_key
   NETWORK_RPC_URL=https://sonic.rpc.endpoint
   ARBITRUM_RPC_URL=https://arbitrum.rpc.endpoint 
   ETHERSCAN_API_KEY=your_api_key_for_verification
   ```

4. **Ensure your wallet has sufficient funds**:
   - ETH on Sonic for deployment gas
   - ETH on Arbitrum for VRF deployment
   - LINK tokens on Arbitrum for VRF subscription

## Red Dragon Core System Deployment

The main deployment uses the RED_DRAGON_LAUNCH_WIZARD.js script which will guide you through the deployment process:

```bash
npx hardhat run test/deployment/RED_DRAGON_LAUNCH_WIZARD.js --network sonic
```

This wizard will guide you through deploying the following components:

### 1. DRAGON Token
The primary token of the ecosystem with built-in fee and lottery mechanics.

### 2. LP Pool Creation (Manual Step)
You'll need to manually create an LP pool on Beets/Balancer:
- Go to https://beets.fi and connect your wallet
- Create a new liquidity pool with $DRAGON and the pair token (e.g., wS)
- Typical ratio is 69% $DRAGON / 31% pair token
- Add initial liquidity to the pool
- Enter the LP token address when prompted by the wizard

### 3. ve69LP 
Voting escrow token for LP tokens, providing governance and boost benefits.

### 4. Jackpot Vault
Contract to manage the jackpot funds collected from fees and used for lottery prizes.

### 5. ve69LPBoost
Boosts rewards for ve69LP holders, enhancing reward distribution based on holding duration.

### 6. ve69LPFeeDistributor
Distributes fees to ve69LP holders according to their proportional share.

### 7. Chain-Specific Swap Triggers
Manages the lottery functionality for specific chains like Sonic and Base. The system includes:

- **ChainRegistry**: Central registry for managing chain-specific configurations
- **ChainSpecificSwapTrigger**: Base abstract contract for chain-specific implementations
- **SonicDragonSwapTrigger**: Implementation for Sonic chain
- **BaseDragonSwapTrigger**: Implementation for Base chain

Each trigger is configured to work with its native token (wS on Sonic, WETH on Base) and connects to the appropriate VRF service.

### 8. DragonPartnerRegistry
Registry for partners with special boosts and permissions.

### 9. ve69LPPoolVoting
Contract for voting on pools and fee distributions using ve69LP.

### 10. Contract Configuration
The wizard will configure all contracts with their initial parameters and connections.

## Cross-Chain VRF System Deployment

After the core system is deployed, deploy the cross-chain VRF functionality:

1. **Update the configuration in `deploy_cross_chain_vrf.js` with actual contract addresses**:
   ```javascript
   // Update these values
   SONIC_CONFIG.dragonToken = "YOUR_DEPLOYED_DRAGON_ADDRESS";
   ARBITRUM_CONFIG.sonicChainId = 231; // Check correct LayerZero chain ID
   SONIC_CONFIG.arbitrumChainId = 110; // Arbitrum chain ID in LayerZero
   ```

2. **Deploy the cross-chain VRF contracts**:
   ```bash
   npx hardhat run test/deployment/deploy_cross_chain_vrf.js --network sonic
   ```

   This will:
   - Deploy ArbitrumVRFRequester on Arbitrum
   - Deploy SonicVRFConsumer on Sonic
   - Link them together via LayerZero

3. **Fund the Chainlink VRF subscription on Arbitrum**:
   - Use the Chainlink VRF subscription page 
   - Add LINK tokens to your subscription
   - Add the ArbitrumVRFRequester contract as a consumer
   - Configure the gas limit (recommend: 500,000)

4. **Fund contracts with ETH for LayerZero fees**:
   ```bash
   # Send ETH to SonicVRFConsumer
   npx hardhat send-eth --to YOUR_SONICVRFCONSUMER_ADDRESS --amount 1.0 --network sonic
   
   # Send ETH to ArbitrumVRFRequester
   npx hardhat send-eth --to YOUR_ARBITRUMVRFREQUESTER_ADDRESS --amount 0.5 --network arbitrum
   ```

## LayerZero Read Setup

For enhanced VRF functionality using LayerZero Read:

1. **Update configuration in `setup_layerzero_read.js` with your deployed contract addresses**:
   ```javascript
   const enhancedVRFConsumer = await EnhancedSonicVRFConsumer.attach(
     "YOUR_DEPLOYED_CONTRACT_ADDRESS" // Replace with actual address
   );
   ```

2. **Run the setup script**:
   ```bash
   npx hardhat run test/deployment/setup_layerzero_read.js --network sonic
   ```

   This configures:
   - LayerZero Read Library association
   - DVN (Data Validation Node) setup
   - Read channel activation

## Integration and Configuration

1. **Update the Dragon token contract to call SonicVRFConsumer when swaps occur**:
   ```bash
   npx hardhat run scripts/update-dragon-vrf.js --network sonic
   ```
   Or call directly through a contract interaction:
   ```javascript
   Dragon.setVRFConsumer(sonicVRFConsumerAddress)
   ```

2. **Configure the lottery parameters**:
   ```bash
   npx hardhat run scripts/configure-lottery.js --network sonic
   ```
   This sets:
   - Win threshold (chance to win)
   - Boosting parameters for ve69LP holders
   - Base prize amounts
   - Fee distributions

3. **Seed the jackpot with initial DRAGON tokens**:
   ```bash
   npx hardhat run scripts/seed-jackpot.js --network sonic
   ```

## Verification

1. **Verify all contracts on the blockchain explorer**:
   ```bash
   npx hardhat verify --network sonic DEPLOYED_CONTRACT_ADDRESS constructor_param1 constructor_param2 ...
   ```
   
   For contracts with complex constructor arguments:
   ```bash
   npx hardhat verify-token --network sonic
   ```

2. **Run a test transaction**:
   ```bash
   npx hardhat test-swap --amount 10 --network sonic
   ```
   This simulates a small swap to ensure the lottery functionality works correctly.

## Monitoring Setup

1. **Deploy and configure monitoring services**:
   ```bash
   cd integrations/telegram-cloud-function
   npm install
   gcloud functions deploy dragonMonitor --runtime nodejs18 --trigger-http
   ```

2. **Set up the monitoring dashboard**:
   ```bash
   cd inline-feedback-dashboard
   npm install
   npm run build
   npm run deploy
   ```

## Production Considerations

### Security

- **Multisig Implementation**: Ensure all owner functions are controlled by a multisig wallet
  ```bash
  npx hardhat transfer-ownership --to MULTISIG_ADDRESS --network sonic
  ```

- **Timelock Governance**: Implement timelock for sensitive operations
  ```bash
  npx hardhat setup-timelock --network sonic
  ```

### Gas Management

- **Keep ETH in VRF Contracts**: Ensure sufficient ETH is maintained in the VRF contracts for cross-chain fees
- **Gas Price Monitoring**: Set up alerts for high gas prices and fee spikes on both networks

### Monitoring

- **Balance Alerts**: Configure alerts for low balances in the VRF and LayerZero contracts
- **Event Monitoring**: Monitor key events (jackpot wins, swaps, etc.) for system health

### Backups

- Keep secure backups of all deployment information:
  - Contract addresses
  - ABIs
  - Deployment transactions
  - Configuration parameters

## Troubleshooting

### Common Issues

1. **LayerZero Message Failures**
   - Verify sufficient ETH is available for gas fees
   - Check that correct chain IDs are configured
   - Ensure trusted remote addresses are correctly set

2. **VRF Randomness Issues**
   - Verify LINK subscription is funded
   - Check that the VRF consumer is added to the subscription
   - Ensure gas limits are set appropriately

3. **Contract Interaction Failures**
   - Verify correct contract addresses are used
   - Check that the caller has appropriate permissions
   - Ensure proper function signatures and argument types

### Support Resources

- **Documentation**: https://docs.sonicreddragon.io
- **GitHub Issues**: https://github.com/SonicRedDragon/dragon-token/issues
- **Discord Support**: https://discord.gg/sonicreddragon

---

*This document will be updated as the deployment process evolves. Last updated: April 2024.* 