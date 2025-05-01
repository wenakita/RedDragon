import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';

async function main() {
  // Get the contract factories and signer
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with account: ${deployer.address}`);

  // Store deployed addresses
  const deployedAddresses: Record<string, string> = {};
  
  // Known addresses
  const wrappedSonicAddress = '0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38';
  const beetsLPAddress = '0xeA2271DAD89385119A88Ce0BB957DEf053aE560A';
  const shadowRouterAddress = '0x5543c6176feb9b4b179078205d7c29eea2e2d695';
  const shadowQuoterAddress = '0x3003B4FeAFF95e09683FEB7fc5d11b330cd79Dc7';
  const lzEndpointAddress = '0xb6319cC6c8c27A8F5dAF0dD3DF91EA35C4720dd7'; // Sonic LayerZero Endpoint
  
  // Create config folder if it doesn't exist
  const configDir = path.join(__dirname, '../config');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  const addressesPath = path.join(configDir, 'deployed-addresses.json');

  try {
    console.log('\n1. DEPLOYING OMNDRAGON TOKEN\n');
    
    // Deploy ve69LP token first (or use existing address)
    const ve69LP = await ethers.getContractFactory('ve69LP');
    const ve69LpToken = await ve69LP.deploy('Voting Escrow 69 LP', 've69LP');
    await ve69LpToken.deployed();
    console.log(`ve69LP deployed to: ${ve69LpToken.address}`);
    deployedAddresses.ve69LP = ve69LpToken.address;
    
    // Deploy multisig (or use existing address)
    // For this example, we'll use the deployer's address
    const multisigAddress = deployer.address;
    deployedAddresses.multisig = multisigAddress;
    
    // Deploy jackpot vault (temporary)
    const DragonJackpotVault = await ethers.getContractFactory('DragonJackpotVault');
    const jackpotVault = await DragonJackpotVault.deploy(wrappedSonicAddress);
    await jackpotVault.deployed();
    console.log(`DragonJackpotVault deployed to: ${jackpotVault.address}`);
    deployedAddresses.jackpotVault = jackpotVault.address;
    
    // Deploy ve69LP fee distributor
    const Ve69LPFeeDistributor = await ethers.getContractFactory('ve69LPFeeDistributor');
    const ve69LPFeeDistributor = await Ve69LPFeeDistributor.deploy(
      ve69LpToken.address,
      wrappedSonicAddress
    );
    await ve69LPFeeDistributor.deployed();
    console.log(`ve69LPFeeDistributor deployed to: ${ve69LPFeeDistributor.address}`);
    deployedAddresses.ve69LPFeeDistributor = ve69LPFeeDistributor.address;
    
    // Deploy OmniDragon
    const OmniDragon = await ethers.getContractFactory('OmniDragon');
    const initialSupply = ethers.utils.parseEther('1000000000'); // 1 billion tokens
    const omniDragon = await OmniDragon.deploy(
      'OmniDragon',
      'DRAGON',
      initialSupply,
      lzEndpointAddress, // Added LayerZero endpoint address
      jackpotVault.address,
      ve69LPFeeDistributor.address,
      wrappedSonicAddress,
      multisigAddress
    );
    await omniDragon.deployed();
    console.log(`OmniDragon deployed to: ${omniDragon.address}`);
    deployedAddresses.omniDragon = omniDragon.address;
    
    // Set Dragon token in jackpot vault
    let tx = await jackpotVault.setTokenAddress(omniDragon.address);
    await tx.wait();
    console.log('Dragon token address set in jackpot vault');
    
    console.log('\n2. DEPLOYING PARTNER REGISTRY\n');
    // Deploy DragonPartnerRegistry
    const DragonPartnerRegistry = await ethers.getContractFactory('DragonPartnerRegistry');
    const partnerRegistry = await DragonPartnerRegistry.deploy();
    await partnerRegistry.deployed();
    console.log(`DragonPartnerRegistry deployed to: ${partnerRegistry.address}`);
    deployedAddresses.partnerRegistry = partnerRegistry.address;
    
    // Set default probability boost (already defaults to 690 = 6.9%)
    console.log('Default probability boost set to 6.9% (690 basis points)');
    
    console.log('\n3. DEPLOYING VE69LP POOL VOTING\n');
    // Deploy ve69LPPoolVoting
    const Ve69LPPoolVoting = await ethers.getContractFactory('ve69LPPoolVoting');
    const ve69LPPoolVoting = await Ve69LPPoolVoting.deploy(
      ve69LpToken.address,
      partnerRegistry.address
    );
    await ve69LPPoolVoting.deployed();
    console.log(`ve69LPPoolVoting deployed to: ${ve69LPPoolVoting.address}`);
    deployedAddresses.ve69LPPoolVoting = ve69LPPoolVoting.address;
    
    console.log('\n4. DEPLOYING SHADOW DEX ADAPTER\n');
    // Deploy DragonExchangeAdapter (for Shadow DEX)
    const DragonExchangeAdapter = await ethers.getContractFactory('DragonExchangeAdapter');
    const shadowDEXAdapter = await DragonExchangeAdapter.deploy(
      shadowRouterAddress,
      shadowQuoterAddress,
      omniDragon.address,
      beetsLPAddress,
      wrappedSonicAddress,
      jackpotVault.address,
      ve69LPFeeDistributor.address
    );
    await shadowDEXAdapter.deployed();
    console.log(`ShadowDEXAdapter deployed to: ${shadowDEXAdapter.address}`);
    deployedAddresses.shadowDEXAdapter = shadowDEXAdapter.address;
    
    // Set price method on adapter (CONTRACT_RATIOS = 1)
    tx = await shadowDEXAdapter.setPriceMethod(1);
    await tx.wait();
    console.log('Price method set to CONTRACT_RATIOS');
    
    console.log('\n5. DEPLOYING VE69LP BOOST\n');
    // Deploy ve69LPBoost
    const Ve69LPBoost = await ethers.getContractFactory('ve69LPBoost');
    const ve69LPBoost = await Ve69LPBoost.deploy(ve69LpToken.address);
    await ve69LPBoost.deployed();
    console.log(`ve69LPBoost deployed to: ${ve69LPBoost.address}`);
    deployedAddresses.ve69LPBoost = ve69LPBoost.address;
    
    console.log('\n6. CONNECTING COMPONENTS\n');
    // Connect components
    tx = await partnerRegistry.setDistributorAuthorization(shadowDEXAdapter.address, true);
    await tx.wait();
    console.log('ShadowDEXAdapter authorized as distributor in Partner Registry');
    
    // Note: OmniDragon doesn't have setExchangePair function
    console.log('Note: OmniDragon does not need setExchangePair as it uses a different architecture');
    
    // Set trusted remote for cross-chain communication (example for Arbitrum)
    const arbitrumChainId = 110; // LayerZero Arbitrum chain ID
    // This is a placeholder - in production you'd use the actual remote OmniDragon address
    const arbitrumOmniDragonAddress = "0x0000000000000000000000000000000000000000"; 
    tx = await omniDragon.setTrustedRemote(arbitrumChainId, arbitrumOmniDragonAddress);
    await tx.wait();
    console.log(`Set trusted remote for Arbitrum chain ID ${arbitrumChainId}`);
    
    console.log('\n7. ADDING SAMPLE PARTNERS TO REGISTRY\n');
    // Add sample partners to registry using the default probability boost
    // Replace with actual partner addresses in production
    const samplePartners = [
      { 
        address: '0x84Be1F47691b89A5645C4B14e41f4c274646B214', 
        name: 'Sample Partner 1', 
        feeShare: 5000 // 50%
      },
    ];
    
    for (const partner of samplePartners) {
      tx = await partnerRegistry.addPartnerWithDefaultBoost(
        partner.address,
        partner.name,
        partner.feeShare
      );
      await tx.wait();
      console.log(`Partner added: ${partner.name} with default 6.9% probability boost`);
    }
    
    console.log('\n🎉 DEPLOYMENT COMPLETED 🎉\n');
    console.log('Saving deployed addresses to file...');
    
    // Save all addresses to a file
    fs.writeFileSync(
      addressesPath,
      JSON.stringify(deployedAddresses, null, 2)
    );
    
    console.log('Addresses saved to config/deployed-addresses.json');
    
  } catch (error) {
    console.error('Error during deployment:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 