const { ethers } = require("hardhat");

// Script to simulate a series of transactions on the OmniDragon ecosystem
async function main() {
  console.log("Starting OmniDragon chain-specific transactions simulation");
  
  // Get signers
  const [deployer, user1, user2] = await ethers.getSigners();
  console.log(`Using deployer: ${deployer.address}`);
  console.log(`Using user1: ${user1.address}`);
  console.log(`Using user2: ${user2.address}`);
  
  // Constants
  const SONIC_CHAIN_ID = 146;
  const BASE_CHAIN_ID = 184;
  const DRAGON_SUPPLY = ethers.utils.parseEther("1000000");
  const MIN_SWAP_AMOUNT = ethers.utils.parseEther("10");
  
  console.log("Deploying mock contracts...");
  
  // Deploy mock LayerZero endpoint
  const MockLzEndpoint = await ethers.getContractFactory("MockLzEndpoint");
  const mockLzEndpoint = await MockLzEndpoint.deploy();
  console.log(`Deployed MockLzEndpoint at ${mockLzEndpoint.address}`);
  
  // Deploy mock tokens
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const wSonic = await MockERC20.deploy("Wrapped Sonic", "wS", 18);
  const wEth = await MockERC20.deploy("Wrapped Ether", "WETH", 18);
  console.log(`Deployed wSonic at ${wSonic.address}`);
  console.log(`Deployed wEth at ${wEth.address}`);
  
  // Deploy mock VRF components
  const MockSonicVRFConsumer = await ethers.getContractFactory("MockSonicVRFConsumer");
  const sonicVRFConsumer = await MockSonicVRFConsumer.deploy();
  
  const MockVRFCoordinatorV2 = await ethers.getContractFactory("MockVRFCoordinatorV2");
  const chainlinkVRFCoordinator = await MockVRFCoordinatorV2.deploy();
  console.log(`Deployed VRF mocks`);
  
  // Deploy jackpot vault and fee distributor
  const DragonJackpotVault = await ethers.getContractFactory("DragonJackpotVault");
  const jackpotVault = await DragonJackpotVault.deploy(wSonic.address);
  
  const Ve69LPFeeDistributor = await ethers.getContractFactory("Ve69LPFeeDistributor");
  const feeDistributor = await Ve69LPFeeDistributor.deploy(wSonic.address);
  console.log(`Deployed jackpot vault and fee distributor`);
  
  // Deploy ChainRegistry
  const ChainRegistry = await ethers.getContractFactory("ChainRegistry");
  const chainRegistry = await ChainRegistry.deploy(SONIC_CHAIN_ID);
  console.log(`Deployed ChainRegistry at ${chainRegistry.address}`);
  
  // Deploy OmniDragon token
  const OmniDragon = await ethers.getContractFactory("OmniDragon");
  const omniDragon = await OmniDragon.deploy(
    "Dragon Token",
    "DRAGON",
    DRAGON_SUPPLY,
    mockLzEndpoint.address,
    jackpotVault.address,
    feeDistributor.address,
    chainRegistry.address,
    deployer.address
  );
  console.log(`Deployed OmniDragon at ${omniDragon.address}`);
  
  // Register chains in the registry
  await chainRegistry.registerChain(
    SONIC_CHAIN_ID,
    "Sonic",
    wSonic.address,
    ethers.constants.AddressZero,
    sonicVRFConsumer.address,
    omniDragon.address
  );
  
  await chainRegistry.registerChain(
    BASE_CHAIN_ID,
    "Base",
    wEth.address,
    ethers.constants.AddressZero,
    chainlinkVRFCoordinator.address,
    omniDragon.address
  );
  console.log(`Registered chains in the registry`);
  
  // Deploy Sonic-specific swap trigger
  const SonicDragonSwapTrigger = await ethers.getContractFactory("SonicDragonSwapTrigger");
  const sonicSwapTrigger = await SonicDragonSwapTrigger.deploy(
    wSonic.address,
    omniDragon.address,
    sonicVRFConsumer.address,
    MIN_SWAP_AMOUNT,
    chainRegistry.address
  );
  console.log(`Deployed SonicDragonSwapTrigger at ${sonicSwapTrigger.address}`);
  
  // Deploy Base-specific swap trigger with mock parameters
  const keyHash = "0x8472ba59cf7134dfe321f4d61a430c4857e8b19cdd5230b09952a92671c24409";
  const subscriptionId = 1;
  const callbackGasLimit = 500000;
  
  const BaseDragonSwapTrigger = await ethers.getContractFactory("BaseDragonSwapTrigger");
  const baseSwapTrigger = await BaseDragonSwapTrigger.deploy(
    wEth.address,
    omniDragon.address,
    chainlinkVRFCoordinator.address,
    keyHash,
    subscriptionId,
    callbackGasLimit,
    MIN_SWAP_AMOUNT,
    chainRegistry.address
  );
  console.log(`Deployed BaseDragonSwapTrigger at ${baseSwapTrigger.address}`);
  
  // Update the swap triggers in the registry
  await chainRegistry.updateChain(
    SONIC_CHAIN_ID,
    wSonic.address,
    sonicSwapTrigger.address,
    sonicVRFConsumer.address,
    omniDragon.address
  );
  
  await chainRegistry.updateChain(
    BASE_CHAIN_ID,
    wEth.address,
    baseSwapTrigger.address,
    chainlinkVRFCoordinator.address,
    omniDragon.address
  );
  console.log(`Updated swap triggers in the registry`);
  
  // Setup initial token balances
  await wSonic.mint(user1.address, ethers.utils.parseEther("1000"));
  await wSonic.mint(user2.address, ethers.utils.parseEther("1000"));
  await wEth.mint(user1.address, ethers.utils.parseEther("1000"));
  await wEth.mint(user2.address, ethers.utils.parseEther("1000"));
  console.log(`Minted tokens to users`);
  
  // Configure swap triggers with initial jackpot
  await wSonic.connect(user1).approve(sonicSwapTrigger.address, ethers.utils.parseEther("100"));
  await sonicSwapTrigger.connect(user1).addToJackpot(ethers.utils.parseEther("100"));
  
  await wEth.connect(user1).approve(baseSwapTrigger.address, ethers.utils.parseEther("100"));
  await baseSwapTrigger.connect(user1).addToJackpot(ethers.utils.parseEther("100"));
  console.log(`Added initial jackpots to swap triggers`);
  
  // Simulation 1: User participates in lottery on Sonic
  console.log("\n=== Simulation 1: User participates in lottery on Sonic ===");
  await wSonic.connect(user2).approve(sonicSwapTrigger.address, ethers.utils.parseEther("20"));
  const tx1 = await sonicSwapTrigger.connect(user2).onSwapNativeTokenToDragon(user2.address, ethers.utils.parseEther("20"));
  const receipt1 = await tx1.wait();
  
  console.log(`Transaction hash: ${tx1.hash}`);
  console.log(`Gas used: ${receipt1.gasUsed.toString()}`);
  
  // Simulation 2: VRF returns a winning number (jackpot)
  console.log("\n=== Simulation 2: VRF returns a winning number ===");
  // This simulation triggers a winning entry (using a randomness value that's a multiple of winThreshold)
  const requestId = 999; // The request ID from the mock VRF
  const randomness = 1000; // Will be a winner since randomness % 1000 = 0
  
  const initialJackpot = await sonicSwapTrigger.jackpotBalance();
  console.log(`Initial jackpot: ${ethers.utils.formatEther(initialJackpot)} wS`);
  
  const tx2 = await sonicSwapTrigger.connect(deployer).fulfillRandomness(requestId, randomness);
  const receipt2 = await tx2.wait();
  
  console.log(`Transaction hash: ${tx2.hash}`);
  console.log(`Gas used: ${receipt2.gasUsed.toString()}`);
  
  const finalJackpot = await sonicSwapTrigger.jackpotBalance();
  console.log(`Final jackpot: ${ethers.utils.formatEther(finalJackpot)} wS`);
  
  // Check if we have a winner
  const lastWinner = await sonicSwapTrigger.lastWinner();
  const lastWinAmount = await sonicSwapTrigger.lastWinAmount();
  
  if (lastWinner !== ethers.constants.AddressZero) {
    console.log(`Jackpot won by: ${lastWinner}`);
    console.log(`Win amount: ${ethers.utils.formatEther(lastWinAmount)} wS`);
  } else {
    console.log("No winner in this simulation");
  }
  
  // Simulation 3: Add to jackpot with OmniDragon
  console.log("\n=== Simulation 3: Add to jackpot via OmniDragon ===");
  await wSonic.connect(user1).approve(omniDragon.address, ethers.utils.parseEther("50"));
  const tx3 = await omniDragon.connect(deployer).addToJackpot(ethers.utils.parseEther("50"));
  const receipt3 = await tx3.wait();
  
  console.log(`Transaction hash: ${tx3.hash}`);
  console.log(`Gas used: ${receipt3.gasUsed.toString()}`);
  
  const jackpotBalance = await jackpotVault.getBalance();
  console.log(`Jackpot vault balance: ${ethers.utils.formatEther(jackpotBalance)} wS`);
  
  console.log("\nSimulation completed successfully!");
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 