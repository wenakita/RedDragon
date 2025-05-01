import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';

async function main() {
  // Get the contract factories and signer
  const [deployer] = await ethers.getSigners();
  console.log(`\n🐉 DEPLOYING OMNIDRAGON ON SECONDARY CHAIN 🐉\n`);
  console.log(`Deploying contracts with account: ${deployer.address}`);
  console.log(`Account balance: ${ethers.utils.formatEther(await deployer.getBalance())} ETH`);
  
  // Store deployed addresses
  const deployedAddresses: Record<string, string> = {};
  
  // Load original deployment addresses
  const configDir = path.join(__dirname, '../config');
  const originalAddressesPath = path.join(configDir, 'deterministic-addresses.json');
  const secondaryAddressesPath = path.join(configDir, `deterministic-addresses-${process.env.NETWORK || 'secondary'}.json`);
  
  if (!fs.existsSync(originalAddressesPath)) {
    throw new Error('Original deployment addresses not found. Please run deploy-deterministic-omnidragon.ts on the primary chain first.');
  }
  
  const originalAddresses = JSON.parse(fs.readFileSync(originalAddressesPath, 'utf8'));
  console.log('\nLoaded original deployment addresses:');
  console.log(originalAddresses);
  
  // Known addresses - use environment variables or defaults
  const wrappedSonicAddress = process.env.WRAPPED_SONIC_ADDRESS || '0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38'; // Default
  const lzEndpointAddress = process.env.LZ_ENDPOINT_ADDRESS || '0xb6319cC6c8c27A8F5dAF0dD3DF91EA35C4720dd7'; // Default
  
  // Use the exact same parameters as the primary deployment
  const tokenName = 'OmniDragon';
  const tokenSymbol = 'DRAGON';
  const initialSupply = ethers.utils.parseEther('1000000000'); // 1 billion tokens
  
  try {
    // Step 1: Deploy required infrastructure contracts
    // Deploy DragonJackpotVault
    console.log('\n=== DEPLOYING JACKPOT VAULT ===\n');
    const DragonJackpotVault = await ethers.getContractFactory('DragonJackpotVault');
    const jackpotVault = await DragonJackpotVault.deploy(wrappedSonicAddress);
    await jackpotVault.deployed();
    console.log(`DragonJackpotVault deployed to: ${jackpotVault.address}`);
    deployedAddresses.jackpotVault = jackpotVault.address;
    
    // Deploy ve69LP token
    console.log('\n=== DEPLOYING VE69LP TOKEN ===\n');
    const Ve69LP = await ethers.getContractFactory('ve69LP');
    const ve69LpToken = await Ve69LP.deploy('Voting Escrow 69 LP', 've69LP');
    await ve69LpToken.deployed();
    console.log(`ve69LP deployed to: ${ve69LpToken.address}`);
    deployedAddresses.ve69LP = ve69LpToken.address;
    
    // Deploy ve69LP fee distributor
    console.log('\n=== DEPLOYING VE69LP FEE DISTRIBUTOR ===\n');
    const Ve69LPFeeDistributor = await ethers.getContractFactory('ve69LPFeeDistributor');
    const ve69LPFeeDistributor = await Ve69LPFeeDistributor.deploy(
      ve69LpToken.address,
      wrappedSonicAddress
    );
    await ve69LPFeeDistributor.deployed();
    console.log(`ve69LPFeeDistributor deployed to: ${ve69LPFeeDistributor.address}`);
    deployedAddresses.ve69LPFeeDistributor = ve69LPFeeDistributor.address;
    
    // Step 2: Deploy OmniDragonDeployer
    console.log('\n=== DEPLOYING OMNIDRAGON DEPLOYER ===\n');
    const OmniDragonDeployer = await ethers.getContractFactory('OmniDragonDeployer');
    const omniDragonDeployer = await OmniDragonDeployer.deploy();
    await omniDragonDeployer.deployed();
    console.log(`OmniDragonDeployer deployed to: ${omniDragonDeployer.address}`);
    deployedAddresses.omniDragonDeployer = omniDragonDeployer.address;
    
    // Step 3: Compute OmniDragon deterministic address
    console.log('\n=== COMPUTING DETERMINISTIC OMNIDRAGON ADDRESS ===\n');
    const predictedAddress = await omniDragonDeployer.computeOmniDragonAddressWithDefaultSalt(
      tokenName,
      tokenSymbol,
      initialSupply,
      lzEndpointAddress,
      jackpotVault.address,
      ve69LPFeeDistributor.address,
      wrappedSonicAddress,
      deployer.address // multisig address (using deployer for now)
    );
    console.log(`Predicted OmniDragon address: ${predictedAddress}`);
    deployedAddresses.predictedOmniDragon = predictedAddress;
    
    // Verify that the predicted address matches the original deployment
    if (predictedAddress.toLowerCase() !== originalAddresses.predictedOmniDragon.toLowerCase()) {
      console.error(`WARNING: Predicted address ${predictedAddress} does not match original address ${originalAddresses.predictedOmniDragon}`);
      console.error('This will result in different contract addresses across chains!');
      
      // Check bytecode hash to diagnose the issue
      const bytecodeHash = await omniDragonDeployer.getCreationBytecodeHash(
        tokenName,
        tokenSymbol,
        initialSupply,
        lzEndpointAddress,
        jackpotVault.address,
        ve69LPFeeDistributor.address,
        wrappedSonicAddress,
        deployer.address
      );
      
      console.error(`Current bytecode hash: ${bytecodeHash}`);
      console.error(`Original bytecode hash: ${originalAddresses.bytecodeHash}`);
      
      // Ask for confirmation to proceed
      console.error('\n⚠️ ADDRESS MISMATCH DETECTED! ⚠️');
      console.error('Proceeding will deploy OmniDragon at a different address than on the primary chain.');
      console.error('This will break cross-chain functionality!');
      console.error('');
      console.error('Please fix the parameters to match the original deployment.');
      
      // Exit with error
      throw new Error('Deterministic address mismatch');
    } else {
      console.log('✅ Predicted address matches original deployment address!');
    }
    
    // Step 4: Deploy OmniDragon with deterministic address
    console.log('\n=== DEPLOYING OMNIDRAGON WITH DETERMINISTIC ADDRESS ===\n');
    const deployTx = await omniDragonDeployer.deployOmniDragonWithDefaultSalt(
      tokenName,
      tokenSymbol,
      initialSupply,
      lzEndpointAddress,
      jackpotVault.address,
      ve69LPFeeDistributor.address,
      wrappedSonicAddress,
      deployer.address // multisig address (using deployer for now)
    );
    
    // Wait for deployment transaction to be mined
    console.log('Waiting for deployment transaction to be mined...');
    const receipt = await deployTx.wait();
    
    // Extract deployed address from events
    const deployedEvent = receipt.events?.find((e: any) => e.event === 'OmniDragonDeployed');
    if (!deployedEvent || !deployedEvent.args) {
      throw new Error('Failed to extract deployed OmniDragon address from events');
    }
    
    const omniDragonAddress = deployedEvent.args.omniDragonAddress;
    console.log(`OmniDragon deployed to: ${omniDragonAddress}`);
    deployedAddresses.omniDragon = omniDragonAddress;
    
    // Verify the deployed address matches the predicted address
    if (omniDragonAddress.toLowerCase() !== predictedAddress.toLowerCase()) {
      console.error(`ERROR: Deployed address ${omniDragonAddress} does not match predicted address ${predictedAddress}`);
      throw new Error('Deployed address mismatch');
    } else {
      console.log(`✅ Deployed address matches predicted address!`);
    }
    
    // Verify the deployed address matches the original deployment
    if (omniDragonAddress.toLowerCase() !== originalAddresses.omniDragon.toLowerCase()) {
      console.error(`ERROR: Deployed address ${omniDragonAddress} does not match original address ${originalAddresses.omniDragon}`);
      throw new Error('Original address mismatch');
    } else {
      console.log(`✅ Deployed address matches original deployment address!`);
    }
    
    // Step 5: Set up OmniDragon
    console.log('\n=== SETTING UP OMNIDRAGON ===\n');
    const omniDragon = await ethers.getContractAt('OmniDragon', omniDragonAddress);
    
    // Set up jackpot vault with OmniDragon address
    console.log('Setting OmniDragon address in jackpot vault...');
    const setTokenTx = await jackpotVault.setTokenAddress(omniDragonAddress);
    await setTokenTx.wait();
    console.log('✅ OmniDragon address set in jackpot vault');
    
    // Step 6: Set up cross-chain connections
    // Get the current chain ID from environment or network
    const currentChainId = parseInt(process.env.CHAIN_ID || '0', 10);
    if (currentChainId === 0) {
      console.warn('WARNING: CHAIN_ID environment variable not set. Cross-chain connections may not be correctly configured.');
    }
    
    // Set up supported chains for cross-chain operation
    // Use chain information from the original deployment or environment
    const supportedChains = [
      { id: 146, name: 'Sonic' },
      { id: 110, name: 'Arbitrum' },
      { id: 111, name: 'Optimism' },
      { id: 102, name: 'Ethereum' }
    ].filter(chain => chain.id !== currentChainId); // Exclude current chain
    
    console.log('\n=== CONFIGURING CROSS-CHAIN SUPPORT ===\n');
    console.log(`Current chain ID: ${currentChainId || 'Unknown'}`);
    
    for (const chain of supportedChains) {
      console.log(`Setting up chain: ${chain.name} (${chain.id})`);
      
      // Set trusted remote - this is the *same* address on different chains
      const setTrustedRemoteTx = await omniDragon.setTrustedRemote(
        chain.id,
        originalAddresses.omniDragon
      );
      await setTrustedRemoteTx.wait();
      console.log(`✅ Trusted remote set for ${chain.name}`);
      
      // Set minimum gas for cross-chain operations
      const minDstGas = chain.id === 102 ? '1000000' : '500000'; // More gas for Ethereum
      const setMinDstGasTx = await omniDragon.setMinDstGas(chain.id, minDstGas);
      await setMinDstGasTx.wait();
      console.log(`✅ Minimum destination gas set for ${chain.name}: ${minDstGas}`);
    }
    
    // Save addresses to a network-specific file
    console.log('\n=== SAVING DEPLOYMENT ADDRESSES ===\n');
    fs.writeFileSync(
      secondaryAddressesPath,
      JSON.stringify(deployedAddresses, null, 2)
    );
    console.log(`Addresses saved to ${secondaryAddressesPath}`);
    
    console.log('\n🎉 DEPLOYMENT COMPLETED 🎉\n');
    console.log('Deployed Contracts:');
    console.log(`- OmniDragon Token: ${omniDragonAddress}`);
    console.log(`- OmniDragonDeployer: ${omniDragonDeployer.address}`);
    console.log(`- DragonJackpotVault: ${jackpotVault.address}`);
    console.log(`- ve69LP Token: ${ve69LpToken.address}`);
    console.log(`- ve69LPFeeDistributor: ${ve69LPFeeDistributor.address}`);
    
    return deployedAddresses;
  } catch (error) {
    console.error('Error during deployment:', error);
    throw error;
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 