# Dragon Ecosystem - System Diagrams

## Token Flow Diagram

```
                                    +-------------------+
                                    |                   |
                                    |  $DRAGON Token    |
                                    |                   |
                                    +-------------------+
                                             |
                                             | 10% Fee on Transactions
                                             |
                                             v
                     +----------------------------------------------------+
                     |                                                    |
        +------------+-------------+               +---------------------+
        |                          |               |                     |
        | 6.9% to Jackpot          |               | 2.41% to ve69LP     |    0.69% Burned
        |                          |               |                     |     
        +--------------------------+               +---------------------+
                     |                                        |
                     v                                        v
        +------------------------+                +-----------------------+
        |                        |                |                       |
        | DragonLotterySwap      |                | ve69LPFeeDistributor  |
        | (Jackpot Pool)         |                | (Fee Redistribution)  |
        |                        |                |                       |
        +------------------------+                +-----------------------+
                     |                                        |
                     v                                        v
        +------------------------+                +-----------------------+
        |                        |                |                       |
        | Lottery Winners        |                | ve69LP Holders        |
        | (Random Selection)     |                | (Proportional Share)  |
        |                        |                |                       |
        +------------------------+                +-----------------------+
```

## Contract Interaction Diagram

```
                          +-----------------+
                          |                 |
                          |  User Actions   |
                          |                 |
                          +-----------------+
                                  |
                    +-------------+-------------+
                    |             |             |
        +-----------v----+ +------v-------+ +---v--------------+
        |              | |              | |                   |
        | Swap wS → DRAGON | | Lock DRAGON    | | Add Liquidity     |
        |              | |              | |                   |
        +-----------+----+ +------+-------+ +---+--------------+
                    |             |             |
                    v             v             v
        +--------------------+ +---------------+ +------------------+
        |                    | |               | |                  |
        | DragonLotterySwap  | | ve69LP        | | DragonLPBooster  |
        |                    | |               | |                  |
        +--------+-----------+ +-------+-------+ +--------+---------+
                 |                     |                  |
                 |                     v                  |
                 |           +-----------------+          |
                 |           |                 |          |
                 +---------->+ Win Chance Calc +<---------+
                             |                 |
                             +-----------------+
                                     |
                                     v
                             +-----------------+
                             |                 |
                             | Lottery Result  |
                             |                 |
                             +-----------------+
                                     |
                                     v
                    +----------------+----------------+
                    |                |                |
        +-----------v-----+  +-------v--------+  +---v--------------+
        |                 |  |                |  |                  |
        | No Win (Nothing)|  | Standard Win   |  | Boosted Win      |
        |                 |  |                |  | (Scratcher/Promo) |
        +-----------------+  +----------------+  +------------------+
```

## Promotional Items Flow

```
                +--------------------+
                |                    |
                | PromotionalItems   |
                |                    |
                +---------+----------+
                          |
            +-------------+-------------+
            |             |             |
  +---------v------+ +----v--------+ +--v--------------+
  |                | |             | |                 |
  | GoldScratcher  | | RedEnvelope | | Future Items    |
  |                | |             | |                 |
  +--------+-------+ +-----+-------+ +-----------------+
           |               |
           v               v
  +------------------+ +-------------------+
  |                  | |                   |
  | Jackpot Boost    | | Special Rewards   |
  | (% Increase)     | | (One-time Items)  |
  |                  | |                   |
  +------------------+ +-------------------+
```

## Randomness Implementation

```
                +---------------------------+
                |                           |
                | User Swaps wS for DRAGON  |
                |                           |
                +--------------+------------+
                               |
                               v
                +---------------------------+
                | DragonLotterySwap         |
                | getRandomNumber()         |
                +--------------+------------+
                               |
              +-----------------+------------------+
              |                                    |
     +--------v----------+              +----------v---------+
     |                   |              |                    |
     | Chainlink VRF     |              | Fallback Available?|
     | Available?        |              |                    |
     |                   |              +----------+---------+
     +--------+----------+                         |
              |                         +-------------------+
              |                         |                   |
     +--------v----------+     +--------v---------+  +-----v-------------+
     |                   |     |                  |  |                   |
     | Use VRF           |     | Use Fallback     |  | Delay Entry       |
     | randomNumber      |     | (EOA only)       |  | (Retry Later)     |
     |                   |     |                  |  |                   |
     +--------+----------+     +--------+---------+  +-------------------+
              |                         |
              |                         |
              v                         v
     +-------------------+    +--------------------+
     |                   |    |                    |
     | Determine Winner  |<---+ Determine Winner   |
     |                   |    |                    |
     +-------------------+    +--------------------+
```

## Voting Power & Multiplier Calculation

```
           +-------------------------+
           |                         |
           | User Locks DRAGON       |
           |                         |
           +-----------+-------------+
                       |
                       v
           +-------------------------+
           |                         |
           | ve69LP Minted           |
           | (Based on lock period)  |
           |                         |
           +-----------+-------------+
                       |
                       v
           +-------------------------+
           |                         |
           | Update Voting Power in  |
           | DragonLotterySwap       |
           |                         |
           +-----------+-------------+
                       |
                       v
   +---------------------------------------------------+
   |                                                   |
   | Win Chance Calculation                            |
   | with Non-Linear (Cube Root) Scaling               |
   |                                                   |
   | - Base chance: 0.04% (4/10000)                    |
   | - VP multiplier: 1x -> 2.5x (cube root scaling)   |
   | - LP boost: Additional multiplier from LP tokens  |
   | - Promotional boost: Additional from promo items  |
   | - Maximum win chance cap: 10% (1000/10000)        |
   |                                                   |
   +---------------------------------------------------+
``` 