# Phased Rollout Guide for DragonShadow Features

This guide outlines the process for a gradual rollout of the ve69LP ecosystem features, including the Beets LP integration and ve69LPPoolVoting features.

## Overview

Our system combines several powerful components that should be rolled out in phases to ensure stability and proper adoption:
1. Beets LP (69/31 DRAGON/wS) with locking capabilities 
2. ve69LPPoolVoting for partner probability boosts
3. Partner integration with partner-specific boosts

The rollout approach uses feature flags to enable granular control over when specific features become available, allowing for thorough testing in production with minimal risk.

## Components

1. **Beets LP Integration**: 69/31 DRAGON/wS LP token with locking mechanics
2. **ve69LP Locking System**: Allows users to lock LP tokens for voting power
3. **Ive69LPPoolVoting Interface**: The interface for the pool voting contract
4. **Partner Boost Application**: Applies the boosts to partners during swaps

## Deployment Phases

### Phase 1: Beets LP 69/31 with Locking Capabilities (Week 1-2)

1. Deploy the Beets LP pool with 69/31 DRAGON/wS ratio
2. Deploy the `ve69LP` contract for locking LP tokens
3. Implement the basic locking mechanics and voting power calculations
4. Deploy the `DragonShadowV3Swapper` contract with feature flags set to `false`
5. Set up the initial fee distribution parameters

**Testing:**
- Verify LP creation and addition of liquidity works properly
- Test locking LP tokens for different time periods
- Confirm voting power calculations are accurate
- Ensure fee distributions work correctly

### Phase 2: Deploy Pool Voting Infrastructure (Week 3-4)

1. Deploy the `ve69LPPoolVoting` contract to the production environment
2. Connect the contracts by calling `setPoolVoting()` on the swapper
3. Enable the pool voting system by calling `setPoolVotingEnabled(true)`
4. Keep partner boosts disabled by leaving `partnerBoostEnabled` as `false`
5. Verify that all existing functionality continues to work without the new features
6. Set a conservative `maxBoostBasisPoints` value (e.g., 100 = 1%)

**Testing:**
- Test voting functionality with a small group of users
- Confirm voting contract is calculating boosts correctly
- Verify the swapper contract can successfully query boost values
- Ensure that existing systems remain unaffected

### Phase 3: Limited Partner Boost Activation (Week 5-6)

1. Select 2-3 trusted partners for initial partner boost testing
2. Authorize these partners using `setPartnerAuthorization()`
3. Enable partner boosts by calling `setPartnerBoostEnabled(true)`
4. Set a low `maxBoostBasisPoints` value (e.g., 200 = 2%)
5. Monitor partner transactions and boost application

**Testing:**
- Verify partner boosts are applied correctly to swaps
- Check that boost caps are working as expected
- Confirm boost calculations in the estimation functions

### Phase 4: Full Rollout and Partner Expansion (Week 7+)

1. Gradually increase the `maxBoostBasisPoints` value (up to 690 = 6.9%)
2. Add more authorized partners to the system
3. Implement the partner registry for more automated authorization
4. Monitor system performance with full boosts enabled
5. Optimize gas usage and user experience

**Testing:**
- Conduct load testing with multiple partners
- Verify gas usage remains within acceptable limits
- Check for any unexpected interactions with other contract features
- Monitor LP lock/unlock and voting behavior

## Monitoring and Metrics

During the rollout, monitor the following metrics:

1. Beets LP token creation and locking activity
2. Lock duration distribution (how long users choose to lock)
3. Number of users participating in voting
4. Distribution of votes across partners
5. Average and maximum partner boosts
6. Partner transaction volume
7. User engagement with partner platforms
8. Gas costs for transactions with boosts

## Rollback Plan

If issues arise during any phase of the rollout:

1. Immediately disable the problematic feature by setting the corresponding feature flag to `false`
2. Analyze logs and transaction data to identify the root cause
3. Deploy a fix to the test environment and verify
4. Re-deploy to production once validated
5. Gradually re-enable features according to the phased approach

## Contract Control Functions

The following admin functions control the feature flags:

```solidity
// Enable or disable pool voting
function setPoolVotingEnabled(bool _enabled) external onlyOwner

// Enable or disable partner boost application
function setPartnerBoostEnabled(bool _enabled) external onlyOwner

// Set the maximum allowed boost percentage
function setMaxBoost(uint256 _maxBoost) external onlyOwner

// Set the pool voting contract address
function setPoolVoting(address _poolVoting) external onlyOwner
```

## Conclusion

This phased approach minimizes risk while allowing for a controlled rollout of the ve69LP ecosystem features. By focusing first on the foundational 69/31 Beets LP and locking capabilities, we ensure the core infrastructure is stable before enabling the more complex voting and partner boost mechanics. 