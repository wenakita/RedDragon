// Simple deployment script for VRF core components
const { ethers } = require("hardhat");
require('dotenv').config({ path: "./deployment.env" });

/**
 * @notice Deploy VRF core components for Sonic Red Dragon
 * This script deploys the ArbitrumVRFRequester and SonicVRFConsumer contracts
 * and links them together for cross-chain randomness via LayerZero V1
 */
async function main() {
  console.log("\n=================================================");
  console.log("        🐉 DEPLOYING SONIC VRF SYSTEM 🐉");
  console.log("=================================================");
  console.log("Cross-Chain Randomness Solution for Sonic Red Dragon");
  console.log("=================================================\n");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  console.log(`Account balance: ${ethers.utils.formatEther(await deployer.getBalance())} ETH\n`);
  
  // Load configuration from deployment.env
  const arbitrumConfig = {
    vrfCoordinator: process.env.VRF_COORDINATOR_ARBITRUM,
    lzEndpoint: process.env.ARBITRUM_LZ_ENDPOINT,
    sonicChainId: parseInt(process.env.LZ_SONIC_CHAIN_ID || "146"),
    keyHash: process.env.VRF_KEY_HASH || process.env.VRF_KEY_HASH_30GWEI, // Default to 30 Gwei if not set
    subscriptionId: process.env.VRF_SUBSCRIPTION_ID,
    callbackGasLimit: parseInt(process.env.VRF_CALLBACK_GAS_LIMIT || "500000")
  };
  
  const sonicConfig = {
    lzEndpoint: process.env.SONIC_LZ_ENDPOINT,
    arbitrumChainId: parseInt(process.env.LZ_ARBITRUM_CHAIN_ID || "110"),
    lotteryContract: process.env.LOTTERY_CONTRACT
  };
  
  // Validate configuration
  validateConfig(arbitrumConfig, sonicConfig);
  
  console.log("🔍 Using configuration:");
  console.log("Arbitrum:");
  console.log(`- VRF Coordinator: ${arbitrumConfig.vrfCoordinator}`);
  console.log(`- LayerZero Endpoint: ${arbitrumConfig.lzEndpoint}`);
  console.log(`- Sonic Chain ID: ${arbitrumConfig.sonicChainId}`);
  console.log(`- Key Hash: ${arbitrumConfig.keyHash}`);
  console.log(`- Subscription ID: ${arbitrumConfig.subscriptionId}`);
  console.log(`- Callback Gas Limit: ${arbitrumConfig.callbackGasLimit.toLocaleString()}`);
  
  console.log("\nSonic:");
  console.log(`- LayerZero Endpoint: ${sonicConfig.lzEndpoint}`);
  console.log(`- Arbitrum Chain ID: ${sonicConfig.arbitrumChainId}`);
  console.log(`- Lottery Contract: ${sonicConfig.lotteryContract}`);
  
  // Deploy ArbitrumVRFRequester on Arbitrum
  console.log("\n🚀 Deploying ArbitrumVRFRequester...");
  const ArbitrumVRFRequester = await ethers.getContractFactory("ArbitrumVRFRequester");
  
  // Use a placeholder for SonicVRFConsumer initially
  const placeholderSonicVRF = "0x0000000000000000000000000000000000000000";
  
  // Convert subscriptionId to BigNumber if it's a string
  let subscriptionId;
  try {
    subscriptionId = ethers.BigNumber.from(arbitrumConfig.subscriptionId);
  } catch (error) {
    console.error(`❌ Error converting subscription ID: ${error.message}`);
    console.error(`Make sure your subscription ID is a valid number: ${arbitrumConfig.subscriptionId}`);
    process.exit(1);
  }
  
  try {
    const arbitrumVRFRequester = await ArbitrumVRFRequester.deploy(
      arbitrumConfig.vrfCoordinator,
      arbitrumConfig.lzEndpoint,
      subscriptionId,
      arbitrumConfig.keyHash,
      arbitrumConfig.sonicChainId,
      placeholderSonicVRF
    );
    
    await arbitrumVRFRequester.deployed();
    console.log(`✅ ArbitrumVRFRequester deployed to: ${arbitrumVRFRequester.address}`);
    
    // Deploy SonicVRFConsumer on Sonic chain
    console.log("\n🚀 Deploying SonicVRFConsumer...");
    const SonicVRFConsumer = await ethers.getContractFactory("SonicVRFConsumer");
    
    const sonicVRFConsumer = await SonicVRFConsumer.deploy(
      sonicConfig.lzEndpoint,
      sonicConfig.arbitrumChainId,
      arbitrumVRFRequester.address,
      sonicConfig.lotteryContract
    );
    
    await sonicVRFConsumer.deployed();
    console.log(`✅ SonicVRFConsumer deployed to: ${sonicVRFConsumer.address}`);
    
    // Update ArbitrumVRFRequester with the SonicVRFConsumer address
    console.log("\n🔄 Updating ArbitrumVRFRequester with SonicVRFConsumer address...");
    const updateTx = await arbitrumVRFRequester.updateSonicVRFConsumer(sonicVRFConsumer.address);
    await updateTx.wait();
    console.log("✅ Update complete!");
    
    // Update callback gas limit if it's different from the default
    if (arbitrumConfig.callbackGasLimit !== 500000) {
      console.log(`\n🔄 Updating callback gas limit to ${arbitrumConfig.callbackGasLimit}...`);
      const updateGasLimitTx = await arbitrumVRFRequester.updateCallbackGasLimit(arbitrumConfig.callbackGasLimit);
      await updateGasLimitTx.wait();
      console.log("✅ Callback gas limit updated!");
    }
    
    // Register on Sonic FeeM system
    console.log("\n🔄 Registering contracts with Sonic FeeM...");
    try {
      const registerTx1 = await arbitrumVRFRequester.registerMe();
      await registerTx1.wait();
      console.log("✅ ArbitrumVRFRequester registered with FeeM");
    } catch (error) {
      console.log("⚠️ ArbitrumVRFRequester FeeM registration failed:", error.message);
    }
    
    try {
      const registerTx2 = await sonicVRFConsumer.registerMe();
      await registerTx2.wait();
      console.log("✅ SonicVRFConsumer registered with FeeM");
    } catch (error) {
      console.log("⚠️ SonicVRFConsumer FeeM registration failed:", error.message);
    }
    
    console.log("\n✅ DEPLOYMENT COMPLETED SUCCESSFULLY!");
    console.log("\n⚠️ NEXT STEPS:");
    console.log("1. Fund the Chainlink VRF subscription");
    console.log(`   Visit: https://vrf.chain.link/arbitrum/${subscriptionId.toString()}`);
    console.log("2. Add ArbitrumVRFRequester as a consumer to your Chainlink VRF subscription");
    console.log(`   Consumer Address: ${arbitrumVRFRequester.address}`);
    console.log("3. Fund both contracts with native tokens for cross-chain fees");
    console.log(`   npx hardhat run scripts/fund-vrf-contracts.js --network arbitrum 0.5`);
    console.log(`   npx hardhat run scripts/fund-vrf-contracts.js --network sonic 10`);
    console.log("4. Update the lottery contract to use the SonicVRFConsumer");
    console.log(`   Lottery Contract: ${sonicConfig.lotteryContract}`);
    console.log(`   SonicVRFConsumer: ${sonicVRFConsumer.address}`);
    console.log("5. Run verification script to verify contracts on block explorers");
    
    // Save deployed addresses to a file for reference and also update the deployment.env file
    saveDeployment(arbitrumVRFRequester.address, sonicVRFConsumer.address, deployer.address);
    updateEnvFile(arbitrumVRFRequester.address, sonicVRFConsumer.address);
    
    // Return the deployed contract addresses
    return {
      arbitrumVRFRequester: arbitrumVRFRequester.address,
      sonicVRFConsumer: sonicVRFConsumer.address
    };
  } catch (error) {
    console.error("❌ DEPLOYMENT FAILED:", error);
    throw error;
  }
}

