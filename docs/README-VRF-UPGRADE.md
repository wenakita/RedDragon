# VRF System Upgrade Guide

This guide explains how to upgrade from the legacy `EnhancedSonicVRFConsumer` to the new OAppRead-based system for cross-chain VRF state reading.

## Overview of Changes

### Legacy Approach
The legacy system used:
- `EnhancedSonicVRFConsumer.sol` that combined both VRF request/response handling and LayerZero Read functionality
- Custom implementations for reading cross-chain state
- Direct management of lottery logic within the same contract

### New Architecture
The new system separates concerns:
- `SonicVRFConsumer.sol` - Handles only VRF request/response functionality
- `SonicVRFConsumerRead.sol` - Implements OAppRead for cross-chain state reading
- `DragonLottery.sol` (external) - Manages lottery logic separately

## Upgrade Steps

### 1. Deploy New Contracts

First, deploy the new VRF consumer:

```bash
npx hardhat run scripts/deploy_sonic_vrf.js --network sonic
```

Then, deploy the new OAppRead contract:

```bash
npx hardhat run scripts/deploy_sonic_vrf_read.js --network sonic
```

### 2. Configure LayerZero Read

Run the setup script to configure LayerZero Read:

```bash
npx hardhat run test/deployment/setup_layerzero_read.js --network sonic
```

### 3. Update Integration Points

If your system has other contracts that interact with the VRF consumer, update them to use the new contracts:

- For VRF requests, use `SonicVRFConsumer.requestRandomness()`
- For state reading, use `SonicVRFConsumerRead.queryArbitrumVRFState()`

### 4. Verify Contract State

You can verify that the new system is working by:

1. Funding the `SonicVRFConsumerRead` contract with ETH for LayerZero fees
2. Querying the VRF state from Arbitrum:

```javascript
// In hardhat console
const consumerRead = await ethers.getContractAt("SonicVRFConsumerRead", "<address>");
await consumerRead.queryArbitrumVRFState("0x", {value: ethers.utils.parseEther("0.01")});
```

3. After a few seconds, check the state:
```javascript
const subscriptionId = await consumerRead.lastQueriedSubscriptionId();
const keyHash = await consumerRead.lastQueriedKeyHash();
const confirmations = await consumerRead.lastQueriedConfirmations();
console.log({ subscriptionId, keyHash, confirmations });
```

## Key Benefits of the Upgrade

1. **Separation of Concerns**: Each contract has a single responsibility
2. **Standard LayerZero Compatibility**: Uses the official OAppRead library from LayerZero
3. **Enhanced Security**: Reduced surface area for each contract
4. **Better Maintainability**: Easier to upgrade individual components
5. **Gas Efficiency**: Optimized read operations with less overhead

## Architecture Comparison

### Legacy Architecture
```
EnhancedSonicVRFConsumer
├── VRF Requests/Responses
├── Lottery Logic 
└── Custom LayerZero Read Implementation
```

### New Architecture
```
├── SonicVRFConsumer (VRF Requests/Responses)
├── SonicVRFConsumerRead (OAppRead Implementation)
└── DragonLottery (External Lottery Logic)
```

## Technical Details

### OAppRead Contract

The `SonicVRFConsumerRead` contract now properly inherits from the `OAppRead` contract provided by LayerZero:

```solidity
contract SonicVRFConsumerRead is OAppRead {
    // ...
}
```

This gives it access to standardized LayerZero functionality for reading state across chains.

### DVN Configuration

The new system still requires configuring Data Validation Networks (DVNs), but now uses a more standardized approach through the `configureDVNs` function:

```solidity
function configureDVNs(
    uint32 _channelId,
    address[] memory _dvns,
    uint8 _thresholdStart,
    uint8 _thresholdEnd
) external onlyOwner {
    // ...
}
```

### Channel Activation

Instead of a custom `setReadChannel` function, we now use the standard `setReadChannel` provided by OAppRead:

```solidity
// In OAppRead.sol
function setReadChannel(uint32 _channelId, bool _active) public virtual onlyOwner {
    _setPeer(_channelId, _active ? AddressCast.toBytes32(address(this)) : bytes32(0));
}
``` 