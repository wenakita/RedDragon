// Script to test the VRF system functionality
const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: "./deployment.env" });

/**
 * @notice Test the VRF system by simulating a randomness request
 * This script tests the cross-chain VRF system by calling requestRandomness
 * on the SonicVRFConsumer contract and tracking the request through the system
 */
async function main() {
  console.log("\n=================================================");
  console.log("      🐉 TESTING SONIC VRF SYSTEM 🐉");
  console.log("=================================================");
  console.log("Verifying cross-chain randomness functionality");
  console.log("=================================================\n");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Testing from account: ${deployer.address}`);
  console.log(`Account balance: ${ethers.utils.formatEther(await deployer.getBalance())} ETH\n`);

  // Get network name
  const network = hre.network.name;
  console.log(`Network: ${network}`);

  // This test must run on Sonic network
  if (!network.includes("sonic")) {
    console.error("❌ This test must be run on the Sonic network.");
    console.error("Please use --network sonic when running this script.");
    process.exit(1);
  }

  // Load deployed contract addresses
  const deployedAddresses = loadDeployedAddresses(network);
  if (!deployedAddresses) {
    console.error("❌ Could not load deployed contract addresses. Please run deploy-vrf-basic.js first.");
    process.exit(1);
  }

  try {
    // Create a mock lottery contract to test the VRF system
    console.log("\n🚀 Creating a mock lottery contract for testing...");
    const mockLotteryFactory = await ethers.getContractFactory("MockLotteryContract");
    const mockLottery = await mockLotteryFactory.deploy(deployedAddresses.sonicVRFConsumer);
    await mockLottery.deployed();
    console.log(`✅ Mock lottery contract deployed at: ${mockLottery.address}`);

    // Configure SonicVRFConsumer to use our mock lottery contract
    console.log("\n🔄 Updating SonicVRFConsumer to use our mock lottery contract...");
    const sonicVRFConsumer = await ethers.getContractAt(
      "SonicVRFConsumer",
      deployedAddresses.sonicVRFConsumer
    );
    
    // Store original lottery contract address to restore later
    const originalLotteryContract = await sonicVRFConsumer.lotteryContract();
    
    // Update lottery contract address
    const updateTx = await sonicVRFConsumer.updateLotteryContract(mockLottery.address);
    await updateTx.wait();
    console.log(`✅ SonicVRFConsumer updated to use mock lottery at: ${mockLottery.address}`);

    // Test VRF system with mock lottery
    console.log("\n🧪 Testing VRF system...");
    const testAddress = deployer.address;
    
    // Listen for events from the mock lottery contract
    console.log("📡 Setting up event listeners...");
    
    mockLottery.on("RandomnessRequested", (requestId, user) => {
      console.log(`📨 Randomness requested - ID: ${requestId}, User: ${user}`);
    });
    
    mockLottery.on("RandomnessReceived", (requestId, user, randomness) => {
      console.log(`✅ Randomness received - ID: ${requestId}, User: ${user}`);
      console.log(`🎲 Random Number: ${randomness}`);
      console.log(`\n=================================================`);
      console.log(`              TEST SUCCESSFUL!`);
      console.log(`=================================================\n`);
    });
    
    // Check if SonicVRFConsumer has enough balance for LayerZero fees
    const balance = await ethers.provider.getBalance(deployedAddresses.sonicVRFConsumer);
    console.log(`💰 SonicVRFConsumer balance: ${ethers.utils.formatEther(balance)} SONIC`);
    
    if (balance.lt(ethers.utils.parseEther("0.1"))) {
      console.log("⚠️ SonicVRFConsumer balance is low. Sending 1 SONIC...");
      const fundTx = await deployer.sendTransaction({
        to: deployedAddresses.sonicVRFConsumer,
        value: ethers.utils.parseEther("1")
      });
      await fundTx.wait();
      console.log("✅ Funded SonicVRFConsumer with 1 SONIC");
    }
    
    // Execute the test
    console.log(`🚀 Requesting randomness for address: ${testAddress}`);
    const requestTx = await mockLottery.requestRandomness(testAddress);
    await requestTx.wait();
    console.log("✅ Test request sent!");
    
    // Wait for the cross-chain process
    console.log("\n⏳ Waiting for cross-chain randomness...");
    console.log("This may take a few minutes as the request needs to cross chains.");
    console.log("Press Ctrl+C to exit if you want to check block explorers manually.\n");
    
    // Keep script running to catch events
    await new Promise(resolve => setTimeout(resolve, 600000)); // 10 minute timeout
    
    // Restore original lottery contract
    console.log("\n🔄 Restoring original lottery contract...");
    const restoreTx = await sonicVRFConsumer.updateLotteryContract(originalLotteryContract);
    await restoreTx.wait();
    console.log(`✅ SonicVRFConsumer restored to use original lottery at: ${originalLotteryContract}`);
    
    console.log("\n⚠️ Test timeout reached. No randomness received within timeout period.");
    console.log("This could be due to:");
    console.log("1. LayerZero message delays");
    console.log("2. Chainlink VRF subscription issues");
    console.log("3. Insufficient funds for cross-chain fees");
    console.log("\nCheck the contract states directly on block explorers to debug further.");
    
  } catch (error) {
    console.error("❌ TEST FAILED:", error);
    
    // Try to restore the original lottery contract if possible
    try {
      const sonicVRFConsumer = await ethers.getContractAt(
        "SonicVRFConsumer",
        deployedAddresses.sonicVRFConsumer
      );
      const originalLotteryContract = process.env.LOTTERY_CONTRACT;
      if (originalLotteryContract) {
        console.log("\n🔄 Attempting to restore original lottery contract...");
        await sonicVRFConsumer.updateLotteryContract(originalLotteryContract);
        console.log("✅ Original lottery contract restored.");
      }
    } catch (restoreError) {
      console.error("Failed to restore original lottery contract:", restoreError.message);
    }
    
    process.exit(1);
  }
}

/**
 * @notice Load deployed contract addresses from the deployment file
 * @param network The network name
 * @return The deployed contract addresses or null if not found
 */
function loadDeployedAddresses(network) {
  try {
    // Try to load the latest deployment file
    const deploymentPath = path.join(__dirname, '../deployments', `vrf-deployment-${network}-latest.json`);
    if (fs.existsSync(deploymentPath)) {
      const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
      return {
        arbitrumVRFRequester: deploymentData.arbitrumVRFRequester,
        sonicVRFConsumer: deploymentData.sonicVRFConsumer
      };
    }
    
    // If latest file doesn't exist, try to find any deployment file for this network
    const deploymentDir = path.join(__dirname, '../deployments');
    if (fs.existsSync(deploymentDir)) {
      const files = fs.readdirSync(deploymentDir);
      for (const file of files) {
        if (file.startsWith(`vrf-deployment-${network}`) && file.endsWith('.json')) {
          const deploymentData = JSON.parse(fs.readFileSync(path.join(deploymentDir, file), 'utf8'));
          return {
            arbitrumVRFRequester: deploymentData.arbitrumVRFRequester,
            sonicVRFConsumer: deploymentData.sonicVRFConsumer
          };
        }
      }
    }
    
    // Try to load from environment variables as a fallback
    if (process.env.ARBITRUM_VRF_REQUESTER && process.env.SONIC_VRF_CONSUMER) {
      return {
        arbitrumVRFRequester: process.env.ARBITRUM_VRF_REQUESTER,
        sonicVRFConsumer: process.env.SONIC_VRF_CONSUMER
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error loading deployment addresses:", error);
    return null;
  }
}

// Create a mock lottery contract for testing
async function deployMockLotteryContract() {
  const MockLotteryFactory = await ethers.getContractFactory("contracts/test/MockLotteryContract.sol:MockLotteryContract");
  const mockLottery = await MockLotteryFactory.deploy();
  await mockLottery.deployed();
  return mockLottery;
}

// Execute the test script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }); 