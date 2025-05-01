# Dragon Lottery System Documentation

## Overview

The Dragon protocol features an innovative lottery mechanism that rewards users who swap Wrapped Sonic (wS) for DRAGON tokens. This document provides a comprehensive overview of the lottery system, including probability calculation, fee implementation, and the complete flow from user swap to potential jackpot payout.

## Table of Contents

1. [Core Mechanics](#core-mechanics)
2. [Probability Calculation](#probability-calculation)
3. [Fee Structure](#fee-structure)
4. [Randomness Generation](#randomness-generation)
5. [Complete Transaction Flow](#complete-transaction-flow)
6. [Technical Implementation](#technical-implementation)
7. [Security Considerations](#security-considerations)
8. [Jackpot Management](#jackpot-management)

## Core Mechanics

### Entry Mechanism

Users enter the lottery automatically when they swap Wrapped Sonic (wS) for DRAGON tokens. Key aspects:

- **Qualifying Amount**: Swaps must exceed a minimum threshold (`minSwapAmount`)
- **Automatic Entry**: No separate lottery purchase required - entry is integrated into swapping
- **Eligible Swappers**: Only direct users (`tx.origin`) can win, not contract addresses or aggregators
- **Trigger Method**: Only triggered when swapping wS → DRAGON, not DRAGON → wS

### Winning Mechanism

- **Winning Event**: If randomness determines a win, user receives 69% of the jackpot
- **Notification**: Winner is notified via event emission and jackpot transfer
- **Reset**: After win, jackpot retains 31% to seed the next round of accumulation
- **Claim Process**: Automatically sent to winner's wallet - no manual claim required

## Probability Calculation

The winning probability uses a system with two primary components:

### 1. USD-Based Linear Probability

- **Minimum Amount**: $1 swap = 0.0004% chance (4 in 1,000,000)
- **Maximum Amount**: $10,000 swap = 4% chance (4 in 100)
- **Linear Scale**: Probability increases linearly between these points
- **Formula**: 
  ```
  baseProbability = MIN_PROB + ((usdAmount - MIN_USD) * (MAX_PROB - MIN_PROB) / (MAX_USD - MIN_USD))
  ```

### 2. ve69LP Voting Power Boost

- **Boost Mechanism**: Users holding ve69LP tokens receive a multiplier on their winning probability
- **Cube Root Scaling**: Uses cube root function for diminishing returns
- **Maximum Boost**: 2.5x (250%) at maximum voting power
- **Formula**:
  ```
  boost = 1 + min(MAX_BOOST - 1, cubeRoot(votingPower / maxVotingPower) * (MAX_BOOST - 1))
  ```

### 3. Combined Probability

- **Final Formula**: `winProbability = baseProbability * boost`
- **Maximum Possible Probability**: 10% (with $10,000 swap and maximum ve69LP boost)
- **Example**: $5,000 swap with 25% of max VP = ~4.8% chance to win

### 4. Implemented in Smart Contract

```solidity
function calculateWinProbability(uint256 _usdAmount, uint256 _votingPower) external view returns (uint256) {
    uint256 baseProbability = calculateBaseProbability(_usdAmount);
    uint256 boost = calculateBoost(_votingPower);
    
    // Apply boost to base probability
    return (baseProbability * boost) / BPS_SCALE;
}
```

## Fee Structure

### Overview

- **Total Buy/Sell Fee**: 10% of transaction amount
- **Universal Burn**: 0.69% of ALL transfers (including buys, sells, and regular transfers)

### Fee Distribution

1. **Buy Fees (10% total)**:
   - 6.9% goes to jackpot
   - 2.41% goes to ve69LPfeedistributor
   - 0.69% is burned

2. **Sell Fees (10% total)**:
   - 6.9% goes to jackpot
   - 2.41% goes to ve69LPfeedistributor
   - 0.69% is burned

### Important: Fee Application Timing

Fees are applied **after** the lottery probability calculation. This ensures:

1. The lottery uses the full pre-fee swap amount for probability calculation
2. Users' chances of winning are based on their total contribution
3. Tokenomics fees are still enforced for all transactions

## Randomness Generation

The lottery uses a cross-chain Verifiable Random Function (VRF) to ensure provably fair randomness.

### VRF Implementation

1. **Cross-Chain Architecture**:
   - Sonic Chain: User-facing, where swaps occur
   - Arbitrum: Securely generates randomness via Chainlink VRF

2. **Randomness Request Flow**:
   - Request sent from Sonic to Arbitrum via LayerZero
   - Chainlink VRF generates randomness on Arbitrum
   - Randomness returned to Sonic via LayerZero

3. **Verification Method**:
   - Randomness is scaled to match probability scale (0-1,000,000)
   - If scaled randomness < calculated probability, user wins
   - Example: 4% chance = 40,000/1,000,000; user wins if random < 40,000

## Complete Transaction Flow

### User Swap & Lottery Entry

1. **User Action**: User swaps wS for DRAGON
2. **Swap Detection**: `DragonSwapTrigger.onSwapNativeTokenToDragon()` is called by DEX
3. **Minimum Check**: System verifies swap exceeds `minSwapAmount`
4. **USD Conversion**: wS amount converted to USD for probability calculation
5. **Probability Calculation**:
   - System gets user's ve69LP voting power
   - Calculates base probability from USD amount
   - Applies ve69LP boost using cube root scaling
   - Determines final win probability
6. **VRF Request**: System requests randomness from VRF service
7. **Fee Application**: 10% fees applied when DRAGON tokens are transferred to user

### VRF Processing & Winner Determination

1. **Cross-Chain Request**: Request travels from Sonic to Arbitrum via LayerZero
2. **VRF Generation**: Chainlink VRF generates randomness on Arbitrum
3. **Cross-Chain Return**: Randomness returns to Sonic via LayerZero
4. **Winner Check**:
   - System checks if `scaledRandomness < winProbability`
   - If true, user wins 69% of jackpot
   - If false, no winner for this swap
5. **Jackpot Distribution**:
   - If winner, 69% of jackpot transferred to user
   - 31% remains in jackpot to seed next round
   - Events emitted for UI notification

## Technical Implementation

### Key Contracts

1. **DragonSwapTrigger**: Detects swaps and initiates lottery
2. **DragonProbabilityHelper**: Calculates win probability
3. **SonicVRFConsumer**: Manages VRF requests on Sonic chain
4. **ArbitrumVRFRequester**: Interfaces with Chainlink VRF
5. **Dragon**: ERC20 token with fee implementation

### Probability Implementation

```solidity
// In DragonProbabilityHelper.sol

// Calculate base probability based on USD amount
function calculateBaseProbability(uint256 _usdAmount) public pure returns (uint256) {
    // Clamp USD amount to min/max
    uint256 usdAmount = _usdAmount;
    if (usdAmount < MIN_USD_AMOUNT) {
        usdAmount = MIN_USD_AMOUNT;
    } else if (usdAmount > MAX_USD_AMOUNT) {
        usdAmount = MAX_USD_AMOUNT;
    }
    
    // Linear interpolation between min and max probability
    uint256 usdRange = MAX_USD_AMOUNT - MIN_USD_AMOUNT;
    uint256 probRange = MAX_PROBABILITY - MIN_PROBABILITY;
    
    uint256 usdDelta = usdAmount - MIN_USD_AMOUNT;
    uint256 probability = MIN_PROBABILITY + (usdDelta * probRange / usdRange);
    
    return probability;
}

// Calculate voting power boost using cube root scaling
function calculateBoost(uint256 _votingPower) public view returns (uint256) {
    // No voting power = no boost
    if (_votingPower == 0 || maxVotingPower == 0) {
        return BPS_SCALE; // 1.0x boost (10000 basis points)
    }
    
    // Calculate normalized voting power (with capped maximum)
    uint256 normalizedVP = _votingPower > maxVotingPower
        ? CUBE_ROOT_PRECISION
        : (_votingPower * CUBE_ROOT_PRECISION) / maxVotingPower;
    
    // Calculate cube root
    uint256 cubeRoot = computeCubeRoot(normalizedVP);
    
    // Scale to boost factor (1.0x + boost factor * max boost)
    uint256 boostFactor = cubeRoot * (MAX_BOOST_BPS - BPS_SCALE) / CUBE_ROOT_PRECISION;
    uint256 boost = BPS_SCALE + boostFactor;
    
    return boost;
}
```

### Fee Implementation

```solidity
// In Dragon.sol

function _transfer(address sender, address recipient, uint256 amount) internal override {
    // Check if tax exempt addresses
    bool isTaxExempt = _isExempt(sender) || _isExempt(recipient);
    
    if (isTaxExempt) {
        super._transfer(sender, recipient, amount);
        return;
    }
    
    // Calculate burn fee (applies to all transfers)
    uint256 burnAmount = amount * 69 / 10000; // 0.69% burn fee
    uint256 transferAmount = amount - burnAmount;
    
    // Process buy/sell fees if applicable
    if (_isBuy(sender) || _isSell(recipient)) {
        uint256 jackpotFee = amount * 690 / 10000; // 6.9% to jackpot
        uint256 feeDistributorAmount = amount * 241 / 10000; // 2.41% to fee distributor
        
        transferAmount = amount - (burnAmount + jackpotFee + feeDistributorAmount);
        
        // Transfer fee amounts
        super._transfer(sender, jackpotAddress, jackpotFee);
        super._transfer(sender, feeDistributorAddress, feeDistributorAmount);
    }
    
    // Burn tokens
    _burn(sender, burnAmount);
    
    // Transfer remaining amount
    super._transfer(sender, recipient, transferAmount);
    
    emit TokensTransferred(sender, recipient, transferAmount, burnAmount);
}
```

## Security Considerations

### Randomness Protection

- **Source Verification**: Ensures randomness comes only from authorized sources
- **Cross-Chain Security**: LayerZero provides secure message passing between chains
- **VRF Benefits**: Chainlink VRF provides cryptographically verifiable randomness

### Sybil Attack Prevention

- **Minimum Swap**: `minSwapAmount` prevents users from making many tiny swaps
- **Gas Costs**: Natural disincentive against excessive entry attempts
- **tx.origin Check**: Prevents contracts from entering on behalf of users

### MEV Protection

- **Winner Determination**: Happens off-chain via VRF
- **Random Return**: Unpredictable when randomness will be returned
- **Miner/Validator Resistance**: Cannot influence or predict VRF outcome

## Jackpot Management

### Jackpot Growth

- **Source**: 6.9% of all buy and sell fees go to jackpot
- **Compounding**: Higher volume generates larger jackpots
- **External Funding**: System supports adding funds directly to jackpot

### Jackpot Distribution

- **Partial Payout**: Winner receives 69% of jackpot balance
- **Sustainable Growth**: 31% of jackpot remains to seed the next round
- **No House Edge**: All jackpot funds eventually go to winners, no protocol take

### Optimization

- **Expected Frequency**: With average parameters, payouts occur approximately once every 300 swaps
- **Incentive Loop**: Larger jackpots incentivize more swaps, creating a positive feedback loop
- **ve69LP Value**: Higher probability with ve69LP encourages long-term token locking 