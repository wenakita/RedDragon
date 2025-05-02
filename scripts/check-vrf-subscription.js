// Script to check Chainlink VRF subscription status and configuration
const { ethers } = require("hardhat");
require('dotenv').config({ path: "./deployment.env" });

/**
 * @notice Check Chainlink VRF subscription status
 * This script verifies the Chainlink VRF subscription status on Arbitrum,
 * checks if our ArbitrumVRFRequester is registered as a consumer,
 * and displays the current subscription configuration
 */
async function main() {
  console.log("\n=================================================");
  console.log("    🔍 CHECKING CHAINLINK VRF SUBSCRIPTION 🔍");
  console.log("=================================================");
  console.log("Verifying VRF subscription status on Arbitrum");
  console.log("=================================================\n");

  // Get the provider and signer
  const [signer] = await ethers.getSigners();
  console.log(`Using account: ${signer.address}`);
  console.log(`Account balance: ${ethers.utils.formatEther(await signer.getBalance())} ETH\n`);

  // Load configuration
  const vrfCoordinatorAddress = process.env.VRF_COORDINATOR_ARBITRUM;
  const subscriptionId = process.env.VRF_SUBSCRIPTION_ID;
  const linkTokenAddress = process.env.LINK_TOKEN_ARBITRUM;

  if (!vrfCoordinatorAddress || !subscriptionId || !linkTokenAddress) {
    console.error("❌ Missing VRF configuration in deployment.env. Please update your configuration.");
    process.exit(1);
  }

  console.log("🔍 VRF Configuration:");
  console.log(`VRF Coordinator: ${vrfCoordinatorAddress}`);
  console.log(`Subscription ID: ${subscriptionId}`);
  console.log(`LINK Token: ${linkTokenAddress}\n`);

  // Get deployed ArbitrumVRFRequester address
  let arbitrumVRFRequesterAddress = process.env.ARBITRUM_VRF_REQUESTER;
  if (!arbitrumVRFRequesterAddress) {
    // Try to load from deployment files
    try {
      const fs = require('fs');
      const path = require('path');
      const network = hre.network.name;
      const deploymentPath = path.join(__dirname, '../deployments', `vrf-deployment-${network}-latest.json`);
      if (fs.existsSync(deploymentPath)) {
        const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
        arbitrumVRFRequesterAddress = deploymentData.arbitrumVRFRequester;
      }
    } catch (error) {
      console.log("⚠️ Could not load ArbitrumVRFRequester address from deployment files.");
    }
  }

  console.log(`ArbitrumVRFRequester: ${arbitrumVRFRequesterAddress || "Not deployed/specified"}\n`);

  // Create VRF Coordinator interface
  const VRFCoordinatorV2 = [
    "function getSubscription(uint64 subId) view returns (uint96 balance, uint64 reqCount, address owner, address[] consumers)",
    "function pendingRequestExists(uint64 subId) view returns (bool)"
  ];
  
  const LinkToken = [
    "function balanceOf(address owner) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)"
  ];

  try {
    // Connect to VRF Coordinator
    const vrfCoordinator = new ethers.Contract(vrfCoordinatorAddress, VRFCoordinatorV2, signer);
    const linkToken = new ethers.Contract(linkTokenAddress, LinkToken, signer);

    // Check subscription status
    console.log("📡 Fetching subscription details...");
    const subscription = await vrfCoordinator.getSubscription(subscriptionId);
    
    // Parse subscription data
    const linkBalance = ethers.utils.formatEther(subscription.balance);
    const requestCount = subscription.reqCount.toString();
    const ownerAddress = subscription.owner;
    const consumers = subscription.consumers;
    
    console.log("\n✅ Subscription Details:");
    console.log(`LINK Balance: ${linkBalance} LINK`);
    console.log(`Request Count: ${requestCount}`);
    console.log(`Owner: ${ownerAddress}`);
    console.log(`Number of Consumers: ${consumers.length}\n`);
    
    // List all consumers
    console.log("📋 Registered Consumers:");
    for (let i = 0; i < consumers.length; i++) {
      console.log(`${i+1}. ${consumers[i]}`);
    }
    
    // Check if our contract is registered
    if (arbitrumVRFRequesterAddress) {
      const isRegistered = consumers.some(
        consumer => consumer.toLowerCase() === arbitrumVRFRequesterAddress.toLowerCase()
      );
      
      if (isRegistered) {
        console.log(`\n✅ ArbitrumVRFRequester is registered as a consumer`);
      } else {
        console.log(`\n❌ ArbitrumVRFRequester is NOT registered as a consumer!`);
        console.log(`You need to add ${arbitrumVRFRequesterAddress} as a consumer to subscription ${subscriptionId}`);
      }
    }
    
    // Check for pending requests
    const hasPendingRequests = await vrfCoordinator.pendingRequestExists(subscriptionId);
    if (hasPendingRequests) {
      console.log(`\n⚠️ Subscription has pending requests!`);
    } else {
      console.log(`\n✅ No pending requests`);
    }

    // Check LINK balance of subscription owner
    const ownerLinkBalance = await linkToken.balanceOf(ownerAddress);
    console.log(`\n💰 Owner LINK Balance: ${ethers.utils.formatEther(ownerLinkBalance)} LINK`);

    // Recommendation section
    console.log("\n🔍 RECOMMENDATIONS:");
    
    // Check if LINK balance is low
    if (parseFloat(linkBalance) < 1.0) {
      console.log("⚠️ LINK balance is low! Consider funding the subscription with more LINK.");
    } else {
      console.log("✅ LINK balance is sufficient.");
    }
    
    // Check if our contract is not registered
    if (arbitrumVRFRequesterAddress && !consumers.some(
      consumer => consumer.toLowerCase() === arbitrumVRFRequesterAddress.toLowerCase()
    )) {
      console.log("⚠️ Your VRF consumer contract is not registered! Add it as a consumer.");
    }
    
    console.log("\n📝 Next Steps:");
    if (parseFloat(linkBalance) < 1.0) {
      console.log("1. Fund your subscription with more LINK tokens");
    }
    if (arbitrumVRFRequesterAddress && !consumers.some(
      consumer => consumer.toLowerCase() === arbitrumVRFRequesterAddress.toLowerCase()
    )) {
      console.log("2. Register your ArbitrumVRFRequester as a consumer using the Chainlink VRF UI");
      console.log(`   at https://vrf.chain.link/arbitrum/${subscriptionId}`);
    }
    
  } catch (error) {
    console.error("❌ Error checking subscription status:", error);
    
    if (error.message.includes("call revert exception")) {
      console.log("\n⚠️ The subscription might not exist or you might not have access to view it.");
      console.log("Please verify the subscription ID and make sure you're connected to the correct network.");
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