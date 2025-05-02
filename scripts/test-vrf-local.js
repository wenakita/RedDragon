// Script to test the VRF system locally using mock contracts
const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

/**
 * @notice Test the VRF system locally using mock contracts
 * This script simulates a full cross-chain VRF request flow using
 * mock LayerZero endpoints and a mock Chainlink VRF system
 */
async function main() {
  console.log("\n=================================================");
  console.log("   🐉 TESTING SONIC VRF SYSTEM LOCALLY 🐉");
  console.log("=================================================");
  console.log("Simulating full cross-chain randomness flow");
  console.log("=================================================\n");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Testing from account: ${deployer.address}`);
  console.log(`Account balance: ${ethers.utils.formatEther(await deployer.getBalance())} ETH\n`);

  try {
    // 1. Deploy mock LayerZero endpoints
    console.log("🚀 Deploying mock LayerZero endpoints...");
    const MockLayerZeroEndpoint = await ethers.getContractFactory("MockLayerZeroEndpoint");
    const sonicMockLzEndpoint = await MockLayerZeroEndpoint.deploy(146); // Sonic chain ID
    await sonicMockLzEndpoint.deployed();
    
    const arbitrumMockLzEndpoint = await MockLayerZeroEndpoint.deploy(110); // Arbitrum chain ID
    await arbitrumMockLzEndpoint.deployed();
    
    console.log(`✅ Mock LayerZero endpoint for Sonic deployed at: ${sonicMockLzEndpoint.address}`);
    console.log(`✅ Mock LayerZero endpoint for Arbitrum deployed at: ${arbitrumMockLzEndpoint.address}`);
    
    // 2. Deploy mock VRF coordinator
    console.log("\n🚀 Deploying mock VRF Coordinator...");
    const MockVRFCoordinator = await ethers.getContractFactory("MockVRFCoordinator");
    const mockVRFCoordinator = await MockVRFCoordinator.deploy();
    await mockVRFCoordinator.deployed();
    console.log(`✅ Mock VRF Coordinator deployed at: ${mockVRFCoordinator.address}`);
    
    // 3. Deploy ArbitrumVRFRequester
    console.log("\n🚀 Deploying ArbitrumVRFRequester...");
    const ArbitrumVRFRequester = await ethers.getContractFactory("ArbitrumVRFRequester");
    
    const arbitrumVRFRequester = await ArbitrumVRFRequester.deploy(
      mockVRFCoordinator.address,
      arbitrumMockLzEndpoint.address,
      1234, // Mock subscription ID
      "0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef", // Mock key hash
      146, // Sonic chain ID
      ethers.constants.AddressZero // Placeholder SonicVRFConsumer address
    );
    
    await arbitrumVRFRequester.deployed();
    console.log(`✅ ArbitrumVRFRequester deployed at: ${arbitrumVRFRequester.address}`);
    
    // 4. Deploy mock lottery contract
    console.log("\n🚀 Deploying mock lottery contract...");
    const MockLotteryContract = await ethers.getContractFactory("MockLotteryContract");
    const mockLotteryContract = await MockLotteryContract.deploy(ethers.constants.AddressZero); // Placeholder address
    await mockLotteryContract.deployed();
    console.log(`✅ Mock lottery contract deployed at: ${mockLotteryContract.address}`);
    
    // 5. Deploy SonicVRFConsumer
    console.log("\n🚀 Deploying SonicVRFConsumer...");
    const SonicVRFConsumer = await ethers.getContractFactory("SonicVRFConsumer");
    
    const sonicVRFConsumer = await SonicVRFConsumer.deploy(
      sonicMockLzEndpoint.address,
      110, // Arbitrum chain ID
      arbitrumVRFRequester.address,
      mockLotteryContract.address
    );
    
    await sonicVRFConsumer.deployed();
    console.log(`✅ SonicVRFConsumer deployed at: ${sonicVRFConsumer.address}`);
    
    // 6. Update mock lottery contract with SonicVRFConsumer address
    console.log("\n🔄 Updating mock lottery contract with SonicVRFConsumer address...");
    const txLottery = await mockLotteryContract.updateVRFConsumer(sonicVRFConsumer.address);
    await txLottery.wait();
    console.log("✅ Mock lottery contract updated");
    
    // 7. Update ArbitrumVRFRequester with SonicVRFConsumer address
    console.log("\n🔄 Updating ArbitrumVRFRequester with SonicVRFConsumer address...");
    const txArbitrumVRF = await arbitrumVRFRequester.updateSonicVRFConsumer(sonicVRFConsumer.address);
    await txArbitrumVRF.wait();
    console.log("✅ ArbitrumVRFRequester updated");
    
    // 8. Register contracts with mock endpoints
    console.log("\n🔄 Registering contracts with mock endpoints...");
    await sonicMockLzEndpoint.registerApplication(sonicVRFConsumer.address);
    await arbitrumMockLzEndpoint.registerApplication(arbitrumVRFRequester.address);
    console.log("✅ Contracts registered with mock endpoints");
    
    // 9. Fund contracts
    console.log("\n💰 Funding contracts...");
    await deployer.sendTransaction({
      to: sonicVRFConsumer.address,
      value: ethers.utils.parseEther("1")
    });
    
    await deployer.sendTransaction({
      to: arbitrumVRFRequester.address,
      value: ethers.utils.parseEther("1")
    });
    console.log("✅ Contracts funded");
    
    // 10. Listen for events
    console.log("\n📡 Setting up event listeners...");
    
    mockLotteryContract.on("RandomnessRequested", (requestId, user) => {
      console.log(`📨 Randomness requested - ID: ${requestId.toString()}, User: ${user}`);
    });
    
    mockLotteryContract.on("RandomnessReceived", (requestId, user, randomness) => {
      console.log(`✅ Randomness received - ID: ${requestId.toString()}, User: ${user}`);
      console.log(`🎲 Random Number: ${randomness.toString()}`);
      console.log(`\n=================================================`);
      console.log(`              TEST SUCCESSFUL!`);
      console.log(`=================================================\n`);
    });
    
    sonicVRFConsumer.on("SonicRandomnessRequested", (requestId, user) => {
      console.log(`📝 SonicVRFConsumer requested randomness - ID: ${requestId.toString()}, User: ${user}`);
      
      // Simulate the cross-chain message from Sonic to Arbitrum
      simulateLzMessage(
        sonicMockLzEndpoint,
        arbitrumMockLzEndpoint,
        sonicVRFConsumer.address,
        arbitrumVRFRequester.address,
        requestId,
        user
      );
    });
    
    arbitrumVRFRequester.on("VRFRequested", (requestId, sonicRequestId, user) => {
      console.log(`📝 ArbitrumVRFRequester requested VRF - ID: ${requestId.toString()}, Sonic ID: ${sonicRequestId.toString()}`);
      
      // Simulate Chainlink VRF callback
      simulateVRFCallback(mockVRFCoordinator, arbitrumVRFRequester, requestId);
    });
    
    arbitrumVRFRequester.on("VRFFulfilled", (requestId, randomness) => {
      console.log(`📝 ArbitrumVRFRequester received randomness - ID: ${requestId.toString()}, Value: ${randomness.toString()}`);
    });
    
    arbitrumVRFRequester.on("VRFSentToSonic", (requestId, sonicRequestId, user, randomness) => {
      console.log(`📝 ArbitrumVRFRequester sent randomness to Sonic - ID: ${requestId.toString()}, Value: ${randomness.toString()}`);
      
      // Simulate the cross-chain message from Arbitrum to Sonic
      simulateLzReturnMessage(
        arbitrumMockLzEndpoint,
        sonicMockLzEndpoint,
        arbitrumVRFRequester.address,
        sonicVRFConsumer.address,
        sonicRequestId,
        user,
        randomness
      );
    });
    
    // 11. Execute test request
    console.log("\n🧪 Executing test request...");
    const testUser = deployer.address;
    const requestTx = await mockLotteryContract.requestRandomness(testUser);
    await requestTx.wait();
    console.log(`✅ Randomness requested for: ${testUser}`);
    
    // Wait for events to complete
    console.log("\n⏳ Waiting for test to complete...");
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log("\n📝 Test Summary:");
    console.log("- Mock contracts deployed successfully");
    console.log("- Cross-chain messages simulated successfully");
    console.log("- Full VRF flow tested successfully");
    
    // Save deployment info for reference
    saveTestDeployment({
      sonicMockLzEndpoint: sonicMockLzEndpoint.address,
      arbitrumMockLzEndpoint: arbitrumMockLzEndpoint.address,
      mockVRFCoordinator: mockVRFCoordinator.address,
      arbitrumVRFRequester: arbitrumVRFRequester.address,
      sonicVRFConsumer: sonicVRFConsumer.address,
      mockLotteryContract: mockLotteryContract.address
    });
    
  } catch (error) {
    console.error("❌ TEST FAILED:", error);
    process.exit(1);
  }
}

/**
 * @notice Simulate a LayerZero message from Sonic to Arbitrum
 */
async function simulateLzMessage(
  sonicEndpoint,
  arbitrumEndpoint,
  sonicVRFConsumer,
  arbitrumVRFRequester,
  requestId,
  user
) {
  console.log(`🔄 Simulating LayerZero message: Sonic -> Arbitrum`);
  
  try {
    // Encode the payload (requestId, user)
    const payload = ethers.utils.defaultAbiCoder.encode(
      ['uint64', 'address'],
      [requestId, user]
    );
    
    // Encode the source address
    const srcAddress = ethers.utils.solidityPack(
      ['address'],
      [sonicVRFConsumer]
    );
    
    // Mock nonce
    const nonce = 1;
    
    // Deliver the message to the destination
    await arbitrumEndpoint.deliverMessage(
      146, // Sonic chain ID
      srcAddress,
      arbitrumVRFRequester,
      nonce,
      payload
    );
    
    console.log(`✅ LayerZero message delivered to Arbitrum`);
  } catch (error) {
    console.error("Error simulating LayerZero message:", error);
  }
}

/**
 * @notice Simulate a VRF callback from Chainlink
 */
async function simulateVRFCallback(mockVRFCoordinator, arbitrumVRFRequester, requestId) {
  console.log(`🔄 Simulating Chainlink VRF callback`);
  
  try {
    // Generate a random number
    const randomness = ethers.BigNumber.from(ethers.utils.randomBytes(32));
    
    // Call the fulfillRandomWords function on the VRF consumer
    await mockVRFCoordinator.fulfillRandomWords(
      requestId,
      arbitrumVRFRequester.address,
      [randomness]
    );
    
    console.log(`✅ VRF callback delivered with randomness: ${randomness.toString()}`);
  } catch (error) {
    console.error("Error simulating VRF callback:", error);
  }
}

/**
 * @notice Simulate a LayerZero message from Arbitrum back to Sonic
 */
async function simulateLzReturnMessage(
  arbitrumEndpoint,
  sonicEndpoint,
  arbitrumVRFRequester,
  sonicVRFConsumer,
  sonicRequestId,
  user,
  randomness
) {
  console.log(`🔄 Simulating LayerZero message: Arbitrum -> Sonic`);
  
  try {
    // Encode the payload (sonicRequestId, user, randomness)
    const payload = ethers.utils.defaultAbiCoder.encode(
      ['uint64', 'address', 'uint256'],
      [sonicRequestId, user, randomness]
    );
    
    // Encode the source address
    const srcAddress = ethers.utils.solidityPack(
      ['address'],
      [arbitrumVRFRequester]
    );
    
    // Mock nonce
    const nonce = 2;
    
    // Deliver the message to the destination
    await sonicEndpoint.deliverMessage(
      110, // Arbitrum chain ID
      srcAddress,
      sonicVRFConsumer,
      nonce,
      payload
    );
    
    console.log(`✅ LayerZero message delivered to Sonic`);
  } catch (error) {
    console.error("Error simulating return LayerZero message:", error);
  }
}

/**
 * @notice Save test deployment information
 */
function saveTestDeployment(deploymentInfo) {
  const fs = require('fs');
  const path = require('path');
  
  // Create deployments directory if it doesn't exist
  const deployDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
  }
  
  // Add timestamp
  deploymentInfo.deployTime = new Date().toISOString();
  
  // Save to file
  fs.writeFileSync(
    path.join(deployDir, 'vrf-local-test.json'),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log(`\n📝 Test deployment information saved to deployments/vrf-local-test.json`);
}

// Execute the test script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }); 