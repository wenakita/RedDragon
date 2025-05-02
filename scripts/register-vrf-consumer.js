// Script to register ArbitrumVRFRequester as a consumer in Chainlink VRF subscription
const { ethers } = require("hardhat");
require('dotenv').config({ path: "./deployment.env" });

/**
 * @notice Register ArbitrumVRFRequester as a consumer in Chainlink VRF subscription
 * This script adds the deployed ArbitrumVRFRequester contract as a consumer
 * in the Chainlink VRF subscription on Arbitrum
 */
async function main() {
  console.log("\n=================================================");
  console.log("     🔗 REGISTERING VRF CONSUMER CONTRACT 🔗");
  console.log("=================================================");
  console.log("Adding ArbitrumVRFRequester to VRF subscription on Arbitrum");
  console.log("=================================================\n");

  // Get the provider and signer
  const [signer] = await ethers.getSigners();
  console.log(`Using account: ${signer.address}`);
  console.log(`Account balance: ${ethers.utils.formatEther(await signer.getBalance())} ETH\n`);

  // Check network
  const network = hre.network.name;
  if (!network.includes("arbitrum")) {
    console.error("❌ This script must be run on the Arbitrum network.");
    console.error("Please use --network arbitrum when running this script.");
    process.exit(1);
  }

  // Load configuration
  const vrfCoordinatorAddress = process.env.VRF_COORDINATOR_ARBITRUM;
  const subscriptionId = process.env.VRF_SUBSCRIPTION_ID;

  if (!vrfCoordinatorAddress || !subscriptionId) {
    console.error("❌ Missing VRF configuration in deployment.env. Please update your configuration.");
    process.exit(1);
  }

  // Get deployed ArbitrumVRFRequester address
  let arbitrumVRFRequesterAddress = process.env.ARBITRUM_VRF_REQUESTER;
  if (!arbitrumVRFRequesterAddress) {
    // Try to load from deployment files
    try {
      const fs = require('fs');
      const path = require('path');
      const deploymentPath = path.join(__dirname, '../deployments', `vrf-deployment-${network}-latest.json`);
      if (fs.existsSync(deploymentPath)) {
        const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
        arbitrumVRFRequesterAddress = deploymentData.arbitrumVRFRequester;
      }
    } catch (error) {
      console.log("⚠️ Could not load ArbitrumVRFRequester address from deployment files.");
    }
  }

  if (!arbitrumVRFRequesterAddress) {
    console.error("❌ ArbitrumVRFRequester address not found.");
    console.error("Please deploy the contract first or specify the address in deployment.env.");
    process.exit(1);
  }

  console.log("🔍 Configuration:");
  console.log(`VRF Coordinator: ${vrfCoordinatorAddress}`);
  console.log(`Subscription ID: ${subscriptionId}`);
  console.log(`ArbitrumVRFRequester: ${arbitrumVRFRequesterAddress}\n`);

  // Create VRF Coordinator interface
  const VRFCoordinatorV2 = [
    "function getSubscription(uint64 subId) view returns (uint96 balance, uint64 reqCount, address owner, address[] consumers)",
    "function addConsumer(uint64 subId, address consumer) external",
    "function removeConsumer(uint64 subId, address consumer) external"
  ];

  try {
    // Connect to VRF Coordinator
    console.log("📡 Connecting to VRF Coordinator...");
    const vrfCoordinator = new ethers.Contract(vrfCoordinatorAddress, VRFCoordinatorV2, signer);

    // Convert subscription ID
    let subId;
    try {
      subId = ethers.BigNumber.from(subscriptionId);
    } catch (error) {
      console.error(`❌ Error converting subscription ID: ${error.message}`);
      console.error(`Make sure your subscription ID is a valid number: ${subscriptionId}`);
      process.exit(1);
    }

    // Check if consumer is already registered
    console.log("🔍 Checking if consumer is already registered...");
    const subscription = await vrfCoordinator.getSubscription(subId);
    const consumers = subscription.consumers;
    
    const isRegistered = consumers.some(
      consumer => consumer.toLowerCase() === arbitrumVRFRequesterAddress.toLowerCase()
    );
    
    if (isRegistered) {
      console.log("✅ Consumer is already registered with this subscription.");
      return;
    }
    
    // Register consumer
    console.log("🔄 Registering consumer...");
    const tx = await vrfCoordinator.addConsumer(subId, arbitrumVRFRequesterAddress);
    console.log(`⏳ Transaction sent: ${tx.hash}`);
    
    console.log("⏳ Waiting for transaction confirmation...");
    await tx.wait();
    console.log("✅ Consumer registered successfully!");
    
    // Verify registration
    console.log("🔍 Verifying registration...");
    const updatedSubscription = await vrfCoordinator.getSubscription(subId);
    const updatedConsumers = updatedSubscription.consumers;
    
    const isNowRegistered = updatedConsumers.some(
      consumer => consumer.toLowerCase() === arbitrumVRFRequesterAddress.toLowerCase()
    );
    
    if (isNowRegistered) {
      console.log("✅ Consumer registration verified!");
      console.log("\n🎉 ArbitrumVRFRequester is now registered as a consumer!");
      console.log(`You can view your subscription at: https://vrf.chain.link/arbitrum/${subId.toString()}\n`);
    } else {
      console.log("⚠️ Consumer registration could not be verified. Please check manually.");
    }
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
    
    if (error.message.includes("sender is not owner")) {
      console.log("\n⚠️ You are not the owner of this subscription. Only the subscription owner can add consumers.");
      console.log("Please use the Chainlink VRF UI to add the consumer:");
      console.log(`https://vrf.chain.link/arbitrum/${subscriptionId}`);
    }
    
    process.exit(1);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script execution failed:", error);
    process.exit(1);
  }); 