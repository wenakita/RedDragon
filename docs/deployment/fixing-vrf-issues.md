# Fixing VRF Implementation Issues Before Deployment

This document outlines the steps needed to fix the current issues with the VRF implementation before proceeding with deployment.

## Current Issues

1. **Compiler Version Mismatch**: Some contracts are using Solidity 0.8.24 while the Hardhat config only supports 0.8.20
2. **Duplicate Error Declarations**: Error declarations in `IArbitrumVRFRequester.sol` are duplicated from the implementation
3. **Missing Import**: `MessagingReceipt` and `MessagingFee` types are not properly imported in `SonicVRFConsumerRead.sol`
4. **Function Clashes**: There are function overload clashes between different LayerZero implementations 
5. **Wrong ReadCodecV1 Usage**: The call to `ReadCodecV1.decode` has incorrect parameters

## Step 1: Fix Hardhat Configuration

Create the script `scripts/fix-compiler-config.js`:

```javascript
// Script to update hardhat.config.ts to support multiple Solidity compiler versions
const fs = require('fs');
const path = require('path');

// Path to the hardhat config file
const configPath = path.join(__dirname, '../hardhat.config.ts');

console.log('Updating Hardhat configuration to support multiple Solidity versions...');

// Read the current config file
let configContent = fs.readFileSync(configPath, 'utf8');

// Replace the simple solidity version with compilers array
const solRegex = /solidity:\s*{[\s\S]*?version:\s*["']0\.8\.20["'],[\s\S]*?settings:\s*{[\s\S]*?optimizer:\s*{[\s\S]*?enabled:\s*true,[\s\S]*?runs:\s*\d+[\s\S]*?}[\s\S]*?}[\s\S]*?}/;

const multiCompilerConfig = `solidity: {
  compilers: [
    {
      version: "0.8.24",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    },
    {
      version: "0.8.20",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  ]
}`;

configContent = configContent.replace(solRegex, multiCompilerConfig);

// Write the updated config back to the file
fs.writeFileSync(configPath, configContent);

console.log('Hardhat configuration updated successfully!');
```

Run the script:
```bash
node scripts/fix-compiler-config.js
```

## Step 2: Fix Duplicate Error Declarations

Create the script `scripts/fix-vrf-errors.js`:

```javascript
// Script to fix VRF compilation errors
const fs = require('fs');
const path = require('path');

console.log('Fixing VRF compilation errors...');

// Fix 1: Remove duplicate error declarations in IArbitrumVRFRequester.sol
const interfacePath = path.join(__dirname, '../contracts/interfaces/IArbitrumVRFRequester.sol');
if (fs.existsSync(interfacePath)) {
  console.log('Fixing duplicate error declarations in IArbitrumVRFRequester.sol...');
  
  let interfaceContent = fs.readFileSync(interfacePath, 'utf8');
  
  // Remove all error declarations since they're already in ArbitrumVRFRequester.sol
  const errorRegex = /error\s+[a-zA-Z0-9]+\(\);/g;
  const matches = interfaceContent.match(errorRegex) || [];
  
  if (matches.length > 0) {
    console.log(`Found ${matches.length} error declarations to remove`);
    
    // Replace each error declaration with a comment
    matches.forEach(match => {
      interfaceContent = interfaceContent.replace(match, `// Removed duplicate: ${match}`);
    });
    
    fs.writeFileSync(interfacePath, interfaceContent);
    console.log('Duplicate error declarations removed from IArbitrumVRFRequester.sol');
  }
}
```

Run the script:
```bash
node scripts/fix-vrf-errors.js
```

## Step 3: Prepare Simplified Deployment

For the deployment, we'll create a simpler version without the problematic components. This approach allows us to deploy the core functionality while addressing the more complex issues:

1. **Create Backup**: 
```bash
mkdir -p deployment.bak
cp -r contracts deployment.bak/
```

2. **Simplify VRF Implementation**: 
   - Comment out the `SonicVRFConsumerRead.sol` integration for now
   - Focus on deploying the main `SonicVRFConsumer.sol` and `ArbitrumVRFRequester.sol`

## Step 4: Create Deployment Script

Create a simplified deployment script in `scripts/deploy-vrf-basic.js`:

```javascript
// Simple deployment script for VRF core components
const { ethers } = require("hardhat");
require('dotenv').config({ path: "./deployment.env" });

