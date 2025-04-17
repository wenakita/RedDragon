# Dragon Ecosystem Deployment Checklist - Part 2

## Smart Contract Configuration and Verification

### 2. Configure Contract Linkages

#### 2.1 Token Linkages

- [ ] Set Lottery Address in Dragon Token
  ```bash
  npx hardhat run scripts/set-lottery-address-in-dragon.js --network sonic
  ```
  - [ ] Verify transaction success
  - [ ] Confirm address is set correctly via getter function

- [ ] Set ve69LP Address in Dragon Token
  ```bash
  npx hardhat run scripts/set-ve69lp-address-in-dragon.js --network sonic
  ```
  - [ ] Verify transaction success
  - [ ] Test fee redirection to ve69LP

- [ ] Set Exchange Pair Address in Dragon Token
  ```bash
  npx hardhat run scripts/set-exchange-pair-address-in-dragon.js --network sonic
  ```
  - [ ] Verify transaction success
  - [ ] Test with small swap to ensure fees are applied

- [ ] Set Burn Address in Dragon Token
  ```bash
  npx hardhat run scripts/set-burn-address-in-dragon.js --network sonic
  ```
  - [ ] Verify transaction success
  - [ ] Ensure burn mechanism works with test transaction

- [ ] Set Jackpot Address in Dragon Token
  ```bash
  npx hardhat run scripts/set-jackpot-address-in-dragon.js --network sonic
  ```
  - [ ] Verify transaction success
  - [ ] Test fee accrual to jackpot

#### 2.2 Lottery System Linkages

- [ ] Set VRF verifier in DragonLotterySwap
  ```bash
  npx hardhat run scripts/set-vrf-verifier.js --network sonic
  ```
  - [ ] Verify transaction success
  - [ ] Test VRF request mechanism

- [ ] Set compensation system in DragonLotterySwap
  ```bash
  npx hardhat run scripts/set-compensation-system.js --network sonic
  ```
  - [ ] Verify transaction success
  - [ ] Test compensation issuance during VRF outage

- [ ] Set exchange pair in DragonLotterySwap
  ```bash
  npx hardhat run scripts/set-exchange-pair.js --network sonic
  ```
  - [ ] Verify transaction success
  - [ ] Test swap entry to lottery

- [ ] Set Registry Address in Lottery Contract
  ```bash
  npx hardhat run scripts/set-registry-address-in-lottery.js --network sonic
  ```
  - [ ] Verify transaction success
  - [ ] Test promotional item usage

- [ ] Set GoldScratcher Address in Lottery Contract
  ```bash
  npx hardhat run scripts/set-gold-scratcher-address-in-lottery.js --network sonic
  ```
  - [ ] Verify transaction success
  - [ ] Test scratcher integration

- [ ] Set Wrapped Sonic Address in Lottery Contract
  ```bash
  npx hardhat run scripts/set-wrapped-sonic-address-in-lottery.js --network sonic
  ```
  - [ ] Verify transaction success
  - [ ] Ensure WSONIC swaps work correctly

- [ ] Set ve69LP Address in Lottery Contract
  ```bash
  npx hardhat run scripts/set-ve69lp-address-in-lottery.js --network sonic
  ```
  - [ ] Verify transaction success
  - [ ] Test ve69LP integration

- [ ] Set LPBooster Address in Lottery Contract
  ```bash
  npx hardhat run scripts/set-lp-booster-address-in-lottery.js --network sonic
  ```
  - [ ] Verify transaction success
  - [ ] Test boost application

- [ ] Set Jackpot Address in Lottery Contract
  ```bash
  npx hardhat run scripts/set-jackpot-address-in-lottery.js --network sonic
  ```
  - [ ] Verify transaction success
  - [ ] Test jackpot integration

#### 2.3 Game and Utility Linkages

- [ ] Link Red Envelopes with DragonLotterySwap (if needed)
  ```bash
  npx hardhat run scripts/link-red-envelopes.js --network sonic
  ```
  - [ ] Verify transaction success
  - [ ] Test envelope creation and claiming

- [ ] Set Lottery Address in GoldScratcher Contract
  ```bash
  npx hardhat run scripts/set-lottery-address-in-gold-scratcher.js --network sonic
  ```
  - [ ] Verify transaction success
  - [ ] Test scratcher registration

- [ ] Set Lottery Address in RedEnvelope Contract
  ```bash
  npx hardhat run scripts/set-lottery-address-in-red-envelope.js --network sonic
  ```
  - [ ] Verify transaction success
  - [ ] Test envelope integration with lottery

- [ ] Set Registry Address in GoldScratcher Contract
  ```bash
  npx hardhat run scripts/set-registry-address-in-gold-scratcher.js --network sonic
  ```
  - [ ] Verify transaction success
  - [ ] Test registry integration

