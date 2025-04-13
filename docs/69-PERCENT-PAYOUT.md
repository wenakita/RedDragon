# RedDragon 69% Payout Feature Implementation

This document outlines the deployment and migration process for updating the RedDragon Swap Lottery to implement a 69% payout feature.

## Overview

The original RedDragon Swap Lottery pays out 100% of the jackpot to winners. The new implementation modifies this to pay out 69% of the jackpot, leaving 31% in the contract. This change provides several benefits:

- **Jackpot Sustainability**: The remaining 31% helps rebuild the jackpot quickly after a win
- **Reduced Volatility**: More consistent jackpot sizes over time
- **System Longevity**: Less drastic swings in jackpot size helps maintain player interest
- **On-Brand**: The 69% payout aligns with the RedDragon brand theme

## Implementation Steps

### 1. Deploy RedDragonSwapLottery69 Contract

The new contract includes a 69% payout percentage constant:

```solidity
// Percentage of jackpot to pay out (69%)
uint256 private constant PAYOUT_PERCENTAGE = 69;
```

Use the deployment script to deploy the new contract:

```bash
npx hardhat run scripts/deployment/deploy-lottery69.js --network sonic
```

### 2. Verify Contract on Block Explorer

Verify the deployed contract on SonicScan:

```bash
npx hardhat run scripts/deployment/verify-lottery69.js --network sonic
```

### 3. Migrate Jackpot (Optional)

If you want to migrate the existing jackpot to the new lottery contract, follow these steps:

```bash
# Step 1: Propose emergency withdrawal (initiates timelock)
npx hardhat run scripts/deployment/migrate-jackpot.js --network sonic -- propose

# Step 2: Execute withdrawal after timelock period (24 hours)
npx hardhat run scripts/deployment/migrate-jackpot.js --network sonic -- execute

# Step 3: Transfer funds to new lottery
npx hardhat run scripts/deployment/migrate-jackpot.js --network sonic -- transfer
```

### 4. Compare and Validate

Run the comparison script to verify that the new lottery is configured correctly:

```bash
npx hardhat run scripts/deployment/check-lottery69.js --network sonic
```

### 5. Update Frontend and Backend References

Update all references to the lottery contract in frontend applications and backend services:

1. Update contract addresses in frontend configuration
2. Update ABI if needed (if there are interface changes)
3. Update any display logic to show the 69% payout feature

## Technical Details

### Key Differences in RedDragonSwapLottery69

1. **Payout Calculation**: In the `fulfillRandomness` function, the win amount is calculated as 69% of the jackpot:
   ```solidity
   uint256 winAmount = currentJackpot * PAYOUT_PERCENTAGE / 100;
   ```

2. **Jackpot Management**: After a win, 31% of the jackpot remains in the contract:
   ```solidity
   jackpot = currentJackpot - winAmount;
   ```

3. **Win Amount Getter**: A new function to get the potential win amount:
   ```solidity
   function getWinAmount() external view returns (uint256) {
       return getCurrentJackpot() * PAYOUT_PERCENTAGE / 100;
   }
   ```

### Migration Considerations

- The migration process requires owner/admin permissions on both lottery contracts
- The migration process has a timelock period for security (default 24 hours)
- The funds are transferred as wrapped Sonic (wS) tokens
- Migration is optional - you can simply start fresh with the new lottery

## Testing

Before deploying to production, thoroughly test:

1. **Win Probability**: Verify that win probabilities are calculated correctly
2. **Payout Amount**: Verify that winners receive exactly 69% of the jackpot
3. **Jackpot Growth**: Monitor how the jackpot grows over time with the 31% retention
4. **Contract Permissions**: Ensure all necessary permissions are granted to the new contract
5. **Frontend Integration**: Test all UI elements that display jackpot and win information

## Troubleshooting

### Common Issues:

1. **Permission Errors**: Ensure the deployer has the necessary roles and permissions
2. **Balance Issues**: Verify that the contracts have sufficient token balances
3. **Frontend Discrepancies**: Update all references to display the correct payout percentage
4. **Timelock Failures**: Ensure you wait the full timelock period before executing withdrawals

## Monitoring and Maintenance

After deployment:

1. Monitor the first few lottery wins to ensure correct payout amounts
2. Track jackpot growth patterns with the 31% retention
3. Collect user feedback on the new payout structure
4. Optimize parameters if needed based on observed behavior

## Future Considerations

The 69% payout feature opens possibilities for future enhancements:

1. Dynamic payout percentages based on jackpot size
2. Special events with modified payout structures
3. Use of the retained portion for additional ecosystem incentives 