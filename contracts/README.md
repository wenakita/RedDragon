# Dragon Contract Ecosystem

This is the main folder containing all the smart contracts for the Dragon ecosystem.

## Contract Migration

We recently completed a migration from the old "RedDragon" naming scheme to the simpler "Dragon" naming scheme. The following contracts have been consolidated or renamed:

### Lottery System

The following three contracts have been consolidated into a single `DragonLotterySwap.sol` contract:
- `RedDragonSwapLottery.sol` (removed)
- `RedDragonSwapLotteryWithScratcher.sol` (removed)
- `RedDragonSwapLotteryWithPromotions.sol` (removed)

### Token and Utilities

- `RedDragon.sol` → `Dragon.sol`
- `RedDragonJackpotVault.sol` → `DragonJackpotVault.sol`
- `RedDragonLPBooster.sol` → `DragonLPBooster.sol`
- `RedDragonBalancerIntegration.sol` → `DragonBalancerIntegration.sol`

### Interface Updates

- `IRedDragonPaintSwapVRF.sol` → `IDragonPaintSwapVRF.sol`
- `IRedDragonLPBooster.sol` → `IDragonLPBooster.sol` 
- `IRedDragonSwapLottery.sol` → `IDragonLotterySwap.sol`

## Benefits of Consolidation

The consolidation of the lottery contracts provides several advantages:

1. **Reduced Code Duplication**: Common functionality is now in a single place
2. **Simplified Maintenance**: Bug fixes and updates only need to be made once
3. **Improved Testing**: One test suite for all lottery functionality
4. **Lower Gas Costs**: Deployment and interaction costs are reduced
5. **Better Developer Experience**: Clearer codebase organization

## Contract Organization

- **Core Token**: `Dragon.sol` - The main token of the ecosystem
- **Lottery**: `DragonLotterySwap.sol` - Combined lottery functionality
- **Voting**: `ve8020.sol`, `ve8020FeeDistributor.sol` - Governance system
- **Rewards**: `GoldScratcher.sol`, `RedEnvelope.sol` - Bonus reward mechanisms
- **Infrastructure**: `DragonBalancerIntegration.sol`, `DragonJackpotVault.sol`, etc.

## Deployment

See `deployments/README-UPDATED.md` for detailed deployment instructions.

## Testing

Run the tests with:

```
npm test
```

The main lottery-specific tests are:
- `test/DragonLotterySwap.test.js`
- `test/GoldScratcher.test.js`

## Dependencies

The contracts rely on:
- OpenZeppelin contracts for security and standardization
- PaintSwap VRF for randomness
- Balancer protocol for liquidity

## License

MIT 