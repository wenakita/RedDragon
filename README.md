# Sonic Red Dragon Smart Contract Suite

This repository contains the full smart contract suite for the Sonic Red Dragon DeFi protocol, including core protocol logic, lottery, partner integrations, promotions, governance, and supporting modules.

---

## Directory Structure

```
contracts/
  core/           # Main protocol contracts (token, lottery base, core swap logic)
  lottery/        # Lottery-specific and jackpot contracts
  partner/        # Partner and DEX integration contracts
  ve69LP/         # Vote-escrowed LP, boosts, fee distribution, and related incentives
  promotions/     # Promotional items, scratchers, envelopes, and registries
  vrf/            # VRF and randomness utilities
  adapters/       # Adapter contracts for external integrations
  interfaces/     # Solidity interfaces for all protocol modules
  mocks/          # Mock contracts for testing and simulation

deployment/
  scripts/        # Deployment and verification scripts (see below)
  config/         # Deployment configuration files
  setup/          # Setup and environment scripts
  utils/          # Utilities for deployment and scripting
integrations/     # Cloud, automation, and third-party service integrations
```

---

## Folder Details

### `contracts/`

- **core/**
  - `Dragon.sol`: Main ERC20 token contract with fee and lottery hooks.
  - `DragonLotterySwap.sol`: Abstract base for lottery swap logic.
  - `DragonShadowV3Swapper.sol`: Core swap logic for advanced DEX integration.

- **lottery/**
  - `ConcreteDragonLotterySwap.sol`: Concrete implementation of the lottery.
  - `DelayedEntryCompensation.sol`: Handles delayed entry and compensation logic.
  - `DragonJackpotVault.sol`: Jackpot vault and payout logic.

- **partner/**
  - `DragonPartnerRegistry.sol`: Registry of DEX/partner integrations.
  - `DragonPartnerRouter.sol`: Router for partner swaps.
  - `DragonExchangeAdapter.sol`: Adapter for external exchange protocols.

- **ve69LP/**
  - `ve69LP.sol`: Vote-escrowed LP token contract.
  - `DragonLPBooster.sol`, `ve69LPBoost.sol`, `ve69LPFeeDistributor.sol`, `ve69LPLotteryConnector.sol`, `ve69LPPoolVoting.sol`: Incentive, boost, and fee distribution logic for ve69LP holders.

- **promotions/**
  - `GoldScratcher.sol`, `RedEnvelope.sol`: Promotional item contracts for boosting jackpot/probability.
  - `PromotionalItemRegistry.sol`: Registry for promotional items.

- **vrf/**
  - `VRFValidator.sol`: Utilities for verifiable randomness (VRF) integration.

- **adapters/**
  - Adapter contracts for specialized or external integrations (see folder for details).

- **interfaces/**
  - All Solidity interfaces for protocol contracts, partners, and external services.

- **mocks/**
  - Mock contracts for local testing and simulation.


### `deployment/`

- **scripts/deploy/**: All deployment scripts for protocol modules.
- **scripts/verify/**: All contract verification scripts.
- **config/**: Configuration files (API keys, schemas, addresses, etc).
- **setup/**: Scripts for environment and setup automation.
- **utils/**: Helper scripts for deployment and maintenance.

### `integrations/`
- All cloud, automation, and third-party integration code (e.g., GCP, Cloud Run, off-chain bots).

---

## Development & Contribution

- **Solidity Version:** All contracts use `^0.8.20` or higher for maximum security and compatibility.
- **Security:** Contracts use OpenZeppelin libraries for ERC20, access control, and reentrancy protection.
- **Testing:** Use the `mocks/` folder for local and integration tests.
- **Deployment:** Use scripts in `deployment/scripts/deploy/` for network deployment.
- **Verification:** Use scripts in `deployment/scripts/verify/` for Etherscan or block explorer verification.
- **Integrations:** All off-chain and cloud integrations are in the `integrations/` folder at the project root.

---

## Best Practices

- Keep contract logic modular and separated by concern.
- Use interfaces for all external contract calls.
- Place all cloud and third-party integrations in `integrations/`.
- Store deployment and verification logic in dedicated subfolders under `deployment/scripts/`.
- Keep sensitive configuration (API keys, secrets) in `deployment/config/` and out of version control.

---

## Contact & Community

- Twitter: [https://x.com/sonicreddragon](https://x.com/sonicreddragon)
- Telegram: [https://t.me/sonicreddragon](https://t.me/sonicreddragon)

---

For any questions, improvements, or contributions, please open an issue or pull request!