- [ ] Set Registry Address in RedEnvelope Contract
  ```bash
  npx hardhat run scripts/set-registry-address-in-red-envelope.js --network sonic
  ```
  - [ ] Verify transaction success
  - [ ] Test promotional item usage in envelopes

#### 2.4 ve69LP System Linkages

- [ ] Set ve69LP Address in ve69LPFeeDistributor Contract
  ```bash
  npx hardhat run scripts/set-ve69lp-address-in-ve69lp-fee-distributor.js --network sonic
  ```
  - [ ] Verify transaction success
  - [ ] Test fee distribution to ve69LP holders

- [ ] Set ve69LPFeeDistributor Address in ve69LP Contract
  ```bash
  npx hardhat run scripts/set-ve69lp-fee-distributor-address-in-ve69lp.js --network sonic
  ```
  - [ ] Verify transaction success
  - [ ] Test claiming mechanisms

### 3. Verify All Contracts on Block Explorer

- [ ] Verify Dragon Token
  ```bash
  npx hardhat verify --network sonic [DRAGON_ADDRESS]
  ```
  - [ ] Confirm source code is verified on block explorer
  - [ ] Check compiler version and optimization settings

- [ ] Verify VRFValidator
  ```bash
  npx hardhat verify --network sonic [VRF_VALIDATOR_ADDRESS] [COORDINATOR_ADDRESS]
  ```
  - [ ] Confirm source code is verified on block explorer
  - [ ] Verify constructor arguments

- [ ] Verify DelayedEntryCompensation
  ```bash
  npx hardhat verify --network sonic [COMPENSATION_ADDRESS]
  ```
  - [ ] Confirm source code is verified on block explorer
  - [ ] Check NFT configuration

- [ ] Verify RedEnvelopes
  ```bash
  npx hardhat verify --network sonic [RED_ENVELOPES_ADDRESS] [DRAGON_TOKEN_ADDRESS]
  ```
  - [ ] Confirm source code is verified on block explorer
  - [ ] Verify constructor arguments

- [ ] Verify DragonLotterySwap
  ```bash
  npx hardhat verify --network sonic [LOTTERY_SWAP_ADDRESS] [WSONIC_ADDRESS] [VRF_ADDRESS] [REGISTRY_ADDRESS] [GOLD_SCRATCHER_ADDRESS]
  ```
  - [ ] Confirm source code is verified on block explorer
  - [ ] Verify all constructor arguments

- [ ] Verify GoldScratcher
  ```bash
  npx hardhat verify --network sonic [GOLD_SCRATCHER_ADDRESS]
  ```
  - [ ] Confirm source code is verified on block explorer
  - [ ] Check NFT configuration

- [ ] Verify PromotionalItemRegistry
  ```bash
  npx hardhat verify --network sonic [PROMOTIONAL_ITEM_REGISTRY_ADDRESS]
  ```
  - [ ] Confirm source code is verified on block explorer
  - [ ] Check initial configuration

- [ ] Verify ve69LP
  ```bash
  npx hardhat verify --network sonic [VE69LP_ADDRESS] [DRAGON_TOKEN_ADDRESS]
  ```
  - [ ] Confirm source code is verified on block explorer
  - [ ] Verify constructor arguments

- [ ] Verify ve69LPFeeDistributor
  ```bash
  npx hardhat verify --network sonic [VE69LP_FEE_DISTRIBUTOR_ADDRESS] [VE69LP_ADDRESS]
  ```
  - [ ] Confirm source code is verified on block explorer
  - [ ] Verify constructor arguments

- [ ] Verify DragonExchangePair
  ```bash
  npx hardhat verify --network sonic [DRAGON_EXCHANGE_PAIR_ADDRESS]
  ```
  - [ ] Confirm source code is verified on block explorer
  - [ ] Check pool configuration

- [ ] Verify DragonJackpotVault
  ```bash
  npx hardhat verify --network sonic [DRAGON_JACKPOT_VAULT_ADDRESS]
  ```
  - [ ] Confirm source code is verified on block explorer
  - [ ] Check security settings

- [ ] Verify DragonLPBooster
  ```bash
  npx hardhat verify --network sonic [DRAGON_LP_BOOSTER_ADDRESS]
  ```
  - [ ] Confirm source code is verified on block explorer
  - [ ] Verify boost calculation parameters

- [ ] Verify DragonBeetsAdapter
  ```bash
  npx hardhat verify --network sonic [DRAGON_BEETS_ADAPTER_ADDRESS]
  ```
  - [ ] Confirm source code is verified on block explorer
  - [ ] Check integration parameters 