import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { ContractFactory } from 'ethers';

// Deploy ArbitrumVRFRequester contract
task('deploy:arbitrum-vrf', 'Deploy the ArbitrumVRFRequester contract on Arbitrum')
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers, config, network } = hre;
    console.log(`Deploying ArbitrumVRFRequester on ${network.name}...`);

    // Make sure we're on the right network
    if (!network.name.includes('arbitrum')) {
      console.warn(`Warning: You're deploying on ${network.name}, not Arbitrum!`);
    }

    // Load configuration from environment
    const vrfCoordinator = process.env.VRF_COORDINATOR_ARBITRUM;
    const lzEndpoint = process.env.LZ_ENDPOINT_ARBITRUM;
    const subscriptionId = process.env.VRF_SUBSCRIPTION_ID;
    const keyHash = process.env.VRF_KEY_HASH;
    const sonicChainId = process.env.LZ_SONIC_CHAIN_ID;
    
    if (!vrfCoordinator || !lzEndpoint || !subscriptionId || !keyHash || !sonicChainId) {
      throw new Error('Missing required environment variables for ArbitrumVRFRequester deployment');
    }

    // Load or create a placeholder for SonicVRFConsumer address
    // This will need to be updated after SonicVRFConsumer is deployed
    let sonicVRFConsumer = process.env.SONIC_VRF_CONSUMER_ADDRESS || ethers.constants.AddressZero;

    // Deploy the contract
    const [deployer] = await ethers.getSigners();
    console.log(`Deploying with account: ${deployer.address}`);

    const ArbitrumVRFRequester: ContractFactory = await ethers.getContractFactory('ArbitrumVRFRequester');
    const requester = await ArbitrumVRFRequester.deploy(
      vrfCoordinator,
      lzEndpoint,
      subscriptionId,
      keyHash,
      sonicChainId,
      sonicVRFConsumer
    );

    await requester.deployed();
    console.log(`ArbitrumVRFRequester deployed to: ${requester.address}`);

    // Verify contract if not on a local network
    if (!network.name.includes('localhost') && !network.name.includes('hardhat')) {
      console.log('Waiting for block confirmations...');
      await requester.deployTransaction.wait(5);

      console.log('Verifying contract...');
      try {
        await hre.run('verify:verify', {
          address: requester.address,
          constructorArguments: [
            vrfCoordinator,
            lzEndpoint,
            subscriptionId,
            keyHash,
            sonicChainId,
            sonicVRFConsumer
          ],
        });
        console.log('Contract verified!');
      } catch (error) {
        console.error('Error verifying contract:', error);
      }
    }

    return requester.address;
  });

// Deploy SonicVRFConsumer contract
task('deploy:sonic-vrf', 'Deploy the SonicVRFConsumer contract on Sonic')
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers, config, network } = hre;
    console.log(`Deploying SonicVRFConsumer on ${network.name}...`);

    // Make sure we're on the right network
    if (!network.name.includes('sonic')) {
      console.warn(`Warning: You're deploying on ${network.name}, not Sonic!`);
    }

    // Load configuration from environment
    const lzEndpoint = process.env.LZ_ENDPOINT_SONIC;
    const arbitrumChainId = process.env.LZ_ARBITRUM_CHAIN_ID;
    const arbitrumVRFRequester = process.env.ARBITRUM_VRF_REQUESTER_ADDRESS;
    const lotteryContract = process.env.VRF_LOTTERY_CONTRACT;
    
    if (!lzEndpoint || !arbitrumChainId || !arbitrumVRFRequester || !lotteryContract) {
      throw new Error('Missing required environment variables for SonicVRFConsumer deployment');
    }

    // Deploy the contract
    const [deployer] = await ethers.getSigners();
    console.log(`Deploying with account: ${deployer.address}`);

    const SonicVRFConsumer: ContractFactory = await ethers.getContractFactory('SonicVRFConsumer');
    const consumer = await SonicVRFConsumer.deploy(
      lzEndpoint,
      arbitrumChainId,
      arbitrumVRFRequester,
      lotteryContract
    );

    await consumer.deployed();
    console.log(`SonicVRFConsumer deployed to: ${consumer.address}`);

    // Deploy SonicVRFConsumerRead as well if needed
    const readDelegate = process.env.VRF_READ_DELEGATE;
    if (readDelegate) {
      console.log('Deploying SonicVRFConsumerRead...');
      
      const SonicVRFConsumerRead: ContractFactory = await ethers.getContractFactory('SonicVRFConsumerRead');
      const consumerRead = await SonicVRFConsumerRead.deploy(
        lzEndpoint,
        arbitrumChainId,
        arbitrumVRFRequester,
        lotteryContract,
        readDelegate
      );
      
      await consumerRead.deployed();
      console.log(`SonicVRFConsumerRead deployed to: ${consumerRead.address}`);
    }

    // Verify contract if not on a local network
    if (!network.name.includes('localhost') && !network.name.includes('hardhat')) {
      console.log('Waiting for block confirmations...');
      await consumer.deployTransaction.wait(5);

      console.log('Verifying contract...');
      try {
        await hre.run('verify:verify', {
          address: consumer.address,
          constructorArguments: [
            lzEndpoint,
            arbitrumChainId,
            arbitrumVRFRequester,
            lotteryContract
          ],
        });
        console.log('Contract verified!');
      } catch (error) {
        console.error('Error verifying contract:', error);
      }
    }

    return consumer.address;
  });