async function main() {
  console.log("Deploying VRF core components...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  
  // Load configuration from deployment.env
  const arbitrumConfig = {
    vrfCoordinator: process.env.VRF_COORDINATOR_ARBITRUM,
    lzEndpoint: process.env.ARBITRUM_LZ_ENDPOINT,
    sonicChainId: parseInt(process.env.LZ_SONIC_CHAIN_ID || "146"),
    keyHash: process.env.VRF_KEY_HASH,
    subscriptionId: process.env.VRF_SUBSCRIPTION_ID
  };
  
  const sonicConfig = {
    lzEndpoint: process.env.SONIC_LZ_ENDPOINT,
    arbitrumChainId: parseInt(process.env.LZ_ARBITRUM_CHAIN_ID || "110"),
    lotteryContract: process.env.LOTTERY_CONTRACT
  };
  
  console.log("Using configuration:");
  console.log("Arbitrum:", arbitrumConfig);
  console.log("Sonic:", sonicConfig);
  
  // Deploy ArbitrumVRFRequester on Arbitrum
  console.log("\nDeploying ArbitrumVRFRequester...");
  const ArbitrumVRFRequester = await ethers.getContractFactory("ArbitrumVRFRequester");
  
  // Use a placeholder for SonicVRFConsumer
  const placeholderSonicVRF = "0x0000000000000000000000000000000000000000";
  
  const arbitrumVRFRequester = await ArbitrumVRFRequester.deploy(
    arbitrumConfig.vrfCoordinator,
    arbitrumConfig.lzEndpoint,
    arbitrumConfig.subscriptionId,
    arbitrumConfig.keyHash,
    arbitrumConfig.sonicChainId,
    placeholderSonicVRF
  );
  
  await arbitrumVRFRequester.deployed();
  console.log(`ArbitrumVRFRequester deployed to: ${arbitrumVRFRequester.address}`);
  
  // Deploy SonicVRFConsumer
  console.log("\nDeploying SonicVRFConsumer...");
  const SonicVRFConsumer = await ethers.getContractFactory("SonicVRFConsumer");
  
  const sonicVRFConsumer = await SonicVRFConsumer.deploy(
    sonicConfig.lzEndpoint,
    sonicConfig.arbitrumChainId,
    arbitrumVRFRequester.address,
    sonicConfig.lotteryContract
  );
  
  await sonicVRFConsumer.deployed();
  console.log(`SonicVRFConsumer deployed to: ${sonicVRFConsumer.address}`);
  
  // Update ArbitrumVRFRequester with the SonicVRFConsumer address
  console.log("\nUpdating ArbitrumVRFRequester with SonicVRFConsumer address...");
  await arbitrumVRFRequester.updateSonicVRFConsumer(sonicVRFConsumer.address);
  console.log("Update complete!");
  
  console.log("\nDeployment completed successfully!");
  console.log("\nNext steps:");
  console.log("1. Fund the Chainlink VRF subscription");
  console.log("2. Fund both contracts with native tokens for cross-chain fees");
  console.log("3. Update the lottery contract to use the SonicVRFConsumer");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

## Step 5: Set Up Deployment Environment

Create a `deployment.env` file with all required parameters:

```
# Network Configuration
MAINNET_RPC_URL=https://rpc.soniclabs.com
MAINNET_CHAIN_ID=146
PRIVATE_KEY=your_sonic_private_key
ARBITRUM_MAINNET_RPC_URL=https://arb1.arbitrum.io/rpc
ARBITRUM_PRIVATE_KEY=your_arbitrum_private_key

# LayerZero Configuration
SONIC_LZ_ENDPOINT=0xb6319cC6c8c27A8F5dAF0dD3DF91EA35C4720dd7
ARBITRUM_LZ_ENDPOINT=0x3c2269811836af69497E5F486A85D7316753cf62
LZ_SONIC_CHAIN_ID=332
LZ_ARBITRUM_CHAIN_ID=110

# VRF Configuration
VRF_COORDINATOR_ARBITRUM=0x...  # Chainlink VRF Coordinator on Arbitrum
VRF_SUBSCRIPTION_ID=12345       # Your Chainlink VRF subscription ID
VRF_KEY_HASH=0x...              # VRF key hash for your desired gas lane
VRF_CALLBACK_GAS_LIMIT=500000   # Gas limit for VRF callback

# Contract Addresses
LOTTERY_CONTRACT=0x...          # Your DragonSwapTriggerV2 address
```

## Step 6: Run Deployment on Testnets First

Deploy to testnets before mainnet:

```bash
# For Arbitrum Testnet (Goerli)
npx hardhat run scripts/deploy-vrf-basic.js --network arbitrumTestnet

# For Sonic Testnet
npx hardhat run scripts/deploy-vrf-basic.js --network sonicTestnet
```

## Step 7: Fix Remaining Issues Later

After successful deployment of the core VRF functionality, you can address the remaining issues:

1. Properly implement the `SonicVRFConsumerRead` contract
2. Fix the `_lzReceive` function implementation
3. Correct the `ReadCodecV1.decode` usage

## Additional Resources

For detailed implementation of these fixes, refer to:
- [LayerZero OApp Documentation](https://docs.layerzero.network/contracts/oapp)
- [Chainlink VRF Documentation](https://docs.chain.link/vrf/v2/introduction)
- The VRF deployment guide in `docs/deployment/vrf-deployment-guide.md` 