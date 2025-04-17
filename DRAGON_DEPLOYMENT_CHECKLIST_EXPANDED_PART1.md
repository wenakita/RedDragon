# Dragon Ecosystem Deployment Checklist - Part 1

## Pre-Deployment Preparation

- [ ] Set up Google Cloud Platform account and project
  - Project name: `dragon-ecosystem`
  - Billing account attached
  - APIs enabled:
    - Compute Engine
    - Cloud Run
    - Secret Manager
    - Cloud Storage
    - BigQuery
    - Pub/Sub
    - Cloud Functions
    - Firestore
    - Cloud Scheduler
    - Cloud Build
    - Cloud Logging
    - Cloud Armor
    - VPC Service Controls
    - Web Security Scanner
    - Access Context Manager

- [ ] Prepare deployment wallets
  - [ ] Create deployment wallet
  - [ ] Fund with enough SONIC for deployment (min 10 SONIC)
  - [ ] Fund with enough ETH for gas (min 1 ETH)
  - [ ] Store private key securely in KMS or hardware wallet
  - [ ] Create backup wallet in case of emergency

- [ ] Prepare RPC endpoints
  - [ ] Sonic Mainnet: `https://rpc.soniclabs.com`
  - [ ] Archive Node (if needed): `_____________`
  - [ ] Test nodes with basic requests to ensure functionality

- [ ] Prepare local environment
  - [ ] Clone repository: `git clone https://github.com/yourusername/dragon-ecosystem.git`
  - [ ] Install dependencies: `npm install`
  - [ ] Set up `.env` file with all necessary keys and addresses
  - [ ] Configure Hardhat network settings for Sonic

## Smart Contract Deployment

### 1. Deploy Core Contracts

#### 1.1 Token and Financial Contracts

- [ ] Deploy Dragon Token
  ```bash
  npx hardhat run scripts/deploy-dragon.js --network sonic
  ```
  - [ ] Store deployed address: `______________`
  - [ ] Verify initial supply: `6,942,000 DRAGON`
  - [ ] Verify token name and symbol: `Dragon` and `DRAGON`
  - [ ] Verify decimals: `18`
  
- [ ] Deploy ve69LP
  ```bash
  npx hardhat run scripts/deploy-ve69lp.js --network sonic
  ```
  - [ ] Store deployed address: `______________`
  - [ ] Verify proper initialization
  - [ ] Test lock functionality with small amount

- [ ] Deploy ve69LPFeeDistributor
  ```bash
  npx hardhat run scripts/deploy-ve69lp-fee-distributor.js --network sonic
  ```
  - [ ] Store deployed address: `______________`
  - [ ] Verify fee distribution mechanism

- [ ] Deploy DragonJackpotVault
  ```bash
  npx hardhat run scripts/deploy-dragon-jackpot-vault.js --network sonic
  ```
  - [ ] Store deployed address: `______________`
  - [ ] Verify access controls
  - [ ] Test deposit/withdrawal functions

- [ ] Deploy DragonExchangePair
  ```bash
  npx hardhat run scripts/deploy-dragon-exchange-pair.js --network sonic
  ```
  - [ ] Store deployed address: `______________`
  - [ ] Verify pool creation
  - [ ] Ensure correct WSONIC/DRAGON pair

#### 1.2 VRF and Randomness Contracts

- [ ] Deploy VRFValidator with configurable coordinator
  ```bash
  npx hardhat run scripts/deploy-vrf-validator.js --network sonic
  ```
  - [ ] Store deployed address: `______________`
  - [ ] Current coordinator address used: `0x3Ba925fdeAe6B46d0BB4d424D829982Cb2F7309e`
  - [ ] Verify coordinator is set correctly

- [ ] Deploy DelayedEntryCompensation (Whitelist Dragon NFT)
  ```bash
  npx hardhat run scripts/deploy-whitelist-dragon.js --network sonic
  ```
  - [ ] Store deployed address: `______________`
  - [ ] Verify metadata URL is set to: `https://sonicreddragon.io/white/`
  - [ ] Verify NFT name: `Whitelist Dragon`
  - [ ] Verify NFT symbol: `WHITEDRAGON`

#### 1.3 Game and Utility Contracts

- [ ] Deploy RedEnvelopes
  ```bash
  npx hardhat run scripts/deploy-red-envelopes.js --network sonic
  ```
  - [ ] Store deployed address: `______________`
  - [ ] Verify initialization settings: 
    - [ ] Minimum amount: 10 DRAGON
    - [ ] Maximum claimers: 100
    - [ ] Fee percentage: 1%
  - [ ] Test creation with small amount

- [ ] Deploy DragonLotterySwap
  ```bash
  npx hardhat run scripts/deploy-lottery-swap.js --network sonic
  ```
  - [ ] Store deployed address: `______________`
  - [ ] Verify lottery parameters
  - [ ] Verify no entry is possible until fully configured

- [ ] Deploy GoldScratcher
  ```bash
  npx hardhat run scripts/deploy-gold-scratcher.js --network sonic
  ```
  - [ ] Store deployed address: `______________`
  - [ ] Verify NFT metadata
  - [ ] Test minting function

- [ ] Deploy PromotionalItemRegistry
  ```bash
  npx hardhat run scripts/deploy-promotional-item-registry.js --network sonic
  ```
  - [ ] Store deployed address: `______________`
  - [ ] Test item registration
  - [ ] Verify access controls

#### 1.4 Integration and Adapter Contracts

- [ ] Deploy DragonLPBooster
  ```bash
  npx hardhat run scripts/deploy-dragon-lp-booster.js --network sonic
  ```
  - [ ] Store deployed address: `______________`
  - [ ] Verify boost calculation logic
  - [ ] Test with sample values

- [ ] Deploy DragonBeetsAdapter
  ```bash
  npx hardhat run scripts/deploy-dragon-beets-adapter.js --network sonic
  ```
  - [ ] Store deployed address: `______________`
  - [ ] Verify Balancer/Beets integration
  - [ ] Test with small transactions 