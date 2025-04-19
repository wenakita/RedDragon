# Phased Rollout Guide for ve69LPPoolVoting Features

This guide outlines the process for a gradual rollout of the ve69LPPoolVoting integration with DragonShadowV3Swapper.

## Overview

The ve69LPPoolVoting contract allows ve69LP holders to vote on partner pools to receive probability boosts in the lottery. This feature enhances the tokenomics by providing additional incentives for partners to integrate with our system.

The rollout approach uses feature flags to enable granular control over when specific features become available, allowing for thorough testing in production with minimal risk.

## Components

1. **Ive69LPPoolVoting Interface**: The interface for the pool voting contract
2. **Pool Voting Integration**: Allows the swapper to query the voting contract for partner boosts
3. **Partner Boost Application**: Applies the boosts to partners during swaps

## Deployment Phases

### Phase 1: Deployment with Disabled Features (Week 1)

1. Deploy the updated `DragonShadowV3Swapper` contract with feature flags set to `false`
2. Deploy the `ve69LPPoolVoting` contract to the production environment
3. Connect the contracts by calling `setPoolVoting()` on the swapper
4. Verify that all existing functionality continues to work without the new features
5. Set a conservative `maxBoostBasisPoints` value (e.g., 100 = 1%)

**Testing:**
- Verify regular swaps work without interruption
- Confirm partner swaps work with standard boost calculations

### Phase 2: Voting Mechanism Activation (Week 2-3)

1. Enable the pool voting system by calling `setPoolVotingEnabled(true)`
2. Keep partner boosts disabled by leaving `partnerBoostEnabled` as `false`
3. This allows ve69LP holders to start voting and building up partner boosts
4. Monitor the voting patterns and boost accumulation

**Testing:**
- Test voting functionality with a small group of users
- Confirm voting contract is calculating boosts correctly
- Verify the swapper contract can successfully query boost values

### Phase 3: Limited Partner Boost Activation (Week 4-5)

1. Select 2-3 trusted partners for initial partner boost testing
2. Authorize these partners using `setPartnerAuthorization()`
3. Enable partner boosts by calling `setPartnerBoostEnabled(true)`
4. Set a low `maxBoostBasisPoints` value (e.g., 200 = 2%)
5. Monitor partner transactions and boost application

**Testing:**
- Verify partner boosts are applied correctly to swaps
- Check that boost caps are working as expected
- Confirm boost calculations in the estimation functions

### Phase 4: Full Rollout (Week 6+)

1. Gradually increase the `maxBoostBasisPoints` value (up to 690 = 6.9%)
2. Add more authorized partners to the system
3. Consider implementing a partner registry for more automated authorization
4. Monitor system performance with full boosts enabled

**Testing:**
- Conduct load testing with multiple partners
- Verify gas usage remains within acceptable limits
- Check for any unexpected interactions with other contract features

## Monitoring and Metrics

During the rollout, monitor the following metrics:

1. Number of users participating in voting
2. Distribution of votes across partners
3. Average and maximum partner boosts
4. Partner transaction volume
5. User engagement with partner platforms
6. Gas costs for transactions with boosts

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

This phased approach minimizes risk while allowing for a controlled rollout of the ve69LPPoolVoting features. By using feature flags, we can quickly respond to any issues that arise and fine-tune the system based on real-world usage patterns. 