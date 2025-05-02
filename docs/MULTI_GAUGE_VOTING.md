# Multi-Gauge Voting System

This document describes the implementation of the multi-gauge voting system in the Dragon ecosystem, inspired by vlCVX (Voting-Locked Convex Token).

## Overview

The multi-gauge voting system allows ve69LP token holders to distribute their voting power across multiple partner gauges with customizable weights. This enhances the flexibility of the protocol's governance and provides a more nuanced way for users to express their preferences.

## Key Features

- **Vote Distribution**: Distribute voting power across multiple gauges with percentage weights
- **Weight Normalization**: Automatic normalization of weights to ensure they sum to 100%
- **Configurable Limits**: Adjustable maximum number of gauges a user can vote for
- **Backward Compatibility**: Maintains support for legacy single-gauge voting
- **Transparent Weight Display**: Easy access to a user's current vote distribution

## Implementation Details

### State Variables

- `userGaugeVotes`: Tracks user's voting weights per partner gauge
- `userVoteCount`: Tracks how many gauges a user is voting for
- `maxVotesPerUser`: Limits the number of gauges a user can distribute votes to

### Core Functions

#### Multi-Gauge Voting

```solidity
function voteMultiple(uint256[] calldata _partnerIds, uint256[] calldata _weights) external
```

This function allows users to:
- Vote for multiple gauges in a single transaction
- Specify percentage weights for each gauge (automatically normalized to 10000 basis points)
- Replace all existing votes with a new distribution

#### Single-Gauge Voting (Backward Compatibility)

```solidity
function vote(uint256 _partnerId) external
```

A simplified interface that forwards to `voteMultiple` with 100% weight on a single gauge.

#### Reset Votes

```solidity
function resetVotes() external
```

Allows users to clear all their votes without needing to vote for a new gauge.

#### View Functions

```solidity
function getUserVotes(address _user) external view returns (uint256[] memory _partnerIds, uint256[] memory _weights)
```

Returns the complete voting distribution for a user, showing which gauges they've voted for and at what weights.

### Weight Normalization

Weights are normalized to ensure they sum to 10000 (100%):

1. If the sum of weights exactly equals 10000, they are used as provided
2. Otherwise, each weight is recalculated as: `weight * 10000 / totalWeight`

This is handled by the `DragonMathLib.normalizeWeights()` function to ensure consistent calculation.

## How it Works

### Voting Process

1. User calls `voteMultiple()` with arrays of partner IDs and weights
2. The contract validates the inputs and normalizes weights to 10000 (100%)
3. Previous votes are cleared
4. New votes are recorded with the specified distribution
5. Partner votes are updated based on the weighted distribution of the user's voting power

### Boost Calculation

When calculating boosts, the contract:
1. Considers all votes across all gauges
2. Allocates the total boost (690 basis points = 6.9%) proportionally to each gauge
3. Partners with more votes receive higher probability boosts

## Comparison with vlCVX

This implementation is inspired by the vlCVX (Voting-Locked Convex) system, with some adaptations:

| Feature | vlCVX | ve69LP Multi-Gauge |
|---------|-------|-------------------|
| Vote Distribution | Across any number of gauges | Limited by `maxVotesPerUser` |
| Weight Format | Percentage basis points (10000 = 100%) | Same (10000 = 100%) |
| Vote Changes | Any time with 10-day delay | Any time with no delay |
| Vote Delegation | Supported | Not implemented |
| Vote Snapshots | Weekly epochs | Periods based on `votingPeriodLength` |

## Usage Examples

### Distributing Votes Equally

```solidity
// Vote equally for 3 partners
uint256[] memory partnerIds = [1, 3, 5];
uint256[] memory weights = [3333, 3333, 3334]; // Will be normalized to 10000 total
ve69LPUtilities.voteMultiple(partnerIds, weights);
```

### Weighted Distribution

```solidity
// Vote with custom distribution
uint256[] memory partnerIds = [1, 2, 3, 4];
uint256[] memory weights = [5000, 2500, 1500, 1000]; // 50%, 25%, 15%, 10%
ve69LPUtilities.voteMultiple(partnerIds, weights);
```

### Single Vote (Legacy Style)

```solidity
// 100% vote for partner 2
ve69LPUtilities.vote(2);
```

## Benefits

1. **Greater Flexibility**: Users can support multiple partners simultaneously
2. **Reduced Gas Usage**: Setting all votes in a single transaction reduces gas costs
3. **More Expressive Governance**: Enables more nuanced expression of preferences
4. **Partner Diversification**: Encourages users to support multiple partners rather than concentrating on one

## Future Enhancements

Potential future enhancements to the system:
- Vote delegation capabilities
- Time-locked vote changes
- Quadratic voting weights
- Vote incentives for active participants 