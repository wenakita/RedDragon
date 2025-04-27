// Deployment script for the cross-chain VRF solution
const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying cross-chain VRF contracts...");

  // Configuration for Arbitrum deployment
  const ARBITRUM_CONFIG = {
    vrfCoordinator: "0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e",
    subscriptionId: "65914062761074472397678945586748169687979388122746586980459153805795126649565",
    keyHash: "0x8472ba59cf7134dfe321f4d61a430c4857e8b19cdd5230b09952a92671c24409", // 30 gwei key hash
    linkToken: "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4",
    layerZeroEndpoint: "0x3c2269811836af69497E5F486A85D7316753cf62", // Replace with actual Arbitrum LZ endpoint
    sonicChainId: 0, // Replace with the actual Sonic chain ID in LayerZero
  };

  // Configuration for Sonic deployment
  const SONIC_CONFIG = {
    layerZeroEndpoint: "0xB4e1Ff7882474BB93042be9AD5E1fA387949B860", // From the CCIP info
    arbitrumChainId: 0, // Replace with the actual Arbitrum chain ID in LayerZero
    wrappedSonic: "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38", // From the CCIP info
    dragonToken: "", // Replace with the actual Dragon token address
  };

  // Get the contract factories
  const ArbitrumVRFRequester = await ethers.getContractFactory("ArbitrumVRFRequester");
  const SonicVRFConsumer = await ethers.getContractFactory("SonicVRFConsumer");

  console.log("Deploying to Arbitrum...");
  
  // For local testing, we'll use placeholder addresses
  const sonicVRFConsumer = { address: ethers.ZeroAddress };

  // Deploy ArbitrumVRFRequester
  const arbitrumVRFRequester = await ArbitrumVRFRequester.deploy(
    ARBITRUM_CONFIG.vrfCoordinator,
    ARBITRUM_CONFIG.subscriptionId,
    ARBITRUM_CONFIG.keyHash,
    ARBITRUM_CONFIG.layerZeroEndpoint,
    ARBITRUM_CONFIG.sonicChainId,
    sonicVRFConsumer.address // This will be replaced after Sonic deployment
  );
  await arbitrumVRFRequester.waitForDeployment();
  const arbitrumVRFRequesterAddress = await arbitrumVRFRequester.getAddress();
  console.log(`ArbitrumVRFRequester deployed to: ${arbitrumVRFRequesterAddress}`);

  console.log("Deploying to Sonic...");
  
  // Deploy SonicVRFConsumer
  const sonicVRFConsumerActual = await SonicVRFConsumer.deploy(
    SONIC_CONFIG.layerZeroEndpoint,
    SONIC_CONFIG.arbitrumChainId,
    arbitrumVRFRequesterAddress,
    SONIC_CONFIG.wrappedSonic,
    SONIC_CONFIG.dragonToken
  );
  await sonicVRFConsumerActual.waitForDeployment();
  const sonicVRFConsumerAddress = await sonicVRFConsumerActual.getAddress();
  console.log(`SonicVRFConsumer deployed to: ${sonicVRFConsumerAddress}`);

  console.log("Updating ArbitrumVRFRequester with Sonic consumer address...");
  // Update ArbitrumVRFRequester with the correct Sonic consumer address
  await arbitrumVRFRequester.setSonicVRFConsumer(sonicVRFConsumerAddress);
  console.log("Cross-chain VRF setup complete!");

  console.log("------------------------------");
  console.log("Deployment Summary:");
  console.log(`ArbitrumVRFRequester: ${arbitrumVRFRequesterAddress}`);
  console.log(`SonicVRFConsumer: ${sonicVRFConsumerAddress}`);
  console.log("------------------------------");
  console.log("Next steps:");
  console.log("1. Fund the Chainlink VRF subscription on Arbitrum");
  console.log("2. Fund both contracts with ETH for LayerZero fees");
  console.log("3. Update the Dragon token contract to call SonicVRFConsumer.onSwapWSToDragon when swaps occur");
  console.log("4. Add DRAGON tokens to the jackpot");
  console.log("------------------------------");
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 