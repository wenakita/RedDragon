# VRF Implementation Guide

This document explains how Verifiable Random Functions (VRF) are implemented in the RedDragon ecosystem.

## Overview

The RedDragon ecosystem uses PaintSwap's VRF service for secure, verifiable randomness. We've standardized the implementation across contracts using the `IVRFConsumer` interface.

## Implemented Contracts

The following contracts now implement the `IVRFConsumer` interface:

1. **RedDragonPaintSwapVerifier.sol**
   - Primary contract that directly interfaces with PaintSwap's VRF service
   - Manages VRF subscriptions and handles random number verification
   - Provides functions for other contracts to access randomness

2. **RedDragonSwapLottery.sol**
   - Implements VRF for lottery draws
   - Uses the RedDragonPaintSwapVerifier as an intermediary to access randomness
   - Delegates VRF configuration management to the verifier

## The `IVRFConsumer` Interface

The interface requires implementing these functions:

```solidity
function requestRandomness() external returns (bytes32);
function fulfillRandomness(bytes32 requestId, uint256[] memory randomWords) external;
function getVRFConfiguration() external view returns (
    address vrfCoordinator,
    bytes32 keyHash,
    uint64 subscriptionId
);
function isVrfEnabled() external view returns (bool);
```

## Implementation Patterns

### Direct VRF Consumer

The RedDragonPaintSwapVerifier directly consumes VRF services:

1. **Requesting Randomness**
   - Calls the PaintSwap VRF Coordinator's `requestRandomness` function
   - Stores the request ID for later verification

2. **Receiving Randomness**
   - Implements `fulfillRandomness` to receive random values from the VRF service
   - Validates the caller to ensure only the VRF Coordinator can provide values
   - Stores and processes the randomness

### Indirect VRF Consumer

The RedDragonSwapLottery delegates VRF interaction to the verifier:

1. **Requesting Randomness**
   - Calls the verifier's `requestRandomness` function
   - Stores user information associated with the request ID

2. **Receiving Randomness**
   - Implements `fulfillRandomness` to receive random values from the verifier
   - Processes the randomness according to lottery rules
   - Determines winners based on probability and the provided random value

## Security Considerations

1. **Request Authentication**
   - Only the VRF Coordinator can fulfill randomness requests
   - Requests are tracked using unique IDs to prevent replay attacks

2. **Governance Controls**
   - VRF configuration updates are timelock-protected
   - Sensitive parameters require a waiting period before they can be changed

3. **Circuit Breakers**
   - Pause functionality to stop randomness requests in emergency situations

## Usage Example

To add VRF functionality to a new contract:

1. Import the interface: `import "./interfaces/IVRFConsumer.sol";`
2. Implement the interface: `contract MyContract is IVRFConsumer {`
3. Implement all required functions
4. Connect to an existing VRF verifier or implement direct VRF consumption

## Maintenance

- Regular PaintSwap VRF subscription management is required
- Monitor subscription balances to ensure uninterrupted service
- Update VRF parameters if PaintSwap changes their VRF implementation 