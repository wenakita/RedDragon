const { ethers } = require("hardhat");

// Simulation script for BaseDragonSwapTrigger
async function simulateBaseDragonSwapTrigger() {
  console.log("BaseDragonSwapTrigger Simulation");
  console.log("=================================");
  
  // Get signers
  const [deployer, user] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  console.log(`User address: ${user.address}`);
  
  // Mock parameters
  const SUBSCRIPTION_ID = 123;
  const KEY_HASH = "0x8472ba59cf7134dfe321f4d61a430c4857e8b19cdd5230b09952a92671c24409";
  const CALLBACK_GAS_LIMIT = 500000;
  const MIN_SWAP_AMOUNT = ethers.utils.parseEther("0.01");
  
  console.log("\nDeploying mock contracts...");
  
  // Deploy mock ERC20 tokens
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const weth = await MockERC20.deploy("Wrapped ETH", "WETH");
  await weth.deployed();
  console.log(`Mock WETH deployed at: ${weth.address}`);
  
  const dragonToken = await MockERC20.deploy("Dragon Token", "DRAGON");
  await dragonToken.deployed();
  console.log(`Mock Dragon Token deployed at: ${dragonToken.address}`);
  
  // Deploy mock VRF Coordinator
  const MockVRFCoordinator = await ethers.getContractFactory("MockVRFCoordinator");
  const vrfCoordinator = await MockVRFCoordinator.deploy();
  await vrfCoordinator.deployed();
  console.log(`Mock VRF Coordinator deployed at: ${vrfCoordinator.address}`);
  
  // Deploy mock Chain Registry
  const MockChainRegistry = await ethers.getContractFactory("MockChainRegistry");
  const chainRegistry = await MockChainRegistry.deploy();
  await chainRegistry.deployed();
  console.log(`Mock Chain Registry deployed at: ${chainRegistry.address}`);
  
  // Deploy BaseDragonSwapTrigger
  console.log("\nDeploying BaseDragonSwapTrigger...");
  const BaseDragonSwapTrigger = await ethers.getContractFactory("BaseDragonSwapTrigger");
  const baseDragonSwapTrigger = await BaseDragonSwapTrigger.deploy(
    weth.address,
    dragonToken.address,
    vrfCoordinator.address,
    KEY_HASH,
    SUBSCRIPTION_ID,
    CALLBACK_GAS_LIMIT,
    MIN_SWAP_AMOUNT,
    chainRegistry.address
  );
  await baseDragonSwapTrigger.deployed();
  console.log(`BaseDragonSwapTrigger deployed at: ${baseDragonSwapTrigger.address}`);
  
  // Configure mock VRF Coordinator
  console.log("\nConfiguring mock VRF Coordinator...");
  await vrfCoordinator.setWillFulfill(true);
  
  // Fund user with WETH
  console.log("\nFunding user with WETH...");
  const userWethAmount = ethers.utils.parseEther("10");
  await weth.mint(user.address, userWethAmount);
  console.log(`User WETH balance: ${ethers.utils.formatEther(await weth.balanceOf(user.address))} WETH`);
  
  // User approves BaseDragonSwapTrigger to spend WETH
  console.log("\nUser approving BaseDragonSwapTrigger to spend WETH...");
  await weth.connect(user).approve(baseDragonSwapTrigger.address, userWethAmount);
  
  // Add funds to jackpot
  console.log("\nAdding funds to jackpot...");
  const jackpotAmount = ethers.utils.parseEther("5");
  await weth.mint(deployer.address, jackpotAmount);
  await weth.approve(baseDragonSwapTrigger.address, jackpotAmount);
  await baseDragonSwapTrigger.addToJackpot(jackpotAmount);
  console.log(`Jackpot balance: ${ethers.utils.formatEther(await baseDragonSwapTrigger.jackpotBalance())} WETH`);
  
  // User swaps WETH for DRAGON
  console.log("\nUser swapping WETH for DRAGON...");
  const swapAmount = ethers.utils.parseEther("0.05");
  const tx = await baseDragonSwapTrigger.connect(user).onSwapNativeTokenToDragon(user.address, swapAmount);
  const receipt = await tx.wait();
  console.log(`Swap transaction successful: ${receipt.transactionHash}`);
  
  // Get VRF request events
  console.log("\nVRF request details:");
  const requestEvent = receipt.events.find(e => e.event === "RandomnessRequested");
  if (requestEvent) {
    const [requestId, userAddress] = requestEvent.args;
    console.log(`- Request ID: ${requestId.toString()}`);
    console.log(`- User: ${userAddress}`);
  } else {
    console.log("No RandomnessRequested event found");
  }
  
  // Check jackpot status after swap
  console.log("\nJackpot balance after swap: ${ethers.utils.formatEther(await baseDragonSwapTrigger.jackpotBalance())} WETH");
  
  console.log("\nSimulation completed successfully!");
}

// Execute the simulation
simulateBaseDragonSwapTrigger()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 