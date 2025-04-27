# Dragon Token Deployment Flowchart

```
┌─────────────────────┐
│   Initial Setup     │
│  Install, Config    │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  Deploy DRAGON Token│
│    (Core Token)     │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Create LP Pool      │◄─────┐
│ (Manual on Beets)   │      │
└──────────┬──────────┘      │
           ▼                 │
┌─────────────────────┐      │
│   Deploy ve69LP     │      │
│  (Voting Escrow)    │      │
└──────────┬──────────┘      │
           ▼                 │
┌─────────────────────┐      │
│ Deploy Jackpot Vault│      │
│  (Prize Pool)       │      │
└──────────┬──────────┘      │
           ▼                 │
┌─────────────────────┐      │
│ Deploy ve69LPBoost  │      │ RED_DRAGON_LAUNCH_WIZARD.js
│ (Reward Boosting)   │      │ Deployment Script
└──────────┬──────────┘      │
           ▼                 │
┌─────────────────────┐      │
│ Deploy FeeDistribut.│      │
│ (Fee Management)    │      │
└──────────┬──────────┘      │
           ▼                 │
┌─────────────────────┐      │
│Deploy LotterySwap   │      │
│(Lottery Logic)      │      │
└──────────┬──────────┘      │
           ▼                 │
┌─────────────────────┐      │
│Deploy PartnerRegistry│     │
│(Partner Management) │      │
└──────────┬──────────┘      │
           ▼                 │
┌─────────────────────┐      │
│ Deploy PoolVoting   │      │
│ (Governance)        │      │
└──────────┬──────────┘      │
           ▼                 │
┌─────────────────────┐      │
│  Configure Core     │      │
│    Contracts        │──────┘
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  Deploy VRF on      │
│    Arbitrum         │ ◄─── deploy_cross_chain_vrf.js
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Deploy VRF Consumer │
│    on Sonic         │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Link VRF Systems    │
│  Across Chains      │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Fund VRF Subscription│
│ with LINK (Arbitrum)│ ◄─── Manual Step
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Setup LayerZero Read│
│ Enhanced Functionality│ ◄─── setup_layerzero_read.js
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Connect DRAGON to   │
│ VRF Consumer        │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│Configure Lottery Params│
│ (Win Rate, Boost)   │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  Seed Jackpot       │
│  Initial Balance    │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Verify Contracts on │
│ Block Explorer      │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  Deploy Monitoring  │
│     Services        │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Transfer to Multisig│
│   (Production)      │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  System Live        │
└─────────────────────┘
```

## Deployment Decision Tree

```
Is this a fresh deployment?
├── Yes → Start with Initial Setup
└── No → Are you redeploying a specific component?
    ├── Yes → Component needs dependencies?
    │   ├── Yes → Redeploy dependencies first
    │   └── No → Redeploy just that component
    └── No → Are you updating configuration?
        ├── Yes → Use specific configuration scripts
        └── No → Use the verification tools to check system health
```

## Checkpoint Verification

- **After Core Deployment**:
  - Verify DRAGON token configuration
  - Check ownership settings
  - Validate fee distribution parameters

- **After VRF Integration**:
  - Test swap transactions trigger VRF
  - Verify cross-chain message passing
  - Check randomness is properly received and processed

- **Before Launch**:
  - Complete end-to-end testing with small amounts
  - Verify all contracts are verified on-chain
  - Ensure monitoring is properly set up
  - Transfer ownership to multisig wallet

## Recovery Procedures

- **If VRF fails**:
  - Check ETH balances on both chains
  - Verify LINK subscription status
  - Check trusted addresses configuration

- **If contract deployment fails**:
  - Note the error message
  - Check deployment parameters
  - Verify network conditions (gas, congestion)
  - Retry with proper gas settings 