// Deployment script for the cross-chain VRF solution
const { ethers, network } = require("hardhat");
require('dotenv').config({ path: "./deployment.env" });
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("Deploying cross-chain VRF contracts...");
  console.log(`Network: ${network.name}`);

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  
  // Check that all required environment variables are set
  const requiredEnvVars = [
    'CHAINLINK_VRF_COORDINATOR',
    'CHAINLINK_VRF_SUBSCRIPTION_ID',
    'CHAINLINK_VRF_KEY_HASH',
    'ARBITRUM_LZ_ENDPOINT',
    'SONIC_LZ_ENDPOINT',
    'SONIC_CHAIN_ID',
    'ARBITRUM_CHAIN_ID',
    'WRAPPED_SONIC_ADDRESS'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error(`ERROR: The following required environment variables are missing:`);
    missingVars.forEach(varName => console.error(`  - ${varName}`));
    console.error(`Please add them to your deployment.env file`);
    process.exit(1);
  }
  
  // Configuration for Arbitrum deployment
  const ARBITRUM_CONFIG = {
    vrfCoordinator: process.env.CHAINLINK_VRF_COORDINATOR,
    subscriptionId: process.env.CHAINLINK_VRF_SUBSCRIPTION_ID,
    keyHash: process.env.CHAINLINK_VRF_KEY_HASH,
    linkToken: process.env.LINK_TOKEN_ARBITRUM || "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4",
    layerZeroEndpoint: process.env.ARBITRUM_LZ_ENDPOINT,
    sonicChainId: parseInt(process.env.SONIC_CHAIN_ID),
  };

  // Configuration for Sonic deployment
  const SONIC_CONFIG = {
    layerZeroEndpoint: process.env.SONIC_LZ_ENDPOINT,
    arbitrumChainId: parseInt(process.env.ARBITRUM_CHAIN_ID),
    wrappedSonic: process.env.WRAPPED_SONIC_ADDRESS,
    dragonToken: process.env.DRAGON_ADDRESS,
  };

  // Display configuration
  console.log("\nArbitrum Configuration:");
  console.log(`VRF Coordinator: ${ARBITRUM_CONFIG.vrfCoordinator}`);
  console.log(`Subscription ID: ${ARBITRUM_CONFIG.subscriptionId}`);
  console.log(`Key Hash: ${ARBITRUM_CONFIG.keyHash}`);
  console.log(`LZ Endpoint: ${ARBITRUM_CONFIG.layerZeroEndpoint}`);
  console.log(`Sonic Chain ID: ${ARBITRUM_CONFIG.sonicChainId}`);
  
  console.log("\nSonic Configuration:");
  console.log(`LZ Endpoint: ${SONIC_CONFIG.layerZeroEndpoint}`);
  console.log(`Arbitrum Chain ID: ${SONIC_CONFIG.arbitrumChainId}`);
  console.log(`Wrapped Sonic: ${SONIC_CONFIG.wrappedSonic}`);
  console.log(`Dragon Token: ${SONIC_CONFIG.dragonToken || "Not set (will need to be updated later)"}`);

  // Check if Dragon token address is properly set
  if (!SONIC_CONFIG.dragonToken) {
    console.warn("\nWARNING: No Dragon token address specified in environment variables (DRAGON_ADDRESS)");
    console.warn("You will need to update this later with the correct address");
  }

  // Setup deployment directories
  const deploymentsDir = path.join(__dirname, '../../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  // Initialize contract addresses files
  const sonicAddressesPath = path.join(deploymentsDir, 'contract-addresses.json');
  const arbitrumAddressesPath = path.join(deploymentsDir, 'arbitrum-contract-addresses.json');
  
  let sonicAddresses = {};
  let arbitrumAddresses = {};
  
  if (fs.existsSync(sonicAddressesPath)) {
    sonicAddresses = JSON.parse(fs.readFileSync(sonicAddressesPath, 'utf8'));
  }
  
  if (fs.existsSync(arbitrumAddressesPath)) {
    arbitrumAddresses = JSON.parse(fs.readFileSync(arbitrumAddressesPath, 'utf8'));
  }

  // Get the contract factories using the correct paths
  const ArbitrumVRFRequester = await ethers.getContractFactory("ArbitrumVRFRequester");
  const SonicVRFConsumer = await ethers.getContractFactory("SonicVRFConsumer");

  console.log("\nDeploying to Arbitrum...");
  
  // For initial deployment, we'll use a placeholder address since we haven't deployed the Sonic consumer yet
  const sonicVRFConsumer = { address: ethers.constants.AddressZero };

  // Deploy ArbitrumVRFRequester
  const arbitrumVRFRequester = await ArbitrumVRFRequester.deploy(
    ARBITRUM_CONFIG.vrfCoordinator,
    ARBITRUM_CONFIG.subscriptionId,
    ARBITRUM_CONFIG.keyHash,
    ARBITRUM_CONFIG.layerZeroEndpoint,
    ARBITRUM_CONFIG.sonicChainId,
    sonicVRFConsumer.address // This will be updated after Sonic deployment
  );
  
  await arbitrumVRFRequester.deployed();
  const arbitrumVRFRequesterAddress = arbitrumVRFRequester.address;
  console.log(`ArbitrumVRFRequester deployed to: ${arbitrumVRFRequesterAddress}`);
  
  // Save to arbitrum addresses file
  arbitrumAddresses.arbitrumVRFRequester = arbitrumVRFRequesterAddress;
  fs.writeFileSync(arbitrumAddressesPath, JSON.stringify(arbitrumAddresses, null, 2));
  console.log("Saved ArbitrumVRFRequester address to deployments/arbitrum-contract-addresses.json");

  console.log("\nDeploying to Sonic...");
  
  // Set the lottery contract to the deployer address for now (can be updated later)
  const lotteryContract = deployer.address;
  
  // Deploy SonicVRFConsumer
  const sonicVRFConsumerContract = await SonicVRFConsumer.deploy(
    SONIC_CONFIG.layerZeroEndpoint,
    SONIC_CONFIG.arbitrumChainId,
    arbitrumVRFRequesterAddress,
    lotteryContract
  );
  
  await sonicVRFConsumerContract.deployed();
  const sonicVRFConsumerAddress = sonicVRFConsumerContract.address;
  console.log(`SonicVRFConsumer deployed to: ${sonicVRFConsumerAddress}`);
  
  // Save to sonic addresses file
  sonicAddresses.sonicVRFConsumer = sonicVRFConsumerAddress;
  fs.writeFileSync(sonicAddressesPath, JSON.stringify(sonicAddresses, null, 2));
  console.log("Saved SonicVRFConsumer address to deployments/contract-addresses.json");

  console.log("\nUpdating ArbitrumVRFRequester with Sonic consumer address...");
  // Update ArbitrumVRFRequester with the correct Sonic consumer address
  await arbitrumVRFRequester.setSonicVRFConsumer(sonicVRFConsumerAddress);
  console.log("ArbitrumVRFRequester updated with SonicVRFConsumer address!");

  console.log("\nCross-chain VRF setup complete!");

  console.log("\n------------------------------");
  console.log("Deployment Summary:");
  console.log(`ArbitrumVRFRequester: ${arbitrumVRFRequesterAddress}`);
  console.log(`SonicVRFConsumer: ${sonicVRFConsumerAddress}`);
  console.log("------------------------------");
  console.log("Next steps:");
  console.log("1. Fund the Chainlink VRF subscription on Arbitrum");
  console.log("2. Fund both contracts with ETH for LayerZero fees");
  console.log("3. Update the Dragon token contract to call SonicVRFConsumer.onSwapWSToDragon when swaps occur");
  console.log("4. Set up LayerZero Read by running setup_layerzero_read.js");
  console.log("5. Add DRAGON tokens to the jackpot");
  console.log("------------------------------");
  
  // Update deployment.env file
  console.log("\nWe've added these values to your deployment files. Adding them to deployment.env...");
  
  // Read existing env file
  const envPath = path.join(__dirname, '../../deployment.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Update VRF environment variables
  const envUpdates = {
    "VRF_CONSUMER_SONIC": sonicVRFConsumerAddress,
    "VRF_REQUESTER_ARBITRUM": arbitrumVRFRequesterAddress
  };
  
  // Update each variable in the .env file
  Object.entries(envUpdates).forEach(([key, value]) => {
    const regex = new RegExp(`${key}=.*`, 'g');
    
    if (envContent.match(regex)) {
      // If the variable exists, update it
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      // Add to VRF Configuration section
      envContent = envContent.replace('# VRF Configuration', `# VRF Configuration\n${key}=${value}`);
    }
  });
  
  // Write back to deployment.env
  fs.writeFileSync(envPath, envContent);
  console.log("Updated deployment.env with VRF contract addresses");
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 