// Deployment script for SonicVRFConsumer
const { ethers, network } = require("hardhat");
require('dotenv').config({ path: "./deployment.env" });

async function main() {
  console.log("Deploying SonicVRFConsumer contract...");

  // Get the signer from hardhat network configuration
  const [signer] = await ethers.getSigners();
  console.log(`Using signer address: ${signer.address}`);
  console.log(`Network: ${network.name}`);

  // Get configuration from environment variables
  const LZ_ENDPOINT = process.env.SONIC_LZ_ENDPOINT;
  const ARBITRUM_CHAIN_ID = parseInt(process.env.ARBITRUM_CHAIN_ID || "110");
  const ARBITRUM_VRF_REQUESTER = process.env.VRF_REQUESTER_ARBITRUM;
  
  // Temporary placeholder for lottery contract - can be updated later
  const LOTTERY_CONTRACT = signer.address;

  console.log(`LayerZero Endpoint: ${LZ_ENDPOINT}`);
  console.log(`Arbitrum Chain ID: ${ARBITRUM_CHAIN_ID}`);
  console.log(`Arbitrum VRF Requester: ${ARBITRUM_VRF_REQUESTER}`);
  console.log(`Temporary Lottery Contract: ${LOTTERY_CONTRACT}`);

  // Deploy the SonicVRFConsumer contract
  const SonicVRFConsumer = await ethers.getContractFactory("contracts/legacy/SonicVRFConsumer.sol:SonicVRFConsumer");
  const sonicVRFConsumer = await SonicVRFConsumer.deploy(
    LZ_ENDPOINT,
    ARBITRUM_CHAIN_ID,
    ARBITRUM_VRF_REQUESTER,
    LOTTERY_CONTRACT
  );
  
  await sonicVRFConsumer.deployed();
  const sonicVRFConsumerAddress = sonicVRFConsumer.address;
  console.log(`SonicVRFConsumer deployed to: ${sonicVRFConsumerAddress}`);

  // Save the deployed contract address
  console.log("\nPlease update your deployment.env with:");
  console.log(`VRF_CONSUMER_SONIC=${sonicVRFConsumerAddress}`);
  
  // If you have a contract-addresses.json file, you could update it here too
  
  console.log("\nDeployment completed successfully!");
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 