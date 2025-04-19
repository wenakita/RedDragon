# SonicRedDragon Project Structure

This document outlines the organization of the SonicRedDragon project.

## Directory Structure

```
SonicRedDragon/
├── contracts/            # Smart contract source code
│   ├── interfaces/       # Contract interfaces
│   └── mocks/            # Mock implementations for testing
├── test/                 # Test files for smart contracts
├── scripts/              # JavaScript deployment scripts
├── deploy/               # Deployment-related files
│   ├── config/           # Configuration files used in deployments
│   └── scripts/          # Shell deployment scripts
├── docs/                 # Project documentation
├── metadata/             # NFT metadata-related files
│   ├── metadata-service/ # Service for handling metadata
│   ├── ipfs-upload/      # IPFS upload scripts and configs
│   └── pinata-upload/    # Pinata upload scripts and configs
├── build/                # Build artifacts
│   └── flattened/        # Flattened contract files
├── out/                  # Foundry build output
├── lib/                  # Library dependencies (Foundry)
├── node_modules/         # Node.js dependencies
├── artifacts/            # Hardhat build artifacts
└── cache/                # Hardhat cache
```

## Key Files

- `package.json`: Node.js dependencies and scripts
- `hardhat.config.js`: Hardhat configuration
- `foundry.toml`: Foundry configuration
- `remappings.txt`: Foundry import remappings
- `.env`: Environment variables (gitignored)
- `.env.example`: Example environment variables

## Contract Organization

- `Dragon.sol`: Main token contract
- `DragonLotterySwap.sol`: Primary lottery implementation
- `ve69LP.sol`: Voting escrow token implementation
- `ve69LPFeeDistributor.sol`: Fee distribution for ve69LP holders

## Documentation

- `dragon-rules.mdc`: Documentation of the project rules and guidelines

## Deployment

Deployment scripts are organized into JavaScript scripts in `scripts/` and shell scripts in `deploy/scripts/`.

## Security and Sensitive Files

The project contains sensitive files that should never be committed to git:

1. **API Keys**: 
   - Located in `deploy/config/api_key.txt` 
   - Required for interacting with SonicScan API
   - Example template provided in `deploy/config/api_key.txt.example`

2. **Private Keys**:
   - Located in `deploy/config/private_key.txt`
   - Required for contract deployment
   - Example template provided in `deploy/config/private_key.txt.example`
   
3. **Environment Variables**:
   - Located in `.env`
   - Contains various sensitive configuration values
   - Example template provided in `.env.example`

### Secure Handling

- Never commit any actual API keys, private keys, or environment files to the repository
- Files in `deploy/config/` are gitignored for security
- Use example templates when onboarding new developers
- For production deployments, use Google Cloud Secret Manager as configured in deployment scripts
- Always keep backups of your keys in a secure location outside the project directory 