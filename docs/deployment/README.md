# Dragon Deployment

This directory contains documentation related to the deployment of the Dragon ecosystem.

## Deployment Process

The Dragon ecosystem deployment follows these general steps:

1. **Environment Setup**:
   - Configure environment variables
   - Set up deployment keys
   - Verify access to target networks

2. **Core System Deployment**:
   - Deploy OmniDragon token contract
   - Deploy DragonJackpotVault
   - Deploy ve69LPFeeDistributor
   - Deploy DragonSwapTriggerV2

3. **VRF System Deployment**:
   - Deploy ArbitrumVRFRequester on Arbitrum
   - Configure Chainlink VRF subscription
   - Deploy SonicVRFConsumer on Sonic
   - Configure cross-chain communication

4. **Verification and Testing**:
   - Verify all contracts on block explorers
   - Perform basic functionality tests
   - Test cross-chain interactions

## Deployment Tools

The project uses a combination of Hardhat and custom scripts for deployment:

- **Hardhat Tasks**: For specific deployment operations
- **JavaScript Scripts**: For orchestrated deployments
- **Shell Scripts**: For environment setup and verification

## Configuration

Deployment configuration is managed through environment variables in `.env` files and deployment configuration files in the `deploy/config/` directory.

## Security Considerations

During deployment, the following security considerations are important:

1. Use multisig wallets for ownership when possible
2. Keep private keys secure and separate
3. Verify all contract bytecode after deployment
4. Test thoroughly on testnets before mainnet deployment

## Post-Deployment Tasks

After successful deployment, the following tasks should be performed:

1. Update documentation with deployed addresses
2. Configure frontend applications with new contract addresses
3. Announce deployment to the community
4. Monitor initial transactions to ensure everything works as expected 