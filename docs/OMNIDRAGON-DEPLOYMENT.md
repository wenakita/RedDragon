# OmniDragon: Cross-Chain $DRAGON Token

This guide explains how to deploy and configure the OmniDragon token across multiple blockchains using LayerZero's omnichain messaging protocol with deterministic addresses.

## Prerequisites

- Node.js v16+ and npm/yarn
- Hardhat development environment
- Private keys for deploying to each target chain
- RPC URLs for each target chain
- Layer Zero endpoint addresses for each chain

## Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/dragon-token.git
cd dragon-token
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env` file with the following variables for each chain you want to deploy to:
```
# Example for Sonic chain
SONIC_RPC_URL=https://rpc.sonicscan.org/
SONIC_PRIVATE_KEY=your_private_key_here
SONIC_CHAIN_ID=146

# Example for Arbitrum chain
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
ARBITRUM_PRIVATE_KEY=your_private_key_here
ARBITRUM_CHAIN_ID=42161

# Add more chains as needed
```

## Deployment Process

### 1. Deploy OmniDragon Using Deterministic Addresses

We use CREATE2 opcode to deploy the OmniDragon token with the same address on each chain. This provides several benefits:
- Improved UX - users only need to know one address across all chains
- Simplified integrations - services only need to keep track of one token address
- Enhanced security - easier verification that you're interacting with the legitimate token

```bash
npx hardhat run scripts/deploy-omnidragon-system.ts --network sonic
```

This script:
1. Deploys the OmniDragonDeployer contract
2. Deploys supporting contracts (JackpotVault, ve69LPFeeDistributor)
3. Computes the deterministic address where OmniDragon will be deployed
4. Deploys OmniDragon using CREATE2 through the deployer contract
5. Verifies the deployed address matches the predicted address
6. Saves all addresses to `config/deployed-addresses.json`

### 2. Deploy OmniDragon on Secondary Chains

For each additional chain, run:

```bash
npx hardhat run scripts/deploy-omnidragon-system.ts --network arbitrum
npx hardhat run scripts/deploy-omnidragon-system.ts --network optimism
# and so on...
```

**IMPORTANT**: The OmniDragon contract should have the SAME ADDRESS on all chains. If it doesn't, verify that:
1. You're using the exact same deployment parameters (name, symbol, supply, salt)
2. The OmniDragonDeployer code is identical on all chains
3. The initialization parameters are consistent across deployments

### 3. Configure Cross-Chain Connections

After deploying to all target chains, configure the cross-chain connections:

```bash
# Configure from Sonic to Arbitrum
npx hardhat run scripts/configure-crosschain.ts --network sonic -- --target-chain arbitrum --target-address 0x123...

# Configure from Arbitrum to Sonic
npx hardhat run scripts/configure-crosschain.ts --network arbitrum -- --target-chain sonic --target-address 0x456...

# Repeat for all pairs of chains that need to communicate
```

You can also use the batch configuration option by modifying the script directly.

## Contract Architecture

The OmniDragon system consists of several key components:

1. **OmniDragonDeployer**: Factory contract that uses CREATE2 to deploy OmniDragon with deterministic addresses across chains.

2. **OmniDragon**: Extends OFT (Omnichain Fungible Token) for cross-chain functionality while maintaining the Dragon tokenomics:
   - 10% fee on buys (6.9% to jackpot, 2.41% to ve69LPfeeDistributor)
   - 10% fee on sells (6.9% to jackpot, 2.41% to ve69LPfeeDistributor)
   - 0.69% burn on all transfers

3. **LayerZero Integration**: Enables secure cross-chain transfers between supported networks.

## Cross-Chain Architecture

LayerZero provides a secure messaging layer between blockchains with the following components:

1. **Endpoints**: Smart contracts deployed on each chain that serve as entry and exit points for messages.

2. **Decentralized Verifier Networks (DVNs)**: Independent validators that ensure message integrity.

3. **Message Libraries**: Handle message packing and verification.

4. **Executors**: Deliver and execute messages on destination chains.

## Usage Examples

### Transfer Tokens Cross-Chain

Users can transfer OmniDragon tokens from one chain to another:

```solidity
// On the source chain:
uint16 dstChainId = 110; // Arbitrum
address to = 0x123...;
uint256 amount = 1000 * 10**18; // 1000 tokens
bytes memory adapterParams = "0x"; // Default params

// Estimate fee
OmniDragon omniDragon = OmniDragon(omniDragonAddress);
(uint256 fee, ) = omniDragon.estimateSendFee(dstChainId, to, amount, false, adapterParams);

