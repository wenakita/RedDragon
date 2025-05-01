import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';

async function main() {
  // Get the contract factories and signer
  const [deployer] = await ethers.getSigners();
  console.log(`\n🐉 DEPLOYING OMNIDRAGON WITH DETERMINISTIC ADDRESS 🐉\n`);
  console.log(`Deploying contracts with account: ${deployer.address}`);
  console.log(`Account balance: ${ethers.utils.formatEther(await deployer.getBalance())} ETH`);
  
  // Store deployed addresses
  const deployedAddresses: Record<string, string> = {};
  
  // Known addresses
  const wrappedSonicAddress = process.env.WRAPPED_SONIC_ADDRESS || '0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38'; // Default to testnet
  const lzEndpointAddress = process.env.LZ_ENDPOINT_ADDRESS || '0xb6319cC6c8c27A8F5dAF0dD3DF91EA35C4720dd7'; // Default to testnet
  
  // Create config folder if it doesn't exist
  const configDir = path.join(__dirname, '../config');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  const addressesPath = path.join(configDir, 'deterministic-addresses.json');
  let targetDeploymentAddresses: Record<string, string> = {};
  
  // Load target addresses if file exists
  if (fs.existsSync(addressesPath)) {
    try {
      targetDeploymentAddresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
      console.log('\nLoaded target deployment addresses:');
      console.log(targetDeploymentAddresses);
    } catch (e) {
      console.warn('Failed to load target addresses, continuing with fresh deployment');
    }
  }
  
  // Standard deployment parameters across all chains
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
    
    // Deploy ve69LP token first
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
    
    // Step 4: Verify bytecode hash for validation
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
    console.log(`Creation bytecode hash: ${bytecodeHash}`);
    deployedAddresses.bytecodeHash = bytecodeHash;
    
    // Step 5: Deploy OmniDragon with deterministic address
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
    const deployedEvent = receipt.events?.find(e => e.event === 'OmniDragonDeployed');
    if (!deployedEvent || !deployedEvent.args) {
      throw new Error('Failed to extract deployed OmniDragon address from events');
    }
    
    const omniDragonAddress = deployedEvent.args.omniDragonAddress;
    console.log(`OmniDragon deployed to: ${omniDragonAddress}`);
    deployedAddresses.omniDragon = omniDragonAddress;
    
    // Verify the deployed address matches the predicted address
    if (omniDragonAddress.toLowerCase() !== predictedAddress.toLowerCase()) {
      console.error(`WARNING: Deployed address ${omniDragonAddress} does not match predicted address ${predictedAddress}`);
    } else {
      console.log(`✅ Deployed address matches predicted address!`);
    }
    
    // Step 6: Set up OmniDragon
    console.log('\n=== SETTING UP OMNIDRAGON ===\n');
    const omniDragon = await ethers.getContractAt('OmniDragon', omniDragonAddress);
    
    // Set up jackpot vault with OmniDragon address
    console.log('Setting OmniDragon address in jackpot vault...');
    const setTokenTx = await jackpotVault.setTokenAddress(omniDragonAddress);
    await setTokenTx.wait();
    console.log('✅ OmniDragon address set in jackpot vault');
    
    // Set up supported chains for cross-chain operation
    const supportedChains = [
      { id: 110, name: 'Arbitrum' },
      { id: 111, name: 'Optimism' },
      { id: 102, name: 'Ethereum' }
    ];
    
    console.log('\n=== CONFIGURING CROSS-CHAIN SUPPORT ===\n');
    for (const chain of supportedChains) {
      // In a real deployment, you would get the actual OmniDragon address on the target chain
      // For now, we'll use the same predicted address since it should be the same across all chains
      console.log(`Setting up chain: ${chain.name} (${chain.id})`);
      const setTrustedRemoteTx = await omniDragon.setTrustedRemote(
        chain.id,
        predictedAddress
      );
      await setTrustedRemoteTx.wait();
      console.log(`✅ Trusted remote set for ${chain.name}`);
      
      // Set minimum gas for cross-chain operations
      // These values should be adjusted based on the target chain
      const minDstGas = chain.id === 102 ? '1000000' : '500000'; // More gas for Ethereum
      const setMinDstGasTx = await omniDragon.setMinDstGas(chain.id, minDstGas);
      await setMinDstGasTx.wait();
      console.log(`✅ Minimum destination gas set for ${chain.name}: ${minDstGas}`);
    }
    
    // Save all addresses to a file
    console.log('\n=== SAVING DEPLOYMENT ADDRESSES ===\n');
    fs.writeFileSync(
      addressesPath,
      JSON.stringify(deployedAddresses, null, 2)
    );
    console.log(`Addresses saved to ${addressesPath}`);
    
    console.log('\n🎉 DEPLOYMENT COMPLETED 🎉\n');
    console.log('Deployed Contracts:');
    console.log(`- OmniDragon Token: ${omniDragonAddress}`);
    console.log(`- OmniDragonDeployer: ${omniDragonDeployer.address}`);
    console.log(`- DragonJackpotVault: ${jackpotVault.address}`);
    console.log(`- ve69LP Token: ${ve69LpToken.address}`);
    console.log(`- ve69LPFeeDistributor: ${ve69LPFeeDistributor.address}`);
    
    console.log('\n🚨 IMPORTANT 🚨');
    console.log('To deploy the same OmniDragon contract on other chains:');
    console.log('1. Use exactly the same OmniDragonDeployer code');
    console.log(`2. Use exactly the same token parameters (Name: "${tokenName}", Symbol: "${tokenSymbol}", Supply: ${initialSupply.toString()})`);
    console.log(`3. The bytecode hash should be: ${bytecodeHash}`);
    console.log(`4. The expected OmniDragon address is: ${predictedAddress}`);
    
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