/**
 * @notice Validate configuration parameters
 * @param arbitrumConfig Configuration for Arbitrum deployment
 * @param sonicConfig Configuration for Sonic deployment
 */
function validateConfig(arbitrumConfig, sonicConfig) {
  // Check required parameters
  if (!arbitrumConfig.vrfCoordinator) {
    throw new Error("VRF_COORDINATOR_ARBITRUM is required in deployment.env");
  }
  
  if (!arbitrumConfig.lzEndpoint) {
    throw new Error("ARBITRUM_LZ_ENDPOINT is required in deployment.env");
  }
  
  if (!arbitrumConfig.keyHash) {
    throw new Error("VRF_KEY_HASH is required in deployment.env");
  }
  
  if (!arbitrumConfig.subscriptionId) {
    throw new Error("VRF_SUBSCRIPTION_ID is required in deployment.env");
  }
  
  if (!sonicConfig.lzEndpoint) {
    throw new Error("SONIC_LZ_ENDPOINT is required in deployment.env");
  }
  
  if (!sonicConfig.lotteryContract) {
    throw new Error("LOTTERY_CONTRACT is required in deployment.env");
  }
  
  // Validate chain IDs are within uint16 range
  if (arbitrumConfig.sonicChainId > 65535) {
    throw new Error(`Sonic chain ID (${arbitrumConfig.sonicChainId}) exceeds uint16 maximum value.`);
  }
  
  if (sonicConfig.arbitrumChainId > 65535) {
    throw new Error(`Arbitrum chain ID (${sonicConfig.arbitrumChainId}) exceeds uint16 maximum value.`);
  }
}