// Send tokens cross-chain
omniDragon.sendFrom{value: fee}(
    msg.sender,
    dstChainId, 
    abi.encodePacked(to),
    amount,
    msg.sender,
    address(0),
    adapterParams
);
```

## Security Considerations

1. **Deterministic Deployer Security**: Ensure only authorized operators can use the OmniDragonDeployer contract.
2. **Trusted Remotes**: Only authorized contract addresses should be set as trusted remotes.
3. **Transaction Validation**: Ensure proper validation on both source and destination chains.
4. **Fee Management**: Always estimate fees before sending cross-chain transactions.

## Additional Resources

- [LayerZero Documentation](https://layerzero.gitbook.io/)
- [OFT Contract Specification](https://layerzero.gitbook.io/docs/technical-reference/mainnet/supported-chain-ids)
- [LayerZero Explorer](https://layerzeroscan.com/)
- [CREATE2 Opcode Documentation](https://eips.ethereum.org/EIPS/eip-1014)

## Ensuring Deterministic Addresses

To guarantee that OmniDragon is deployed at exactly the same address across all chains, you must follow these steps carefully:

### 1. Understanding CREATE2 Deterministic Deployment

The deterministic address is calculated based on:
- The deployer contract address
- The bytecode of the contract being deployed (including constructor arguments)
- A salt value (we use a constant: 0x69)

The formula is: `keccak256(0xff + deployer_address + salt + keccak256(bytecode))`

### 2. Critical Steps for Cross-Chain Deterministic Deployment

1. **Deploy in the Right Order**:
   ```
   # On each chain, deploy in this exact order
   npx hardhat run scripts/deploy-deterministic-omnidragon.ts --network sonic
   npx hardhat run scripts/deploy-deterministic-omnidragon.ts --network arbitrum
   # etc.
   ```

2. **Use Identical Parameters Across Chains**:
   - Same token name: "OmniDragon"
   - Same token symbol: "DRAGON"
   - Same initial supply: 1,000,000,000 tokens
   - Same default salt value: 0x69
   
3. **Verify the Bytecode Hash**:
   Our deployment script outputs a bytecode hash. This must be identical across all chains:
   ```
   # Verify on each chain
   Creation bytecode hash: 0x123abc...
   ```
   
4. **Verify the Deployed Address**:
   The script verifies that the deployed address matches the predicted address:
   ```
   Predicted OmniDragon address: 0xabc123...
   OmniDragon deployed to: 0xabc123...
   ✅ Deployed address matches predicted address!
   ```

### 3. Gas Token Considerations

Each blockchain has its own native gas token:
- Sonic: SONIC
- Arbitrum: ETH
- Optimism: ETH
- Ethereum: ETH

Our implementation accounts for this by:
1. Setting chain-specific gas limits based on each chain's characteristics:
   ```solidity
   // More gas for Ethereum mainnet
   const minDstGas = chain.id === 102 ? '1000000' : '500000';
   ```

2. Using the LayerZero fee estimation function to calculate appropriate fees in the source chain's native token:
   ```solidity
   (uint256 fee, ) = omniDragon.estimateSendFee(dstChainId, to, amount, false, adapterParams);
   ```

3. Configuring appropriate refund mechanisms for cross-chain messages.

### 4. Troubleshooting Address Mismatch

If you deploy OmniDragon to a different address than expected, check:

1. **Bytecode Differences**:
   - Solidity compiler version differences
   - Contract code differences (even a single space matters)
   - Different import paths or imported contract versions
   
2. **Constructor Arguments**:
   - Different token name or symbol (even capitalization matters)
   - Different initial supply
   - Different addresses for dependencies (jackpotVault, ve69LPFeeDistributor, etc.)
   
3. **Deployer Contract**:
   - Different deployer contract code
   - Different deployer contract address

4. **Salt Value**:
   - Different salt value (should be 0x69 for all deployments)

### 5. Cross-Chain Read Benefits

OmniDragon implements LayerZero Read capability to:
- Monitor token balances across all chains in real-time
- Query token supply on remote chains without requiring a full transaction
- Track token distribution across the entire ecosystem
- Validate that cross-chain transfers are processed correctly

To use this feature:
```solidity
// Query token supply on Arbitrum
omniDragon.queryRemoteChainSupply(110, "0x"); // 110 is Arbitrum chain ID
```

The results are stored in the contract and can be queried with:
```solidity
omniDragon.getAllChainSupplies();
```

This provides unprecedented visibility into the omnichain token ecosystem, with all chains' token balances visible from any chain where OmniDragon is deployed. 