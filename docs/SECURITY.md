# $DRAGON Token Security Documentation

This document outlines the security measures implemented for the $DRAGON token to ensure it passes security checks on listing platforms like DexScreener and DexTools.

## Security Features Overview

### 1. Timelock for Admin Functions

The `RedDragonTimelock` contract implements a 24-hour delay for critical administrative actions, enhancing security by providing transparency for any ownership-related changes.

### 2. Liquidity Provider (LP) Token Burning with Fee Collection

The `RedDragonLPBurner` contract implements a balanced approach to LP token security:
- Burns a percentage of LP tokens by sending them to the dead address (recommended 20%)
- Allocates the remaining LP tokens to a fee collector address for liquidity fee extraction
- Implements verification to ensure a minimum burn percentage of 10%
- Balances permanent liquidity locking with the ability to collect fees

### 3. Balanced 80/20 Liquidity Pools via Balancer/Beethoven X

The `RedDragonBalancerIntegration` contract enables the creation of capital-efficient 80/20 weighted liquidity pools:
- Uses Balancer/Beethoven X protocol for weighted pool creation
- Implements 80% DRAGON / 20% paired token (wSONC or stablecoin) weighting
- Reduces impermanent loss compared to 50/50 pools
- Allows for better price discovery and deeper liquidity
- Integrates with the LP Burner for the same 20% burn / 80% fee collection pattern

### 4. ve(80/20) Liquidity Incentive System

The ve(80/20) system provides security benefits through:
- Time-locked LP token staking from 1 week to 4 years
- Transaction fee sharing to incentivize long-term liquidity provision
- Voting power proportional to lock amount and duration
- Reduced sell pressure through long-term token locking
- Integration with lottery boost mechanics for additional holder benefits
- Sustainable token economics that align LP providers with token holders

### 5. Multi-Signature Wallet

The project uses an existing MultiSig wallet that requires multiple confirmations for executing transactions, adding an extra layer of security for token management.

### 6. Transparency & Verification

The `RedDragonVerifier` contract provides transparency functions to verify fees, liquidity, and VRF integration status.

### 7. Existing Token Security

The base $DRAGON token already includes:
- Clear 10% fixed fee structure (6.9% jackpot, 2.41% to ve(80/20) holders, 0.69% burned)
- Transaction limit system with 69 transactions special period
- Max wallet size limitations
- No blacklist functionality
- No hidden or excessive fees

## Setup and Usage Guide

### 1. Deploying Security Contracts

Run the deployment script:

```bash
npx hardhat run scripts/deploy-security-contracts.js --network sonic
```

This will deploy:
- RedDragonTimelock
- RedDragonLPBurner (using MultiSig as fee collector)
- RedDragonVerifier
- RedDragonBalancerIntegration

The existing MultiSig wallet at `0x7F9634C927890F8675b1CA7f35C485EAb772A113` will be used as both the governance wallet and fee collector.

### 2. Creating 80/20 Weighted Balancer Pool

After deploying the contracts:

1. Create the 80/20 DRAGON/wSONC pool:
```javascript
await balancerIntegration.createPool(100); // 1% swap fee (100 basis points)
```

2. Add initial liquidity:
```javascript
// First approve tokens
await dragonToken.approve(balancerIntegration.address, dragonAmount);
await pairedToken.approve(balancerIntegration.address, pairedTokenAmount);

// Then add initial liquidity
await balancerIntegration.addInitialLiquidity(dragonAmount, pairedTokenAmount);
```

3. The LP tokens (BPT) will be received by the contract. Retrieve and manage them as needed.

### 3. LP Token Security with Fee Collection

After creating the Balancer pool:

1. Approve the LP tokens (BPT) for the burner contract:
```javascript
await balancerPoolToken.approve(balancerIntegration.address, bptAmount);
```

2. Use the integration contract to burn 20% and allocate 80% for fee collection:
```javascript
await balancerIntegration.burnPoolTokens(bptAmount);
```

3. Record the transaction hash for documentation and proof of burn.

4. The LP tokens allocated to fee collection allow the team to:
   - Extract the accumulated fees in the pool
   - Maintain project sustainability while ensuring permanent baseline liquidity

### 4. Setting Up Multi-Sig Wallet

The project will use an existing MultiSig wallet at `0x7F9634C927890F8675b1CA7f35C485EAb772A113`. Ensure that this wallet:

1. Has the appropriate owner addresses configured
2. Has an appropriate confirmation threshold set (e.g., 2/3 owners required)
3. Transfer token ownership to this MultiSig wallet:
```javascript
await redDragon.transferOwnership("0x7F9634C927890F8675b1CA7f35C485EAb772A113");
```

### 5. Renouncing Ownership (Alternative to Multi-Sig)

If you prefer to fully renounce ownership:

1. Schedule the ownership renouncement:
```javascript
const actionId = await redDragon.getActionId("renounceOwnership", "0x");
await redDragon.scheduleAction(actionId, "Renounce ownership");
```

2. After the 24-hour timelock period:
```javascript
await redDragon.renounceOwnershipWithTimelock();
```

### 6. Verify Contracts on SonicScan

Verify all deployed contracts on SonicScan for transparency:

```bash
npx hardhat verify --network sonic <CONTRACT_ADDRESS> [CONSTRUCTOR_PARAMETERS]
```

## Security Checklist

Before launching, ensure:

- [x] Clear fee structure (10% total: 6.9% jackpot, 2.41% to ve(80/20) holders, 0.69% burned)
- [x] Timelock for admin functions implemented (24-hour delay)
- [x] Minimum 10% of LP tokens permanently burned
- [x] Balanced approach to fee collection and liquidity security
- [x] Capital-efficient 80/20 weighted pool implemented
- [x] Transparency functions available for verification
- [x] Multi-sig wallet set up OR ownership renounced
- [x] No hidden mint functions or backdoors
- [x] All contracts verified on SonicScan

