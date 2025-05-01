// SPDX-License-Identifier: MIT
/**
 * @title LayerZero Read Setup for SonicVRFConsumer
 * @notice This script sets up LayerZero Read functionality for the SonicVRFConsumer
 * using OAppRead instead of the legacy implementation
 */

const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: "./deployment.env" });

// Configuration constants
const READ_CHANNEL_ID = 5; 
const READ_LIB_ID = "ReadLib1002"; // Read library version

// DVN configuration data
const DVN_CONFIG = [
  {
    name: "Harmony",
    address: process.env.HARMONY_DVN || "0xDEADBEEF0123456789ABCDEF0123456789ABCDEF" // Replace with actual value
  },
  {
    name: "Axelar",
    address: process.env.AXELAR_DVN || "0xDEADBEEF0123456789ABCDEF0123456789ABCDEF" // Replace with actual value
  },
  {
    name: "Layerzero",
    address: process.env.LAYERZERO_DVN || "0xDEADBEEF0123456789ABCDEF0123456789ABCDEF" // Replace with actual value
  }
];

// Thresholds for DVN consensus
const THRESHOLD_START = 1; // Minimum DVNs needed
const THRESHOLD_END = 3;   // Maximum DVNs considered

async function main() {
  console.log("\n🌈 SETTING UP LAYERZERO READ FOR CROSS-CHAIN VRF 🌈\n");
  
  // Get the signer
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  console.log(`Account balance: ${ethers.utils.formatEther(await deployer.getBalance())} ETH`);

  // Setup config directory and paths
  const configDir = path.join(__dirname, "../../deployments");
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  const contractAddressesPath = path.join(configDir, "contract-addresses.json");
  
  // Initialize contract addresses or load existing
  let contractAddresses = {};
  if (fs.existsSync(contractAddressesPath)) {
    contractAddresses = JSON.parse(fs.readFileSync(contractAddressesPath, "utf8"));
  }

  // Check if SonicVRFConsumer is deployed
  if (!contractAddresses.sonicVRFConsumer) {
    console.error("Error: SonicVRFConsumer not found in contract addresses");
    console.error("Please deploy the contract first using deploy_sonic_vrf.js");
    process.exit(1);
  }

  console.log(`SonicVRFConsumer found at: ${contractAddresses.sonicVRFConsumer}`);

  // Get LayerZero endpoint address
  const lzEndpointAddress = process.env.SONIC_LZ_ENDPOINT;
  if (!lzEndpointAddress) {
    console.error("Error: SONIC_LZ_ENDPOINT not found in environment variables");
    process.exit(1);
  }
  console.log(`Using LayerZero endpoint: ${lzEndpointAddress}`);

  // Connect to SonicVRFConsumer
  console.log("\n=== CONNECTING TO SONIC VRF CONSUMER ===\n");
  const sonicVRFConsumer = await ethers.getContractAt(
    "SonicVRFConsumer",
    contractAddresses.sonicVRFConsumer
  );

  // Connect to SonicVRFConsumerOAppRead (assuming it's already deployed)
  const sonicVRFConsumerReadAddress = contractAddresses.sonicVRFConsumerRead || process.env.VRF_CONSUMER_READ;
  if (!sonicVRFConsumerReadAddress) {
    console.error("Error: SonicVRFConsumerRead contract address not found");
    console.error("Please deploy the OAppRead contract first or set VRF_CONSUMER_READ in deployment.env");
    process.exit(1);
  }
  
  console.log(`SonicVRFConsumerRead found at: ${sonicVRFConsumerReadAddress}`);
  const sonicVRFConsumerRead = await ethers.getContractAt(
    "SonicVRFConsumerRead",
    sonicVRFConsumerReadAddress
  );

  // Get endpoint contract
  console.log("\n=== CONNECTING TO LAYERZERO ENDPOINT ===\n");
  const endpoint = await ethers.getContractAt("ILayerZeroEndpointV2", lzEndpointAddress);

  // Step 1: Set OAppRead channel
  console.log("\n=== ACTIVATING READ CHANNEL ===\n");
  let tx = await sonicVRFConsumerRead.setReadChannel(READ_CHANNEL_ID, true);
  let receipt = await tx.wait();
  console.log(`Read channel ${READ_CHANNEL_ID} activated. Tx hash: ${receipt.transactionHash}`);

  // Step 2: Configure DVNs
  console.log("\n=== CONFIGURING DVNS FOR READ CHANNEL ===\n");
  
  // Get all DVN addresses
  const dvnAddresses = DVN_CONFIG.map(dvn => dvn.address);
  
  // Configure DVNs for the Read channel
  console.log(`Configuring DVNs: ${dvnAddresses.join(', ')}`);
  console.log(`With thresholds: start=${THRESHOLD_START}, end=${THRESHOLD_END}`);
  
  // Setup configurator parameters
  const configParams = {
    dvns: dvnAddresses,
    thresholdStart: THRESHOLD_START,
    thresholdEnd: THRESHOLD_END
  };
  
  // Configure DVNs - the implementation might vary based on your actual contract
  tx = await sonicVRFConsumerRead.configureDVNs(
    READ_CHANNEL_ID, 
    configParams.dvns, 
    configParams.thresholdStart, 
    configParams.thresholdEnd
  );
  receipt = await tx.wait();
  console.log(`DVNs configured for read channel ${READ_CHANNEL_ID}. Tx hash: ${receipt.transactionHash}`);

  // Display next steps
  console.log("\n=== SETUP COMPLETE ===\n");
  console.log("Next steps:");
  console.log("1. Fund the contract with ETH to pay for LayerZero fees");
  console.log(`   Send ETH to: ${sonicVRFConsumerReadAddress}`);
  console.log("2. Query the VRF state from Arbitrum:");
  console.log(`   await sonicVRFConsumerRead.queryArbitrumVRFState("0x")`);
  console.log("3. Check the results after a few seconds:");
  console.log(`   const subscriptionId = await sonicVRFConsumerRead.lastQueriedSubscriptionId()`);
  console.log(`   const keyHash = await sonicVRFConsumerRead.lastQueriedKeyHash()`);
  console.log(`   const confirmations = await sonicVRFConsumerRead.lastQueriedConfirmations()`);
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });