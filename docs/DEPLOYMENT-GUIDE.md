# Dragon VRF System Deployment Guide

This step-by-step guide will walk you through deploying the cross-chain VRF system for the Dragon ecosystem.

## Prerequisites

1. Update your `deployment.env` file with the correct values:
   - Make sure to set your `PRIVATE_KEY` for Sonic chain
   - Make sure to set your `ARBITRUM_PRIVATE_KEY` for Arbitrum chain
   - Ensure VRF and LayerZero configuration parameters are set

2. Verify you have a Chainlink VRF subscription on Arbitrum:
   - Go to https://vrf.chain.link
   - Connect to Arbitrum
   - Create or use an existing subscription
   - Fund it with LINK tokens

## Deployment Steps

### 1. Deploy ArbitrumVRFRequester on Arbitrum

```bash
npx hardhat run scripts/deploy-arbitrum-vrf-requester.js --network arbitrum
```

This will:
- Deploy the ArbitrumVRFRequester contract
- Configure it with Chainlink VRF parameters
- Fund it with ETH for gas fees
- Save the address in `deployments/arbitrum-contract-addresses.json`

After deployment, add the contract address to your `deployment.env` file:

```
ARBITRUM_VRF_REQUESTER_ADDRESS=0x...
```

### 2. Add the contract to your Chainlink VRF subscription

- Go to https://vrf.chain.link
- Connect to Arbitrum
- Find your subscription
- Add the ArbitrumVRFRequester address as a consumer

### 3. Deploy EnhancedSonicVRFConsumer on Sonic

```bash
npx hardhat run scripts/deploy-vrf-consumer.js --network sonic
```

This will:
- Deploy the EnhancedSonicVRFConsumer contract
- Configure it with your parameters
- Fund it with ETH for LayerZero fees
- Save the address in `deployments/contract-addresses.json`

### 4. Update Sonic VRF Consumer address in Arbitrum VRF Requester

```bash
npx hardhat run scripts/update-vrf-sonic-consumer.js --network arbitrum
```

This will update the Sonic VRF Consumer address in the Arbitrum VRF Requester contract.

### 5. Configure LayerZero Read on Sonic

```bash
npx hardhat run scripts/deploy-vrf-layerzero-read.js --network sonic
```

This will:
- Set send and receive libraries for the read channel
- Configure DVNs for validation
- Activate the read channel in the EnhancedSonicVRFConsumer

### 6. Integrate VRF with Dragon ecosystem

```bash
npx hardhat run scripts/integrate-vrf-with-dragon.js --network sonic
```

This will:
- Update OmniDragon to use the EnhancedSonicVRFConsumer
- Configure permissions
- Fund the jackpot for testing

### 7. Test the cross-chain communication

Test the LayerZero Read functionality:

```bash
npx hardhat run scripts/query-vrf-state.js --network sonic
```

Wait 1-2 minutes for the cross-chain response, then check the results:

```bash
npx hardhat run scripts/check-vrf-state.js --network sonic
```

## Maintenance

### Funding contracts with ETH

For Arbitrum VRF Requester:
```bash
npx hardhat run scripts/fund-vrf-contracts.js --network arbitrum --amount 0.5
```

For Sonic VRF Consumer:
```bash
npx hardhat run scripts/fund-vrf-contracts.js --network sonic --amount 0.2
```

### Updating VRF parameters

For Arbitrum VRF Requester:
```bash
npx hardhat run scripts/update-vrf-params.js --network arbitrum --callbackGasLimit 600000 --requestConfirmations 5
```

For Sonic VRF Consumer:
```bash
npx hardhat run scripts/update-vrf-params.js --network sonic --winThreshold 500 --jackpotPercentage 1000
```

## Troubleshooting

If you encounter any issues:

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

## Contract Verification

After deploying the contracts, you can verify their source code on the respective block explorers:

```bash
npx hardhat run scripts/verify-vrf-contracts.js
```

This script will:
1. Verify the ArbitrumVRFRequester on Arbiscan
2. Verify the EnhancedSonicVRFConsumer on Sonicscan

You'll need to have API keys set up in your `deployment.env` file for the verification to work:

```
ARBISCAN_API_KEY=your_arbiscan_api_key
SONICSCAN_API_KEY=your_sonicscan_api_key
```

If verification fails, you can manually verify the contracts using the parameters displayed by the script. 