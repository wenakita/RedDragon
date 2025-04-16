# Red Dragon Deployment Documentation

## Deployed Contracts on Sonic Mainnet (Chain ID 146)

| Contract | Address | Verified |
|----------|---------|----------|
| MockPaintSwapVerifier | 0xb8249eeFe931A74269F2650f125936f506FceaA9 | ❌ |
| PromotionalItemRegistry | 0x7D4a9b727BC722F522BC630f01883B002B80953b | ❌ |
| GoldScratcher | 0xe66EC78fA742B98b8a3AD7107F392EECBbDC77D5 | ❌ |
| ConcreteDragonLotterySwap | 0xF52b4D3B2608B02F8d2F9Ead4282F0378aCC5845 | ❌ |
| Dragon Token | 0x10eeEA6C868Ef069e3571933ea6AF2b91922b637 | ❌ |
| ve8020 Token | 0xb5C23c1F2BeBA4575F845DEc0E585E404BEE3082 | ❌ |
| ve8020FeeDistributor | 0xc51EFC97d7619F202EF176232C52E42ea4A05e25 | ❌ |
| PriceOracle | 0x2abC94e73A5Fc3ffF1781d9eDcadc534BFDFE51F | ❌ |

## Contract Verification Instructions

Due to SonicScan's daily limit on contract verifications, you'll need to verify contracts one by one using the following command:

```bash
CONTRACT_INDEX=<index> npx hardhat run scripts/verify-single.js --network sonic
```

Where `<index>` is one of the following:
- 0: MockPaintSwapVerifier
- 1: PromotionalItemRegistry
- 2: GoldScratcher
- 3: ConcreteDragonLotterySwap
- 4: Dragon Token
- 5: ve8020 Token
- 6: ve8020FeeDistributor
- 7: PriceOracle

## Post-Deployment Tasks

### 1. ve8020 Address Update

The ve8020 address needs to be updated in the Dragon token. This is a timelocked operation:

```bash
# First, schedule the update (only if not already scheduled)
npx hardhat run scripts/schedule-ve8020-update.js --network sonic

# Check the timelock status
npx hardhat run scripts/check-ve8020-timelock.js --network sonic

# Execute the update when the timelock has expired (after 24 hours)
npx hardhat run scripts/execute-ve8020-update.js --network sonic
```

### 2. Set up Exchange Pair

After creating the liquidity pool, you'll need to set the exchange pair address in the Dragon token:

```bash
EXCHANGE_PAIR=0x... npx hardhat run scripts/set-exchange-pair.js --network sonic
```

Replace `0x...` with the actual exchange pair address from the DEX.

## Available Scripts

| Script | Description |
|--------|-------------|
| `verify-single.js` | Verifies a single contract at a time (use CONTRACT_INDEX env var) |
| `schedule-ve8020-update.js` | Schedules the ve8020 address update in Dragon token |
| `check-ve8020-timelock.js` | Checks if the ve8020 update timelock has expired |
| `execute-ve8020-update.js` | Executes the ve8020 address update after timelock expires |
| `set-exchange-pair.js` | Sets the exchange pair address in the Dragon token |

## Constructor Arguments for Manual Verification

If you need to manually verify contracts on SonicScan, here are the constructor arguments:

### MockPaintSwapVerifier
```
[]
```

### PromotionalItemRegistry
```
[]
```

### GoldScratcher
```
["Gold Scratcher", "GSCRATCH", "https://api.sonicreddragon.com/metadata/scratcher/", "unrevealed", "winner", "loser"]
```

### ConcreteDragonLotterySwap
```
["0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38", "0xb8249eeFe931A74269F2650f125936f506FceaA9", "0x7D4a9b727BC722F522BC630f01883B002B80953b", "0xe66EC78fA742B98b8a3AD7107F392EECBbDC77D5"]
```

### Dragon Token
```
["0xF52b4D3B2608B02F8d2F9Ead4282F0378aCC5845", "0x78266EAb20Ff1483a926F183B3E5A6C84f87D54c", "0x000000000000000000000000000000000000dEaD", "0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38"]
```

### ve8020 Token
```
["0x10eeEA6C868Ef069e3571933ea6AF2b91922b637"]
```

### ve8020FeeDistributor
```
["0xb5C23c1F2BeBA4575F845DEc0E585E404BEE3082", "0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38"]
```

### PriceOracle
```
["50000000"]
``` 