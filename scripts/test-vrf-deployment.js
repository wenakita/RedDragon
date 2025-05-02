// Script to test VRF deployment on local Hardhat network
const { ethers } = require("hardhat");
// Remove dotenv import for local testing
// require('dotenv').config({ path: "./deployment.env" });

async function main() {
  console.log("Testing VRF deployment on local network...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  
  try {
    // Deploy a mock LayerZero Endpoint for testing
    console.log("\nDeploying Mock LayerZero Endpoint...");
    const MockEndpoint = await ethers.getContractFactory("MockLayerZeroEndpoint");
    const mockEndpoint = await MockEndpoint.deploy();
    await mockEndpoint.deployed();
    console.log(`Mock LayerZero Endpoint deployed to: ${mockEndpoint.address}`);
    
    // Mock configuration for local testing
    const mockConfig = {
      vrfCoordinator: deployer.address, // Mock VRF Coordinator
      lzEndpoint: mockEndpoint.address, // Mock LZ Endpoint
      sonicChainId: 332, // Sonic chain ID
      arbitrumChainId: 110, // Arbitrum chain ID
      keyHash: "0x8472ba59cf7134dfe321f4d61a430c4857e8b19cdd5230b09952a92671c24409", // Mock key hash
      subscriptionId: 1, // Mock subscription ID
      lotteryContract: deployer.address // Mock lottery contract
    };
    
    console.log("Using mock configuration for local test:");
    console.log(mockConfig);
    
    // Deploy ArbitrumVRFRequester
    console.log("\nDeploying ArbitrumVRFRequester...");
    const ArbitrumVRFRequester = await ethers.getContractFactory("ArbitrumVRFRequester");
    
    // Use a placeholder for SonicVRFConsumer
    const placeholderSonicVRF = "0x0000000000000000000000000000000000000000";
    
    const arbitrumVRFRequester = await ArbitrumVRFRequester.deploy(
      mockConfig.vrfCoordinator,
      mockConfig.lzEndpoint,
      mockConfig.subscriptionId,
      mockConfig.keyHash,
      mockConfig.sonicChainId,
      placeholderSonicVRF
    );
    
    await arbitrumVRFRequester.deployed();
    console.log(`ArbitrumVRFRequester deployed to: ${arbitrumVRFRequester.address}`);
    
    // Deploy SonicVRFConsumer
    console.log("\nDeploying SonicVRFConsumer...");
    const SonicVRFConsumer = await ethers.getContractFactory("SonicVRFConsumer");
    
    const sonicVRFConsumer = await SonicVRFConsumer.deploy(
      mockConfig.lzEndpoint,
      mockConfig.arbitrumChainId,
      arbitrumVRFRequester.address,
      mockConfig.lotteryContract
    );
    
    await sonicVRFConsumer.deployed();
    console.log(`SonicVRFConsumer deployed to: ${sonicVRFConsumer.address}`);
    
    // Update ArbitrumVRFRequester with the SonicVRFConsumer address
    console.log("\nUpdating ArbitrumVRFRequester with SonicVRFConsumer address...");
    await arbitrumVRFRequester.updateSonicVRFConsumer(sonicVRFConsumer.address);
    console.log("Update complete!");
    
    // Verify the configuration
    console.log("\nVerifying configuration...");
    const storedSonicConsumer = await arbitrumVRFRequester.sonicVRFConsumer();
    console.log(`Stored SonicVRFConsumer in ArbitrumVRFRequester: ${storedSonicConsumer}`);
    
    const storedArbitrumRequester = await sonicVRFConsumer.arbitrumVRFRequester();
    console.log(`Stored ArbitrumVRFRequester in SonicVRFConsumer: ${storedArbitrumRequester}`);
    
    console.log("\nTest completed successfully!");
  } catch (error) {
    console.error("Error during deployment test:", error);
    process.exit(1);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 