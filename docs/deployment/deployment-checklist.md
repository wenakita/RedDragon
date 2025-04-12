# SonicRedDragon Production Deployment Checklist

## Pre-Deployment Checks

- [x] Fixed Compiler Error: Modified hardhat.config.js to include `viaIR: true` to resolve "Stack too deep" error
- [x] Updated .env: Added missing game configuration variables
- [x] Added Pity Timer Feature: Enhanced lottery with probability increases after losses
- [ ] Test Suite: Complete all tests before deploying to production
- [ ] Security Audit: Review contracts/integrations for security considerations
- [ ] Balancer Pool Settings: Verified pool name/symbol via `verify-balancer-names.js`

## Deployment Steps

### 1. Core Contracts Deployment
- [ ] Deploy RedDragonPaintSwapVerifier:
  ```bash
  npx hardhat run scripts/deploy-verifier.js --network sonic
  ```
- [ ] Setup VRF for the Verifier:
  ```bash
  npx hardhat run scripts/deployment/setup-vrf.js --network sonic
  ```
- [ ] Deploy RedDragonSwapLottery and RedDragon:
  ```bash
  npx hardhat run scripts/deployment/deploy-reddragon-sonic.js --network sonic
  ```

### 2. Security Contracts Deployment
- [ ] Deploy Security Contracts (MultiSig, Timelock, LP Burner, etc.):
  ```bash
  npx hardhat run scripts/deploy-security-contracts.js --network sonic
  ```

### 3. Balancer Integration Setup
- [ ] Verify Balancer pool name and symbol settings:
  ```bash
  node scripts/verify-balancer-names.js
  ```
- [ ] Create 80/20 Balancer Pool using the RedDragonBalancerIntegration contract
- [ ] Add initial liquidity to establish the pool
- [ ] Burn 20% of LP tokens for security while allocating 80% for fee collection

### 4. Post-Deployment Configuration
- [ ] Enable trading on the RedDragon token
- [ ] Set the exchange pair for the RedDragon token
- [ ] Connect lottery to the token contract
- [ ] Transfer ownership to MultiSig wallet or Timelock contract
- [ ] Ensure MultiSig wallet has appropriate owners and threshold set

### 5. Contract Verification
- [ ] Verify all contracts on SonicScan using `verify-contracts.js`:
  ```bash
  npx hardhat run scripts/deployment/verify-contracts.js --network sonic
  ```

## Final Checks

- [ ] Validate all critical contract functions
- [ ] Test token transfers, trading, and fee distribution
- [ ] Test lottery entry and distribution functions
- [ ] Verify balancer pool creation and liquidity
- [ ] Confirm security controls are properly in place
- [ ] Backup all deployment addresses and contract details
- [ ] Test the new pity timer feature:
  - [ ] Verify probability increases after losses
  - [ ] Confirm multiplier caps at 5x
  - [ ] Verify pity timer resets after wins

## Post-Launch Tasks

- [ ] Monitor initial trading and fee distribution
- [ ] Verify fee collection is working properly
- [ ] Ensure VRF integration is functioning correctly
- [ ] Check that Balancer integration is operational
- [ ] Document any issues found during initial operation
- [ ] Monitor pity timer functionality in production
- [ ] Create user documentation explaining the pity timer mechanic

## New Feature: Pity Timer Details

The pity timer feature adds these enhancements to the lottery system:

1. **Increasing Win Chance**: Player probability increases by 10% after each loss
2. **Maximum Boost**: Probability can increase up to 500% (5x multiplier cap)
3. **Reset Mechanism**: Pity timer resets to zero when a user wins
4. **Transparency**: Events emitted for pity timer increases and resets
5. **Admin Controls**: Functions to manage pity timers if needed
6. **User Visibility**: Users can check their current probability with the new view functions

This feature creates a more engaging experience by rewarding persistent players and increasing the chance of winning over time, while maintaining the overall tokenomics of the system. 