// Update the ArbitrumVRFRequester with the SonicVRFConsumer address
task('update:vrf-peers', 'Update the cross-chain peer addresses for VRF')
  .addParam('arbitrumRequester', 'ArbitrumVRFRequester contract address')
  .addParam('sonicConsumer', 'SonicVRFConsumer contract address')
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers, network } = hre;
    
    // Update ArbitrumVRFRequester with SonicVRFConsumer address
    if (network.name.includes('arbitrum')) {
      console.log('Updating ArbitrumVRFRequester with SonicVRFConsumer address...');
      const arbitrumVRFRequester = await ethers.getContractAt('ArbitrumVRFRequester', taskArgs.arbitrumRequester);
      
      await arbitrumVRFRequester.updateSonicVRFConsumer(taskArgs.sonicConsumer);
      console.log('ArbitrumVRFRequester updated successfully!');
    } 
    // Update SonicVRFConsumer with ArbitrumVRFRequester address
    else if (network.name.includes('sonic')) {
      console.log('Updating SonicVRFConsumer with ArbitrumVRFRequester address...');
      const sonicVRFConsumer = await ethers.getContractAt('SonicVRFConsumer', taskArgs.sonicConsumer);
      
      await sonicVRFConsumer.updateArbitrumVRFRequester(taskArgs.arbitrumRequester);
      console.log('SonicVRFConsumer updated successfully!');
    }
    else {
      console.error(`Unsupported network: ${network.name}`);
    }
  });

// Test VRF message fee estimation
task('vrf:quote-message', 'Estimate the fee for a VRF cross-chain message')
  .addParam('srcChain', 'Source chain (arbitrum or sonic)')
  .addParam('dstChain', 'Destination chain (arbitrum or sonic)')
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers, network } = hre;
    
    // Make sure we're on the right network
    if (!network.name.includes(taskArgs.srcChain)) {
      console.error(`Current network is ${network.name}, but source chain specified is ${taskArgs.srcChain}`);
      return;
    }
    
    // Get contract addresses from environment
    let contractAddress;
    if (taskArgs.srcChain === 'arbitrum') {
      contractAddress = process.env.ARBITRUM_VRF_REQUESTER_ADDRESS;
    } else if (taskArgs.srcChain === 'sonic') {
      contractAddress = process.env.SONIC_VRF_CONSUMER_ADDRESS;
    } else {
      console.error(`Invalid source chain: ${taskArgs.srcChain}`);
      return;
    }
    
    if (!contractAddress) {
      console.error(`Contract address for ${taskArgs.srcChain} not found in environment variables`);
      return;
    }
    
    try {
      if (taskArgs.srcChain === 'arbitrum') {
        // Simulate message from Arbitrum to Sonic
        const arbitrumVRFRequester = await ethers.getContractAt('ArbitrumVRFRequester', contractAddress);
        
        // Create a sample message
        const sampleMessage = ethers.utils.defaultAbiCoder.encode(
          ['uint64', 'address', 'uint256'],
          [1, ethers.constants.AddressZero, ethers.utils.parseEther('1')]
        );
        
        // Create message parameters
        const params = {
          dstEid: Number(process.env.LZ_SONIC_CHAIN_ID),
          receiver: ethers.utils.defaultAbiCoder.encode(['address'], [process.env.SONIC_VRF_CONSUMER_ADDRESS]),
          message: sampleMessage,
          options: ethers.utils.defaultAbiCoder.encode(['uint16', 'uint256'], [1, 500000]),
          payInLzToken: false
        };
        
        // Get endpoint
        const lzEndpoint = await ethers.getContractAt('ILayerZeroEndpointV2', process.env.LZ_ENDPOINT_ARBITRUM || '');
        
        // Quote fee
        const fee = await lzEndpoint.quote(params, contractAddress);
        console.log(`Message fee from Arbitrum to Sonic: ${ethers.utils.formatEther(fee.nativeFee)} ETH`);
      } else {
        // Simulate message from Sonic to Arbitrum
        const sonicVRFConsumer = await ethers.getContractAt('SonicVRFConsumer', contractAddress);
        
        // Create a sample message
        const sampleMessage = ethers.utils.defaultAbiCoder.encode(
          ['uint64', 'address'],
          [1, ethers.constants.AddressZero]
        );
        
        // Create message parameters
        const params = {
          dstEid: Number(process.env.LZ_ARBITRUM_CHAIN_ID),
          receiver: ethers.utils.defaultAbiCoder.encode(['address'], [process.env.ARBITRUM_VRF_REQUESTER_ADDRESS]),
          message: sampleMessage,
          options: ethers.utils.defaultAbiCoder.encode(['uint16', 'uint256'], [1, 500000]),
          payInLzToken: false
        };
        
        // Get endpoint
        const lzEndpoint = await ethers.getContractAt('ILayerZeroEndpointV2', process.env.LZ_ENDPOINT_SONIC || '');
        
        // Quote fee
        const fee = await lzEndpoint.quote(params, contractAddress);
        console.log(`Message fee from Sonic to Arbitrum: ${ethers.utils.formatEther(fee.nativeFee)} SONIC`);
      }
    } catch (error) {
      console.error('Error estimating message fee:', error);
    }
  }); 