# Dragon Infographics Content

## 1. Fee Distribution (10% Total)

```
┌─────────────────────────────────────────────────┐
│                                                 │
│             DRAGON FEE DISTRIBUTION             │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  ███████████████████████████████░░░░░░░░░░░     │
│  █████████████████████████████░░░░░░░░░░░░      │
│  ███████████████████████████░░░░░░░░░░░░░       │
│  █████████████████████████░░░░░░░░░░░░░░        │
│                                                 │
│  ┌───────────┐    ┌──────────┐    ┌─────────┐   │
│  │   6.9%    │    │   2.41%  │    │  0.69%  │   │
│  │  JACKPOT  │    │   ve69LP │    │   BURN  │   │
│  └───────────┘    └──────────┘    └─────────┘   │
│                                                 │
│  Every DRAGON transaction includes a 10% fee    │
│  that powers the ecosystem                      │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Key Points:
- Total fee is fixed at exactly 10% per transaction
- 6.9% goes to the Jackpot Vault, funding lottery rewards
- 2.41% is distributed to ve69LP holders (locked LP providers)
- 0.69% is permanently burned, reducing total supply
- Fees are hardcoded in the contract and cannot be changed

## 2. 69/31 Balancer Pool Design

```
┌─────────────────────────────────────────────────┐
│                                                 │
│             DRAGON/wSOHIC POOL                  │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│               ┌─────────┐                       │
│               │         │                       │
│               │         │                       │
│  ┌────────────┤  69%    │                       │
│  │            │ DRAGON  │                       │
│  │   31%      │         │                       │
│  │  wSONIC    │         │                       │
│  │            │         │                       │
│  └────────────┴─────────┘                       │
│                                                 │
│  Balancer V3 Weighted Pool Configuration        │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Key Points:
- Balancer V3 weighted pool with fixed 69/31 ratio
- Initial liquidity: 6,942,000 DRAGON and 1,000 wSonic
- Optimized for lower slippage on DRAGON trades
- Provides BPT (Balancer Pool Tokens) to liquidity providers
- BPT tokens can be locked in ve69LP for fee rewards

## 3. Lottery Mechanism

```
┌─────────────────────────────────────────────────┐
│                                                 │
│             DRAGON LOTTERY SYSTEM               │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────┐     ┌───────────┐    ┌─────────┐  │
│  │ BUY      │ ──▶ │ VRF       │ ──▶│ WIN?    │  │
│  │ DRAGON   │     │ RANDOMNESS│    │         │  │
│  └──────────┘     └───────────┘    └────┬────┘  │
│                                         │       │
│                                         ▼       │
│                                  ┌─────────────┐│
│                                  │             ││
│                                  │  JACKPOT!   ││
│                                  │             ││
│                                  └─────────────┘│
│                                                 │
│  PaintSwap VRF ensures fair, verifiable draws   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Key Points:
- Lottery entries generated when buying DRAGON with wSonic
- PaintSwap VRF used for verifiable, tamper-proof randomness
- Base win chance: 0.04% (can be boosted)
- Winners receive 69% of jackpot balance
- Remaining 31% rolls over to the next jackpot

## 4. ve69LP Voting Power Mechanism

```
┌─────────────────────────────────────────────────┐
│                                                 │
│             ve69LP VOTING POWER                 │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  ▲                                              │
│  │                 ____                         │
│  │                /                             │
│  │               /                              │
│  │              /                               │
│  │  VOTING     /                                │
│  │  POWER     /                                 │
│  │           /                                  │
│  │          /                                   │
│  │     ____/                                    │
│  │                                              │
│  └─────────────────────────────────────────────▶│
│                   LOCK TIME                     │
│                                                 │
│  Cubic root scaling ensures fair distribution   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Key Points:
- LP providers can lock BPT tokens for 1 week to 4 years
- Voting power = amount * (lock time / max time)^(1/3)
- Cubic root function balances large and small holders
- Higher voting power = higher lottery boost
- Share of 2.41% fee distributed based on voting power

## 5. Full Ecosystem Overview

```
┌─────────────────────────────────────────────────┐
│                                                 │
│            DRAGON ECOSYSTEM OVERVIEW            │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│      ┌──────────┐         ┌────────────┐        │
│      │ DRAGON   │◀────────│ USERS BUY │        │
│      │ TOKEN    │         │ wS → DRAGON│        │
│      └────┬─────┘         └────────────┘        │
│           │                                     │
│           │ 10% FEE                             │
│           ▼                                     │
│  ┌────────┬─────────┬────────┐                  │
│  │        │         │        │                  │
│  ▼        ▼         ▼        ▼                  │
│┌─────┐ ┌──────┐ ┌──────┐ ┌──────┐               │
││BURN │ │JACKPOT│ │ve69LP│ │LOTTERY              │
││0.69%│ │ 6.9%  │ │2.41% │ │ENTRY │               │
│└─────┘ └───┬───┘ └──┬───┘ └──┬───┘               │
│            │        │        │                   │
│            └────────┴────────┘                   │
│                     │                            │
│                     ▼                            │
│             ┌──────────────┐                     │
│             │ SUSTAINABLE  │                     │
│             │ ECOSYSTEM    │                     │
│             └──────────────┘                     │
└─────────────────────────────────────────────────┘
```

### Key Points:
- Complete ecosystem with built-in incentives
- Every transaction strengthens all system components
- Self-sustaining model through fee distribution
- Deflationary supply through continuous burns
- Fair randomness through PaintSwap VRF integration 