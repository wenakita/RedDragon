# 🔥 DRAGON Lottery System

A provably fair, cross-chain lottery system for the DRAGON protocol. Users who swap Wrapped Sonic (wS) for DRAGON tokens are automatically entered into a jackpot lottery with a chance to win based on their swap amount and ve69LP holdings.

## 📚 Documentation

The DRAGON lottery system utilizes several key components:

- **Provably Fair Randomness**: Cross-chain VRF implementation using Chainlink via LayerZero
- **Dynamic Probability**: User's chance scales with swap size and ve69LP holdings
- **Self-Funding Jackpot**: 6.9% of all DRAGON buy/sell fees go to the jackpot
- **Sustainable Distribution**: 69% goes to winners, 31% seeds the next jackpot

## 🧮 Probability Calculation

The lottery uses a dual-component probability system:

1. **USD-Based Linear Probability**:
   - $1 swap = 0.0004% chance (4 in 1,000,000)
   - $10,000 swap = 4% chance (4 in 100)
   - Linear scaling between these points

2. **ve69LP Voting Power Boost**:
   - Up to 2.5x multiplier based on ve69LP voting power
   - Cube root scaling for fair distribution and diminishing returns

## 💲 Jackpot Size

The DRAGON lottery jackpot typically averages:
- ~$18,000-$25,000 total jackpot
- ~$12,500-$17,250 payout to winners (69%)
- 31% retention to seed the next jackpot

## 🔒 Security Features

The lottery implementation includes several critical security features:

- **Source Verification**: Only accepts randomness from authorized sources
- **Cross-Chain Security**: LayerZero provides secure message passing
- **tx.origin Check**: Prevents contracts from entering on behalf of users
- **Sybil Attack Prevention**: Minimum swap threshold and natural gas disincentives

## 📂 Repository Structure

- **contracts/**: Smart contract implementations
  - **vrf/**: VRF implementation contracts
  - **lottery/**: Lottery-specific contracts
  - **interfaces/**: Contract interfaces
- **docs/**: Comprehensive documentation
  - **lottery/**: Lottery system documentation
- **test/**: Test suite for lottery and VRF functionality

## 👨‍💻 Core Contracts

1. **DragonSwapTriggerV2.sol**: Main lottery contract that detects swaps and processes randomness
2. **SonicVRFConsumer.sol**: Handles VRF requests on Sonic chain
3. **ArbitrumVRFRequester.sol**: Interfaces with Chainlink VRF on Arbitrum
4. **DragonJackpotVault.sol**: Manages jackpot accumulation from fees

## 🖼️ Architecture Diagram

```
┌─────────────────┐      ┌───────────────┐      ┌──────────────────┐
│                 │      │               │      │                  │
│  Sonic Chain    │ ──── │ LayerZero     │ ──── │ Arbitrum Chain   │
│  (Lottery)      │      │ (Bridge)      │      │ (VRF Source)     │
│                 │      │               │      │                  │
└─────────────────┘      └───────────────┘      └──────────────────┘
```

## 📈 Links

- [Website](https://sonicreddragon.io)
- [Telegram](https://t.me/sonicreddragon)
- [Twitter](https://x.com/sonicreddragon)

## 📜 License

MIT 