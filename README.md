# Red Dragon Lottery Swap System

This repository contains the Red Dragon Lottery Swap contracts, a comprehensive lottery system built for the Sonic blockchain.

## Overview

The Red Dragon Lottery Swap system consolidates the functionality of multiple legacy lottery contracts into a single, efficient implementation. The system includes:

- **DragonLotterySwap**: The main abstract contract with all lottery functionality
- **ConcreteDragonLotterySwap**: A concrete implementation for deployment
- **GoldScratcher**: NFT implementation for jackpot boosts
- **PromotionalItemRegistry**: Registry for promotions and additional boosts

## Deployment

There are two deployment scripts provided:

### Local Development Deployment

To deploy to a local Hardhat node for testing:

```bash
# Start a local Hardhat node
npx hardhat node

# In a separate terminal, deploy the contracts
npx hardhat run scripts/deploy_concrete_lottery_swap.js --network localhost

# Interact with the deployed contracts
npx hardhat run scripts/interact_lottery_swap.js --network localhost
```

### Sonic Network Deployment

To deploy to the Sonic mainnet:

1. Set up environment variables:

```bash
# Create or edit .env file
SONIC_MAINNET_RPC_URL=https://rpc.soniclabs.com
PRIVATE_KEY=your_private_key_here
WRAPPED_SONIC_ADDRESS=0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38
```

2. Deploy the contracts:

```bash
npx hardhat run scripts/deploy_sonic_network.js --network sonic
```

3. Verify the contracts on SonicScan using the commands that will be displayed after deployment.

## Contract Interactions

### Basic Usage

1. **Adding to the Jackpot**:
   ```javascript
   await lottery.addToJackpot(ethers.utils.parseEther("100"));
   ```

2. **Processing a Buy**:
   ```javascript
   await lottery.processBuy(userAddress, ethers.utils.parseEther("5"));
   ```

3. **Getting Lottery Stats**:
   ```javascript
   const stats = await lottery.getStats();
   console.log(`Total Winners: ${stats.winners}`);
   console.log(`Total Payouts: ${ethers.utils.formatEther(stats.payouts)} wSONIC`);
   console.log(`Current Jackpot: ${ethers.utils.formatEther(stats.current)} wSONIC`);
   ```

4. **Using GoldScratcher**:
   ```javascript
   // Mint a scratcher to a user
   await goldScratcher.mint(userAddress);
   
   // Apply the scratcher to a swap for bonus
   await goldScratcher.applyToSwap(tokenId, swapAmount);
   ```

## Configuration

After deployment, configure the lottery parameters:

1. **Set Entry Limits**:
   ```javascript
   // Min: 1 wSONIC, Max: 10,000 wSONIC
   await lottery.setEntryLimits(
     ethers.utils.parseEther("1"),
     ethers.utils.parseEther("10000")
   );
   ```

2. **Set Win Chance**:
   ```javascript
   // Base: 0.04%, Max: 4% (expressed in basis points)
   await lottery.setWinChance(4, 400);
   ```

3. **Set Exchange Pair** (for detecting buys/sells):
   ```javascript
   await lottery.setExchangePair(exchangePairAddress);
   ```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Deployment Process

### Prerequisites

1. Ensure you have Node.js and npm installed
2. Configure your `.env` file with:
   - Private key or mnemonic for deployment
   - Network configurations (for Sonic mainnet)
   - Addresses for required external contracts (e.g., WRAPPED_SONIC_ADDRESS)

### Steps to Deploy

1. Install dependencies:
   ```
   npm install
   ```

2. Compile the contracts:
   ```
   npx hardhat compile
   ```

3. Deploy all contracts at once:
   ```
   npx hardhat run scripts/deploy-all.js --network sonic
   ```
   
   This script will:
   - Deploy all necessary contracts in the correct order
   - Configure relationships between contracts
   - Set up ve8020 address in the Dragon token
   - Display all contract addresses at the end
   - Authorize 0x934B0AB5B32d73cF99b618e6f31eB2e4E976f741 as a verifier

4. After deployment, update your `.env` file with the new contract addresses shown in the output.

5. Verify all contracts on SonicScan:
   ```
   npx hardhat run scripts/verify-all.js --network sonic
   ```

## Contract Verification

SonicScan has a daily limit of 250 source code submissions. Due to this limitation, not all contracts may be verified in a single day.

### Using the Scheduled Verification Script

We've created a scheduled verification script that tracks verification status and retries failed verifications:

```bash
# Verify all unverified contracts
npx hardhat run scripts/scheduled-verify.js --network sonic

# Verify a specific contract
npx hardhat run scripts/scheduled-verify.js --network sonic Dragon
```