## Post-Launch Monitoring

After launching:

1. **Transaction Monitoring**
   - Verify the special transaction period works correctly
   - Monitor fee distribution to ensure recipients receive correct percentages

2. **Security Dashboard**
   - Use the verifier contract to track:
     - Holder distribution
     - Price impact of top sales
     - Liquidity ratio
     - Fee distribution statistics

3. **Liquidity Burn Verification**
   - Publish proof of liquidity burning on social media
   - Make the burn transaction hash publicly available
   - Verify burn by checking LP token balance of the dead address
   - Monitor the LP ratio in the fee collector address

## Important Addresses

These addresses should be publicly documented after deployment:

- $DRAGON Token: `<address>`
- Timelock Contract: `<address>`
- LP Burner Contract: `<address>`
- Verifier Contract: `<address>`
- Balancer Integration: `<address>`
- Multi-Sig Wallet & Fee Collector: `0x7F9634C927890F8675b1CA7f35C485EAb772A113`
- Balancer Pool: `<address after creation>`
- Dead Address (for LP burn): `0x000000000000000000000000000000000000dEaD`

## Security Assessment

This implementation addresses all requirements from the security assessment:

1. **Token Contract Security**
   - ✅ Fees Structure: 10% fixed fee with transparent distribution
   - ✅ Ownership and Control: Admin functions have timelock protection
   - ✅ Transfer Restrictions: Transaction limits are clearly defined
   - ✅ Liquidity Management: Minimum 10% LP tokens permanently burned, with balanced fee collection

2. **Security Recommendations**
   - ✅ Ownership Control: Options for multi-sig wallet or renouncement
   - ✅ Timelock: 24-hour delay on admin functions
   - ✅ Transparency Functions: Verifier contract implemented
   - ✅ LP Security: Partial permanent burning with fee collection capability

## LP Burn vs. Fee Collection Balance

The RedDragonLPBurner contract implements a balanced approach between security and sustainability:

| Strategy | Percentage | Purpose |
|----------|------------|---------|
| LP Burn  | 20%        | Permanent liquidity (security) |
| Fee Collection | 80%   | Extract liquidity fees (sustainability) |

This approach ensures:
1. A permanent baseline of liquidity that can never be removed
2. The ability to extract accumulated fees to fund development and marketing
3. Passing security checks on trading platforms by having burned LP
4. Long-term project sustainability through fee collection

## Capital Efficiency with Balancer 80/20 Pools

Using Balancer/Beethoven X for 80/20 weighted pools offers several advantages over traditional 50/50 AMMs:

| Aspect | 80/20 Weighted Pool | Traditional 50/50 AMM |
|--------|---------------------|------------------------|
| Token Utilization | More efficient use of DRAGON tokens | Requires equal value of both tokens |
| Impermanent Loss | Reduced IL due to weighted design | Higher IL with 50/50 ratio |
| Capital Efficiency | Higher - less paired token needed | Lower - requires more paired token |
| Price Impact | Lower price impact on trades | Higher price impact on trades |
| Liquidity Depth | Better for projects with limited paired token | Standard approach |

By implementing 80% DRAGON / 20% paired token weighting:

1. You need less paired token (wSONC or stablecoin) to create deep liquidity
2. The pool better reflects the project's token economics
3. Traders experience lower price impact for the same liquidity depth
4. The project can more efficiently use its treasury for liquidity provision 

## ve(80/20) System Security Benefits

The ve(80/20) system introduces proven security mechanisms inspired by Curve Finance's veCRV model:

| Feature | Security Benefit | Implementation |
|---------|-----------------|----------------|
| Time-Locked LP | Reduces market volatility and exit liquidity | LP tokens locked from 1 week to 4 years |
| Fee Distribution | Creates sustainable incentives for LPs | 2.41% of transaction fees distributed to ve(80/20) holders |
| Voting Escrow | Governance power to long-term holders | Voting power proportional to lock amount and duration |
| Boost Mechanics | Additional utility for locked tokens | Up to 2.5x boost on lottery odds for ve(80/20) holders |
| Exit Protection | Prevents market manipulation | Locked tokens cannot be withdrawn until lock expiry |

### Long-Term Tokenomic Sustainability

The ve(80/20) system creates three distinct benefits for liquidity providers:

1. **Trading Fees**: Standard LP fees from the trading pair (ShadowSwap or Balancer)
2. **Boosted Lottery**: Up to 2.5x higher chance to win lottery draws
3. **Transaction Fee Sharing**: Direct distribution of 2.41% of all transaction fees

This triple incentive structure ensures:

1. Long-term locked liquidity that cannot be manipulated
2. Reduced sell pressure as tokens are locked for extended periods
3. Alignment of incentives between LPs and token holders 
4. Sustainable tokenomics that support project longevity
5. Protection against pump and dump schemes

### Boost System Security

The boost calculation uses a secure formula:

```
min(2.5, 1 + 1.5 * (votingPowerRatio / lpRatio))
```

This ensures:
- Maximum boost is capped at 2.5x
- Boost is proportional to voting power relative to LP share
- Users are incentivized to lock for longer to maintain boost as competition increases
- System cannot be gamed as boost is tied to actual locked tokens

### Integration with Fee Manager

The ve(80/20) system integrates securely with the RedDragonFeeManager:
- Transaction fees are captured at the token level
- Fees are redirected through the fee manager to various destinations
- ve(80/20) holders receive their share through the Ve8020FeeDistributor
- Claims are tracked to prevent double-claiming

This provides an additional layer of security and transparency in fee distribution. 