/**
 * @notice Save deployment information to a JSON file
 * @param arbitrumVRFRequesterAddress Address of the ArbitrumVRFRequester contract
 * @param sonicVRFConsumerAddress Address of the SonicVRFConsumer contract
 * @param deployerAddress Address of the deployer
 */
function saveDeployment(arbitrumVRFRequesterAddress, sonicVRFConsumerAddress, deployerAddress) {
  const fs = require('fs');
  const path = require('path');
  const deploymentInfo = {
    arbitrumVRFRequester: arbitrumVRFRequesterAddress,
    sonicVRFConsumer: sonicVRFConsumerAddress,
    deployTime: new Date().toISOString(),
    deployer: deployerAddress
  };
  
  // Create deployment directory if it doesn't exist
  const deployDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
  }
  
  // Save deployment info with timestamp
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
  const network = hre.network.name;
  const filename = `vrf-deployment-${network}-${timestamp}.json`;
  
  fs.writeFileSync(
    path.join(deployDir, filename),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  // Also save to a fixed filename for easy reference
  fs.writeFileSync(
    path.join(deployDir, `vrf-deployment-${network}-latest.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log(`\n📝 Deployment information saved to deployments/${filename}`);
}

/**
 * @notice Update the deployment.env file with deployed contract addresses
 * @param arbitrumVRFRequesterAddress Address of the ArbitrumVRFRequester contract
 * @param sonicVRFConsumerAddress Address of the SonicVRFConsumer contract
 */
function updateEnvFile(arbitrumVRFRequesterAddress, sonicVRFConsumerAddress) {
  try {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '../deployment.env');
    
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      // Update or add the contract addresses
      if (envContent.includes('ARBITRUM_VRF_REQUESTER=')) {
        envContent = envContent.replace(/ARBITRUM_VRF_REQUESTER=.*/g, `ARBITRUM_VRF_REQUESTER=${arbitrumVRFRequesterAddress}`);
      } else {
        envContent += `\nARBITRUM_VRF_REQUESTER=${arbitrumVRFRequesterAddress}`;
      }
      
      if (envContent.includes('SONIC_VRF_CONSUMER=')) {
        envContent = envContent.replace(/SONIC_VRF_CONSUMER=.*/g, `SONIC_VRF_CONSUMER=${sonicVRFConsumerAddress}`);
      } else {
        envContent += `\nSONIC_VRF_CONSUMER=${sonicVRFConsumerAddress}`;
      }
      
      fs.writeFileSync(envPath, envContent);
      console.log(`📝 Updated deployment.env with contract addresses`);
    }
  } catch (error) {
    console.log(`⚠️ Could not update deployment.env: ${error.message}`);
  }
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 