# Dynamic Jackpot Distribution Guide

## Overview

The RedDragon system includes a dynamic jackpot distribution mechanism that triggers based on the jackpot amount and swap activity, rather than on a fixed schedule. When users perform swaps, the system automatically checks if the jackpot has reached the minimum threshold and distributes it if conditions are met.

This system is configured to run on chain ID 146 (Sonic).

## How It Works

1. **Per-Swap Check**: Each time a swap occurs in the RedDragon system, the jackpot distribution check is triggered
2. **Threshold Verification**: The system compares the current jackpot amount against the configured minimum threshold
3. **Automatic Distribution**: If the jackpot exceeds the threshold, it is automatically distributed to eligible users

## Configuration

Set the following in your `.env` file:

```
# Jackpot Distribution Configuration
MIN_JACKPOT_AMOUNT="100"  # Minimum amount (in ETH) required before distribution
LOTTERY_CONTRACT_ADDRESS="0x..."  # Your deployed lottery contract
REDDRAGON_ADDRESS="0x..."  # Your deployed RedDragon token
```

## Integration Guide

### 1. Import the Jackpot Check Module

In your swap processing code, import the jackpot distribution module:

```javascript
const { checkAndDistributeJackpot } = require('./scripts/autodistribute-jackpot');
```

### 2. Call the Jackpot Check After Swaps

Add the jackpot check to your swap function:

```javascript
async function processSwap(user, amount, token) {
  // Process the swap transaction
  const swapResult = await performSwap(user, amount, token);
  
  // After swap is complete, check if jackpot should be distributed
  const jackpotResult = await checkAndDistributeJackpot({
    lotteryAddress: process.env.LOTTERY_CONTRACT_ADDRESS,
    signer: adminWallet, // Use the admin wallet or contract caller as appropriate
    chainId: 146 // Specify chain ID 146 (Sonic)
  });
  
  // Handle the result
  if (jackpotResult.success && jackpotResult.distributed) {
    // Jackpot was distributed - update UI, notify users, etc.
    emitJackpotEvent(jackpotResult.jackpotAmount, jackpotResult.txHash);
  }
  
  return swapResult;
}
```

### 3. Testing the Integration

You can test the jackpot distribution using the sample script:

```bash
npx hardhat run scripts/swap-with-jackpot.js --network sonic
```

This script demonstrates the integration of swaps with the jackpot distribution mechanism on chain ID 146.

## Security Considerations

1. **Transaction Authority**: Ensure that only authorized accounts/contracts can trigger the jackpot distribution
2. **Gas Costs**: Be aware that the jackpot distribution will increase gas costs for the transaction that triggers it
3. **Reentrancy Protection**: The lottery contract has reentrancy protection, but be cautious when integrating with other contracts
4. **Chain ID Verification**: The system is configured for chain ID 146, make sure your environment is set up correctly

## Troubleshooting

If the jackpot distribution isn't working as expected:

1. Check that `MIN_JACKPOT_AMOUNT` is set correctly
2. Verify that the contract addresses in your `.env` file are correct
3. Ensure the account calling the distribution has sufficient permissions
4. Check that there are eligible recipients for the jackpot
5. Confirm you're operating on chain ID 146

## Example Implementation

See `scripts/swap-with-jackpot.js` for a complete example of how to implement the dynamic jackpot distribution with swaps. 