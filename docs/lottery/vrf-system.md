# Verifiable Random Function (VRF) System

The DRAGON protocol lottery uses a sophisticated cross-chain Verifiable Random Function (VRF) to ensure provably fair randomness for jackpot distribution.

## VRF Architecture Overview

The VRF system utilizes a cross-chain architecture to leverage Chainlink VRF's secure randomness generation:

1. **Sonic Chain**: User-facing chain where swaps occur and lottery entries are initiated
2. **Arbitrum Chain**: Where secure randomness is generated via Chainlink VRF
3. **LayerZero**: Cross-chain messaging protocol connecting Sonic and Arbitrum

## Core Components

The VRF implementation consists of several specialized contracts:

### 1. SonicVRFConsumer.sol

- Deployed on Sonic chain
- Receives VRF requests from DragonSwapTrigger
- Forwards requests to Arbitrum via LayerZero
- Processes randomness when received from Arbitrum
- Routes randomness to the lottery contract

### 2. ArbitrumVRFRequester.sol

- Deployed on Arbitrum chain
- Receives cross-chain requests from Sonic
- Interfaces with Chainlink VRF on Arbitrum
- Returns randomness to Sonic via LayerZero

### 3. SonicVRFConsumerRead.sol

- Extension of SonicVRFConsumer
- Adds LayerZero Read capability for direct state queries
- Provides monitoring and diagnostic functions
- Enables viewing VRF configuration from Arbitrum

## Randomness Request Flow

1. User swaps wS for DRAGON on Sonic chain
2. DragonSwapTrigger calls SonicVRFConsumer.requestRandomness()
3. SonicVRFConsumer sends cross-chain message via LayerZero to Arbitrum
4. ArbitrumVRFRequester receives the message and calls Chainlink VRF
5. Chainlink VRF generates randomness and returns it to ArbitrumVRFRequester
6. ArbitrumVRFRequester sends randomness back to Sonic via LayerZero
7. SonicVRFConsumer receives randomness and forwards it to DragonSwapTrigger
8. DragonSwapTrigger determines if user won based on probability and randomness

## Security Features

The VRF system incorporates multiple security measures:

### Source Verification
- Only accepts randomness from authorized sources
- Validates cross-chain message origin

### Request Tracking
- Maintains request-to-user mapping to prevent manipulation
- Cleans up mappings after processing

### Cross-Chain Security
- Uses LayerZero's secure message passing between chains
- Handles message retries and failures gracefully

### Miner/Validator Resistance
- Chainlink VRF provides cryptographically verifiable randomness
- Miners/validators cannot predict or manipulate results

## Winner Determination

1. The random number from VRF is scaled to match probability scale (0-1,000,000)
2. User's win probability is calculated based on:
   - USD value of swap (linear scale from 0.0004% to 4%)
   - ve69LP boost (up to 2.5x multiplier)
3. If scaled randomness < calculated probability, user wins 69% of jackpot

## LayerZero Read Integration

For monitoring and diagnostics, the system leverages LayerZero's Read capability:

```solidity
function queryArbitrumVRFState() external payable returns (MessagingReceipt memory) {
    bytes memory cmd = getArbitrumVRFQuery();
    return _lzSend(
        READ_CHANNEL,
        cmd,
        combineOptions(READ_CHANNEL, READ_MSG_TYPE, _extraOptions),
        MessagingFee(msg.value, 0),
        payable(msg.sender)
    );
}
```

This allows direct querying of VRF configuration on Arbitrum, including subscription status, gas limits, and key hashes.
