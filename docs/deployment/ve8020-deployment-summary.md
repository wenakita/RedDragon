# RedDragon ve(80/20) System Deployment Summary

## Deployed Contracts

| Contract | Address | Description |
|----------|---------|-------------|
| RedDragon | 0x45237fD4F00FB2160005dB659D4dD5B36b77c265 | Main token contract |
| ve8020 | 0x6f542540D8CDd89b7A60208Dddd3BcBd2133fc5d | Vote-escrowed 80/20 LP token system |
| Ve8020FeeDistributor | 0x735AC559fFb23836Be856578DBCE928E4c9f6375 | Distributes fees to ve(80/20) holders |
| RedDragonFeeManager | 0xB59529C7ff72dEb7E7007a443492be052bC3Fdb5 | Manages fee distribution |
| LP Token | 0xc59944C9AFe9eA9c87b21dBb3D753c5D1ccCF978 | 80/20 DRAGON-wS LP token |
| RedDragonSwapLottery | 0x55eF655ff73E1F8FD0fA07b95634fD28A7C0A8fa | Lottery contract with setVerifier function |
| RedDragonPaintSwapVerifier | 0xDAEb4CE8B52Bd3a7fF56Bc39530B8F64a6debc50 | Security-enhanced VRF verifier |
| RedDragonVerifier | 0x46b00FcF71Ea5e8CD40179E84c22f003c743B0d3 | Enhanced security verification contract |

## Addresses

| Name | Address | Description |
|------|---------|-------------|
| Wrapped Sonic | 0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38 | wS token |
| Jackpot Vault | 0xc57afdcb9b47bb7a2dc07c8ab8054e96c103fc6b | Receives jackpot fees |
| Burn Address | 0x000000000000000000000000000000000000dEaD | Receives burn fees |
| Lottery | 0x55eF655ff73E1F8FD0fA07b95634fD28A7C0A8fa | RedDragonSwapLottery contract |

## Deployment Achievements

1. ✅ Deployed ve8020 contract for locking LP tokens
2. ✅ Deployed Ve8020FeeDistributor for distributing fees to ve(80/20) holders
3. ✅ Deployed RedDragonFeeManager for managing fee distribution
4. ✅ Configured RedDragon token to use the fee manager as the lottery address
5. ❌ Couldn't deploy ve8020LotteryIntegrator due to ownership issue with the lottery contract
6. ✅ Removed LP Burner completely - no LP tokens will be burned
7. ✅ Enhanced security by fixing randomness generation vulnerabilities
8. ✅ Redeployed lottery contract with verifier update capability

## Fee Distribution

The system is configured for the following fee distribution:
- 6.9% of transfer fees go to the jackpot (lottery)
- 2.41% of transfer fees go to ve(80/20) holders via the fee distributor
- 0.69% of transfer fees are burned

## Next Steps

1. Once a sufficient amount of liquidity is created in the 80/20 pool, users can:
   - Lock their LP tokens in the ve8020 contract for 1 week to 4 years
   - Receive voting power and fee distribution rewards
   - Boost their lottery odds (up to 2.5x) based on their voting power

2. The lottery owner should deploy the ve8020LotteryIntegrator to connect the lottery to the ve8020 system:
   ```
   npx hardhat run scripts/deployment/deploy-ve8020-lottery-integrator.js --network sonic
   ```

3. Regular users can interact with the system through:
   - Staking LP tokens in the ve8020 contract
   - Claiming rewards from the Ve8020FeeDistributor
   - Participating in the lottery with boosted odds

## System Benefits

- LP providers earn three incentives:
  1. Regular trading fees from the LP position
  2. Boosted lottery odds (up to 2.5x)
  3. A share of 2.41% of all DRAGON transfers
- The boost calculation follows Curve's formula: min(2.5, 1 + 1.5 * (userVotingPower / totalVotingPower) / (userLPBalance / totalLPSupply)) 

## LP Burner Removal Improvements

We have removed the LP Burner component completely from the system. This brings several benefits:

1. **Simpler Architecture**: The system is now more streamlined without the complexity of an LP Burner component.
2. **No Token Burning**: Previously, a small percentage (0.01%) of LP tokens would be burned. Now, no LP tokens are burned at all.
3. **Maximum Returns**: All LP tokens go directly to the fee collector, ensuring users get maximum returns from the system.
4. **Lower Gas Costs**: Users will save on gas costs with fewer contract interactions and simpler operations.

## Latest Security Enhancements

The system has been significantly enhanced for security:

1. **Secure Randomness**: Fixed potential vulnerability in the randomness generation by ensuring randomness is always sourced from a verified VRF provider.

2. **No Insecure Fallbacks**: Removed all insecure fallback mechanisms for randomness generation to prevent potential exploitation.

3. **Improved Verifier Contract**: Enhanced the RedDragonVerifier contract with a new security check function that can verify if randomness is being generated securely.

4. **Lottery Upgradability**: Redeployed the lottery contract with the ability to update its verifier, enabling future security upgrades.

5. **Comprehensive Security Audit**: All interconnected components have been reviewed and updated to ensure system-wide security.

## Latest Updates

System was redeployed on August 24, 2023 with the following improvements:
- Completely removed LP Burner component
- Simplified system architecture
- Ensured 100% of LP tokens go to the fee distributor
- Updated all contract configurations 
- Fixed randomness generation security 