The script creates a `verification-status.json` file that tracks which contracts have been verified and how many attempts have been made. It will:

- Skip already verified contracts
- Retry transient failures
- Stop when it detects the daily limit has been reached
- Provide a summary of verification status

### Manual Verification

For manual verification using Hardhat:

```bash
# Verify all contracts
npx hardhat verify-all --network sonic

# Verify a specific contract (example for Dragon)
npx hardhat verify --network sonic 0xFb1e86A52c92E3Fa8F78d1e2c3c86c3B81E842d2 "0x4820Fe23828FfF58904bBfca6292ba196DB5EBF4" "0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38" "0x000000000000000000000000000000000000dEaD" "0xd55745c964197CCe954F0DcFcFA9c873fA4638Fb"
```

## Deployed Contracts

After successful deployment, the following contracts will be available:

| Contract | Description |
|----------|-------------|
| MockPaintSwapVerifier | Verification service for random number generation |
| PromotionalItemRegistry | Registry for promotional items that can provide boosts |
| GoldScratcher | Scratcher system for jackpot boosts |
| ConcreteDragonLotterySwap | Main lottery system |
| Dragon | The Dragon token |
| ve8020 | Voting escrow token |
| PriceOracle | Price oracle for USD-based entries |

## Scripts

- `scripts/deploy-all.js` - Deploys all contracts in the correct sequence
- `scripts/verify-all.js` - Verifies all contracts on SonicScan
- `scripts/add-contract-verifier.js` - Adds an address as an authorized verifier
- `scripts/add-lottery-authority.js` - Adds an address as an authorized lottery operator

## Architecture

The Red Dragon ecosystem consists of several interconnected contracts:

1. **Dragon Token** - The core token of the ecosystem
2. **ve8020** - Voting escrow token for Dragon
3. **DragonLotterySwap** - The consolidated lottery mechanism
4. **Gold Scratcher** - NFT-based system for boosting jackpot odds
5. **PromotionalItemRegistry** - Registry for promotional items

The system allows users to participate in the lottery with varying win chances based on their voting power, LP stakes, and promotional items.

# Red Dragon Protocol - Sonic Network Deployment

## Deployed Contracts

| Contract Name | Address | Verification Status |
|---------------|---------|---------------------|
| MockPaintSwapVerifier | 0xC885900cab96Edc0E22A14C0CFc460D5f9cc54E1 | Pending |
| PromotionalItemRegistry | 0x0F158442C2b9dacE62ab06843aF2655A18f8A0aE | Pending |
| GoldScratcher | 0x0742049D8Df65ff988FF150C3369035ede53821F | Pending |
| ConcreteDragonLotterySwap | 0x4820Fe23828FfF58904bBfca6292ba196DB5EBF4 | Pending |
| Dragon | 0xFb1e86A52c92E3Fa8F78d1e2c3c86c3B81E842d2 | Pending |
| ve8020 | 0xd55745c964197CCe954F0DcFcFA9c873fA4638Fb | Pending |

## Verification Instructions

SonicScan has a daily limit of 250 source code submissions. If you encounter the error "Daily limit of 250 source code submissions reached", try again the next day.

### Verification Script

Use the following command to verify contracts:

```bash
npx hardhat run scripts/direct-verify.js --network sonic
```

To verify a specific contract:

```bash
npx hardhat run scripts/direct-verify.js --network sonic YourContractName
```

## Contract Parameters

### GoldScratcher
- Name: Red Dragon Gold Scratcher
- Symbol: RDGS
- Base URI: https://api.reddragon.sonic/metadata/
- Unrevealed URI: unrevealed/
- Winner URI: winner/
- Loser URI: loser/

### ConcreteDragonLotterySwap
- WRAPPED_SONIC_ADDRESS: 0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38
- PAINTSWAP_VERIFIER_ADDRESS: 0xC885900cab96Edc0E22A14C0CFc460D5f9cc54E1
- PROMOTIONAL_ITEM_REGISTRY_ADDRESS: 0x0F158442C2b9dacE62ab06843aF2655A18f8A0aE
- GOLD_SCRATCHER_ADDRESS: 0x0742049D8Df65ff988FF150C3369035ede53821F

### Dragon
- LOTTERY_ADDRESS: 0x4820Fe23828FfF58904bBfca6292ba196DB5EBF4
- WRAPPED_SONIC_ADDRESS: 0x78266EAb20Ff1483a926F183B3E5A6C84f87D54c
- BURN_ADDRESS: 0x000000000000000000000000000000000000dEaD
- WRAPPED_SONIC_ADDRESS: 0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38

### ve8020
- DRAGON_ADDRESS: 0xFb1e86A52c92E3Fa8F78d1e2c3c86c3B81E842d2 