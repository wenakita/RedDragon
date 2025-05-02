# VRF System Deployment Guide

This guide covers the deployment process for the VRF (Verifiable Random Function) system, which consists of:

1. ArbitrumVRFRequester on Arbitrum
2. SonicVRFConsumer on Sonic
3. SonicVRFConsumerRead (optional) on Sonic for monitoring

## Prerequisites

- Access to both Arbitrum and Sonic networks
- Private keys with sufficient funds on both networks
- Chainlink VRF subscription on Arbitrum
- LayerZero endpoints configured on both networks
- Main Dragon token system already deployed

## Environment Setup

Create a `deployment.env` file in the project root with the following variables:

```
# Network Configuration
MAINNET_RPC_URL=https://rpc.soniclabs.com
MAINNET_CHAIN_ID=146
PRIVATE_KEY=your_sonic_private_key
ARBITRUM_MAINNET_RPC_URL=https://arb1.arbitrum.io/rpc
ARBITRUM_PRIVATE_KEY=your_arbitrum_private_key

# LayerZero Configuration
SONIC_LZ_ENDPOINT=0xb6319cC6c8c27A8F5dAF0dD3DF91EA35C4720dd7
ARBITRUM_LZ_ENDPOINT=0x3c2269811836af69497E5F486A85D7316753cf62
LZ_SONIC_CHAIN_ID=146
LZ_ARBITRUM_CHAIN_ID=110

# VRF Configuration
VRF_COORDINATOR_ARBITRUM=0x...  # Chainlink VRF Coordinator on Arbitrum
VRF_SUBSCRIPTION_ID=12345       # Your Chainlink VRF subscription ID
VRF_KEY_HASH=0x...              # VRF key hash for your desired gas lane
VRF_CALLBACK_GAS_LIMIT=500000   # Gas limit for VRF callback

# Contract Addresses
DRAGON_ADDRESS=0x...            # Your deployed Dragon token
WRAPPED_SONIC_ADDRESS=0x...     # Wrapped Sonic (wS) token

# Optional
VRF_READ_DELEGATE=0x...         # Delegate for the Read contract (can be set later)
```

## Deployment Steps

### 1. Deploy ArbitrumVRFRequester on Arbitrum

```bash
# Connect to Arbitrum network
npx hardhat deploy:arbitrum-vrf --network arbitrum
```

This will:
- Deploy the ArbitrumVRFRequester contract
- Configure it with your VRF subscription
- Set the SonicVRFConsumer address to a placeholder (to be updated later)

Note the deployed address, which will be displayed in the console and saved to `deployment.env` as `VRF_REQUESTER_ARBITRUM`.

### 2. Fund the Chainlink VRF Subscription

Before proceeding, ensure your Chainlink VRF subscription on Arbitrum is:
- Properly funded with LINK tokens
- Has the ArbitrumVRFRequester contract address added as a consumer

This is a manual step that must be done through the Chainlink VRF UI or API.

### 3. Deploy SonicVRFConsumer on Sonic

```bash
# Connect to Sonic network
npx hardhat deploy:sonic-vrf --network sonic
```

This will:
- Deploy the SonicVRFConsumer contract
- Configure it with the Arbitrum VRF requester address
- Set the lottery contract address (will be DragonSwapTriggerV2)

Note the deployed address, which will be displayed in the console and saved to `deployment.env` as `VRF_CONSUMER_SONIC`.

### 4. Deploy SonicVRFConsumerRead (Optional)

For enhanced monitoring capabilities:

```bash
npx hardhat deploy:sonic-vrf-read --network sonic
```

This contract allows you to query the VRF configuration on Arbitrum without making full cross-chain transactions.

### 5. Update ArbitrumVRFRequester with SonicVRFConsumer Address

Now that we have both contracts deployed, we need to update the ArbitrumVRFRequester with the SonicVRFConsumer address:

```bash
npx hardhat update-arbitrum-vrf --network arbitrum
```

This will call `updateSonicVRFConsumer()` on the ArbitrumVRFRequester contract.

### 6. Fund Contracts with Native Tokens

Both contracts need to be funded with native tokens (ETH on Arbitrum, Sonic on Sonic) to pay for LayerZero fees:

```bash
# Fund ArbitrumVRFRequester with ETH for return trip fees
npx hardhat fund-contract --address $VRF_REQUESTER_ARBITRUM --amount 0.5 --network arbitrum

# Fund SonicVRFConsumer with Sonic for request fees
npx hardhat fund-contract --address $VRF_CONSUMER_SONIC --amount 10 --network sonic
```

### 7. Connect VRF Consumer to DragonSwapTriggerV2

Update the DragonSwapTriggerV2 contract to use the SonicVRFConsumer:

```bash
npx hardhat connect-vrf --network sonic
```

This will:
- Call `updateVRFConsumer()` on DragonSwapTriggerV2 to set the SonicVRFConsumer address
- Call `updateLotteryContract()` on SonicVRFConsumer to set the DragonSwapTriggerV2 address

### 8. Test Cross-Chain VRF Flow

Perform a test of the VRF system to ensure everything is working correctly:

```bash
npx hardhat test-vrf-flow --network sonic
```

This will trigger a test swap and ensure randomness flows correctly through the system.

## Configuration Options

### Fallback Mechanism

The VRF system includes a fallback mechanism for when Chainlink VRF is temporarily unavailable:

```bash
# Enable fallback with a 30-minute cooldown
npx hardhat configure-vrf-fallback --enabled true --cooldown 1800 --network sonic
```

### LayerZero Read Configuration

If you deployed SonicVRFConsumerRead, configure the delegate for enhanced security:

```bash
# Set the delegate address for read operations
npx hardhat configure-vrf-read --delegate $VRF_READ_DELEGATE --network sonic
```

## Security Considerations

1. **Ownership Transfer**: Transfer ownership of both contracts to a multisig wallet:
   ```bash
   npx hardhat transfer-ownership --contract $VRF_REQUESTER_ARBITRUM --newOwner $MULTISIG_ADDRESS --network arbitrum
   npx hardhat transfer-ownership --contract $VRF_CONSUMER_SONIC --newOwner $MULTISIG_ADDRESS --network sonic
   ```

2. **Verify Contracts**: Verify both contracts on their respective block explorers:
   ```bash
   npx hardhat verify $VRF_REQUESTER_ARBITRUM --network arbitrum
   npx hardhat verify $VRF_CONSUMER_SONIC --network sonic
   ```

3. **Access Control**: Ensure that only authorized contracts can request randomness

## Monitoring

The SonicVRFConsumerRead contract provides monitoring capabilities:

- Query the current VRF configuration on Arbitrum
- Check if the VRF subscription is properly funded
- Monitor gas limits and confirmation settings

Use the following command to query the current state:

```bash
npx hardhat query-vrf-state --network sonic
```

## Troubleshooting

### Common Issues

1. **LayerZero Fees Too Low**: If cross-chain messages fail, the fees might be too low. Increase the fee amount in the contracts.

2. **VRF Subscription Not Funded**: Ensure your Chainlink VRF subscription has sufficient LINK tokens.

3. **Gas Limit Too Low**: If callbacks are failing, increase the `callbackGasLimit` parameter.

4. **Cross-Chain Message Failure**: Check that the trusted remotes are correctly configured on both contracts.

For additional assistance, consult the development team or refer to the LayerZero and Chainlink VRF documentation. 