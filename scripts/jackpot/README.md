# RedDragon Swap-Based Jackpot System

This directory contains scripts for the dynamic swap-based jackpot distribution system.

## Chain Information

- **Chain ID**: 146 (Sonic)

## Files

- `autodistribute-jackpot.js` - Core module for checking and distributing jackpots
- `swap-with-jackpot.js` - Example implementation showing integration with swaps

## How to Use

### Checking Jackpot Conditions

To check if a jackpot should be distributed:

```javascript
const { checkAndDistributeJackpot } = require('./jackpot/autodistribute-jackpot');

// Check jackpot after a swap
const jackpotResult = await checkAndDistributeJackpot({
  lotteryAddress: process.env.LOTTERY_CONTRACT_ADDRESS,
  signer: adminWallet,
  chainId: 146  // Explicitly specify Sonic chain ID
});

if (jackpotResult.success && jackpotResult.distributed) {
  console.log("Jackpot distributed!");
}
```

### Testing

Test the jackpot distribution with:

```bash
npx hardhat run scripts/jackpot/swap-with-jackpot.js --network sonic
```

See `JACKPOT-DISTRIBUTION.md` in the root directory for full documentation. 