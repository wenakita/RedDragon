const hre = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("Redeploying contracts to Sonic Mainnet (Chain ID: 146)...");
  
  // Configure higher gas price and gas limit for all transactions
  const overrides = {
    gasPrice: hre.ethers.utils.parseUnits('100', 'gwei'), // 100 gwei
    gasLimit: 5000000
  };
  
  // Get network details to confirm
  const network = await hre.ethers.provider.getNetwork();
  const chainId = network.chainId;
  console.log(`Connected to network with Chain ID: ${chainId}`);
  
  if (chainId !== 146 && chainId !== 146n) {
    console.error(`Error: Expected Chain ID 146 (Sonic Mainnet), but got ${chainId}`);
    console.error("Make sure you're running with --network sonic flag");
    return;
  }

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying contracts with account: ${deployer.address}`);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${balance.toString() / 1e18} SONIC`);

  // Get or set the WRAPPED_SONIC_ADDRESS
  const wrappedSonicAddress = process.env.WRAPPED_SONIC_ADDRESS || "0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38";
  console.log(`Using Wrapped Sonic token at: ${wrappedSonicAddress}`);
  
  // Get the burn address
  const burnAddress = process.env.BURN_ADDRESS || "0x000000000000000000000000000000000000dEaD";
  console.log(`Using Burn Address: ${burnAddress}`);

  // First, deploy the PaintSwap Verifier
  console.log("Deploying RedDragonPaintSwapVerifier contract...");
  const RedDragonPaintSwapVerifier = await hre.ethers.getContractFactory("RedDragonPaintSwapVerifier", deployer);
  const redDragonPaintSwapVerifier = await RedDragonPaintSwapVerifier.deploy(overrides);
  await redDragonPaintSwapVerifier.deployed();
  const redDragonPaintSwapVerifierAddress = redDragonPaintSwapVerifier.address;
  console.log(`RedDragonPaintSwapVerifier deployed to: ${redDragonPaintSwapVerifierAddress}`);

  // Next, deploy RedDragonSwapLottery
  console.log("Deploying RedDragonSwapLotteryWithScratcher contract...");
  const RedDragonSwapLottery = await hre.ethers.getContractFactory("RedDragonSwapLotteryWithScratcher", deployer);
  const redDragonSwapLottery = await RedDragonSwapLottery.deploy(
    wrappedSonicAddress,
    redDragonPaintSwapVerifierAddress,
    overrides
  );
  await redDragonSwapLottery.deployed();
  const redDragonSwapLotteryAddress = redDragonSwapLottery.address;
  console.log(`RedDragonSwapLotteryWithScratcher deployed to: ${redDragonSwapLotteryAddress}`);

  // Initialize the verifier with the lottery address
  console.log("Initializing RedDragonPaintSwapVerifier...");
  const vrfCoordinator = process.env.PAINT_SWAP_VRF_COORDINATOR || "0x3ba925fdeae6b46d0bb4d424d829982cb2f7309e";
  const subscriptionId = process.env.PAINT_SWAP_SUBSCRIPTION_ID || "1";
  const gasLane = process.env.PAINT_SWAP_GAS_LANE || "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f";
  
  try {
    await redDragonPaintSwapVerifier.initialize(
      vrfCoordinator,
      redDragonSwapLotteryAddress,
      subscriptionId,
      gasLane,
      overrides
    );
    console.log("RedDragonPaintSwapVerifier initialized");
  } catch (error) {
    console.error(`Error initializing verifier: ${error.message}`);
  }

  // Now deploy ve8020
  console.log("Deploying ve8020 contract...");
  const Ve8020 = await hre.ethers.getContractFactory("ve8020", deployer);
  const ve8020 = await Ve8020.deploy(
    wrappedSonicAddress, // Using wrappedSonic as temporary token parameter
    overrides
  );
  await ve8020.deployed();
  const ve8020Address = ve8020.address;
  console.log(`ve8020 deployed to: ${ve8020Address}`);

  // Deploy RedDragon token (with the correct addresses from the start)
  console.log("Deploying RedDragon token...");
  const RedDragon = await hre.ethers.getContractFactory("RedDragon", deployer);
  const redDragon = await RedDragon.deploy(
    redDragonSwapLotteryAddress, // jackpotAddress - set to lottery directly
    ve8020Address,              // ve8020Address - set correctly from the start
    burnAddress,                // burnAddress 
    wrappedSonicAddress,        // wrappedSonicAddress
    overrides
  );
  await redDragon.deployed();
  const redDragonTokenAddress = redDragon.address;
  console.log(`RedDragon token deployed to: ${redDragonTokenAddress}`);

  // Since ve8020 doesn't have an updateUnderlyingToken function, we need to deploy a new ve8020 with the correct token
  try {
    console.log("Deploying new ve8020 with RedDragon token...");
    const Ve8020WithCorrectToken = await hre.ethers.getContractFactory("ve8020", deployer);
    const ve8020WithCorrectToken = await Ve8020WithCorrectToken.deploy(
      redDragonTokenAddress, // Using the RedDragon token as the lpToken
      overrides
    );
    await ve8020WithCorrectToken.deployed();
    const newVe8020Address = ve8020WithCorrectToken.address;
    console.log(`New ve8020 deployed with RedDragon token at: ${newVe8020Address}`);
    
    // Update the ve8020Address to use the new contract
    ve8020Address = newVe8020Address;
    
    // Update the ve8020 reference in the RedDragon contract using the setVe8020Address function
    console.log("Updating ve8020 reference in RedDragon contract...");
    const setVe8020Tx = await redDragon.setVe8020Address(newVe8020Address, overrides);
    await setVe8020Tx.wait();
    console.log(`RedDragon ve8020 address updated to: ${newVe8020Address}`);
  } catch (error) {
    console.error(`Error deploying new ve8020 with RedDragon token: ${error.message}`);
    console.warn("Continuing with the original ve8020 contract. This may need to be updated manually.");
  }

  // Deploy Ve8020FeeDistributor
  console.log("Deploying Ve8020FeeDistributor contract...");
  const Ve8020FeeDistributor = await hre.ethers.getContractFactory("Ve8020FeeDistributor", deployer);
  const ve8020FeeDistributor = await Ve8020FeeDistributor.deploy(
    ve8020Address,
    wrappedSonicAddress,
    overrides
  );
  await ve8020FeeDistributor.deployed();
  const ve8020FeeDistributorAddress = ve8020FeeDistributor.address;
  console.log(`Ve8020FeeDistributor deployed to: ${ve8020FeeDistributorAddress}`);

  // Deploy ve8020LotteryIntegratorNoInit
  console.log("Deploying ve8020LotteryIntegratorNoInit contract...");
  const Ve8020LotteryIntegratorNoInit = await hre.ethers.getContractFactory("ve8020LotteryIntegratorNoInit", deployer);
  const ve8020LotteryIntegrator = await Ve8020LotteryIntegratorNoInit.deploy(
    ve8020Address,
    redDragonSwapLotteryAddress,
    overrides
  );
  await ve8020LotteryIntegrator.deployed();
  const ve8020LotteryIntegratorAddress = ve8020LotteryIntegrator.address;
  console.log(`ve8020LotteryIntegratorNoInit deployed to: ${ve8020LotteryIntegratorAddress}`);

  // Set voting token in lottery to the integrator
  try {
    console.log("Setting voting token in lottery...");
    const setVotingTokenTx = await redDragonSwapLottery.setVotingToken(ve8020LotteryIntegratorAddress, overrides);
    await setVotingTokenTx.wait();
    console.log("Set integrator as voting token in lottery");
  } catch (error) {
    console.error(`Error setting voting token: ${error.message}`);
  }

  // Deploy GoldScratcher
  console.log("Deploying GoldScratcher contract...");
  const GoldScratcher = await hre.ethers.getContractFactory("GoldScratcher", deployer);
  const goldScratcher = await GoldScratcher.deploy(
    "RedDragon Gold Scratcher",    // name
    "RDGS",                        // symbol
    "https://sonicreddragon.io/metadata/goldscratcher/", // baseURI 
    "unrevealed",                  // unrevealedFolder
    "winner",                      // winnerFolder
    "loser",                       // loserFolder
    overrides
  );
  await goldScratcher.deployed();
  const goldScratcherAddress = goldScratcher.address;
  console.log(`GoldScratcher deployed to: ${goldScratcherAddress}`);

  // Set lottery contract in GoldScratcher
  try {
    console.log("Setting lottery contract in GoldScratcher...");
    const setLotteryTx = await goldScratcher.setLotteryContract(redDragonSwapLotteryAddress, overrides);
    await setLotteryTx.wait();
    console.log("Set lottery contract in GoldScratcher");
  } catch (error) {
    console.error(`Error setting lottery contract: ${error.message}`);
  }

  // Set GoldScratcher in lottery
  try {
    console.log("Setting GoldScratcher in lottery...");
    const setGoldScratcherTx = await redDragonSwapLottery.setGoldScratcher(goldScratcherAddress, overrides);
    await setGoldScratcherTx.wait();
    console.log("Set GoldScratcher in lottery");
  } catch (error) {
    console.error(`Error setting GoldScratcher: ${error.message}`);
  }

  // Print deployment summary
  console.log("\n=== DEPLOYMENT SUMMARY ===");
  console.log(`RedDragon Token: ${redDragonTokenAddress}`);
  console.log(`Wrapped Sonic: ${wrappedSonicAddress}`);
  console.log(`ve8020: ${ve8020Address}`);
  console.log(`Ve8020FeeDistributor: ${ve8020FeeDistributorAddress}`);
  console.log(`RedDragonPaintSwapVerifier: ${redDragonPaintSwapVerifierAddress}`);
  console.log(`RedDragonSwapLotteryWithScratcher: ${redDragonSwapLotteryAddress}`);
  console.log(`ve8020LotteryIntegratorNoInit: ${ve8020LotteryIntegratorAddress}`);
  console.log(`GoldScratcher: ${goldScratcherAddress}`);
  console.log("=========================\n");

  // Fund the VRF subscription
  try {
    console.log("Funding VRF subscription...");
    // Get VRF Coordinator contract
    const vrfCoordinatorAbi = [
      "function addConsumer(uint64 subId, address consumer) external",
      "function fundSubscription(uint64 _subId, uint256 _amount) external"
    ];
    const vrfCoordinatorContract = new hre.ethers.Contract(
      vrfCoordinator,
      vrfCoordinatorAbi,
      deployer
    );
    
    // Add RedDragonPaintSwapVerifier as a consumer if not already added
    console.log(`Adding ${redDragonPaintSwapVerifierAddress} as VRF consumer to subscription ${subscriptionId}...`);
    try {
      const addConsumerTx = await vrfCoordinatorContract.addConsumer(
        subscriptionId,
        redDragonPaintSwapVerifierAddress,
        overrides
      );
      await addConsumerTx.wait();
      console.log("Successfully added verifier as VRF consumer");
    } catch (error) {
      console.warn(`Consumer may already be added or other error: ${error.message}`);
    }
    
    // Fund the subscription with 1 SONIC
    const fundAmount = hre.ethers.utils.parseEther("1.0");
    console.log(`Funding subscription ${subscriptionId} with ${hre.ethers.utils.formatEther(fundAmount)} SONIC...`);
    const fundTx = await vrfCoordinatorContract.fundSubscription(
      subscriptionId,
      fundAmount,
      overrides
    );
    await fundTx.wait();
    console.log("VRF subscription funded successfully!");
  } catch (error) {
    console.error(`Error funding VRF subscription: ${error.message}`);
    console.warn("You may need to fund your VRF subscription manually!");
  }

  // Deploy RedEnvelope contract and mint for special recipients
  try {
    console.log("Deploying RedEnvelope contract...");
    const RedEnvelopeFactory = await hre.ethers.getContractFactory("RedEnvelope", deployer);
    const redEnvelope = await RedEnvelopeFactory.deploy(
      "RedDragon Envelope", 
      "RDE", 
      "https://sonicreddragon.io/metadata/redenvelope/",
      overrides
    );
    await redEnvelope.deployed();
    const redEnvelopeAddress = redEnvelope.address;
    console.log(`RedEnvelope deployed to: ${redEnvelopeAddress}`);

    // Mint special envelopes for the predefined recipients (legendary rarity = 5)
    console.log("Minting special envelopes for predefined recipients...");
    const mintSpecialTx = await redEnvelope.mintSpecialEnvelopes(5, overrides);
    await mintSpecialTx.wait();
    console.log("Successfully minted special envelopes for 3 recipients with legendary rarity");

    // Update deployment summary to include RedEnvelope
    console.log("\n=== UPDATED DEPLOYMENT SUMMARY ===");
    console.log(`RedDragon Token: ${redDragonTokenAddress}`);
    console.log(`Wrapped Sonic: ${wrappedSonicAddress}`);
    console.log(`ve8020: ${ve8020Address}`);
    console.log(`Ve8020FeeDistributor: ${ve8020FeeDistributorAddress}`);
    console.log(`RedDragonPaintSwapVerifier: ${redDragonPaintSwapVerifierAddress}`);
    console.log(`RedDragonSwapLotteryWithScratcher: ${redDragonSwapLotteryAddress}`);
    console.log(`ve8020LotteryIntegratorNoInit: ${ve8020LotteryIntegratorAddress}`);
    console.log(`GoldScratcher: ${goldScratcherAddress}`);
    console.log(`RedEnvelope: ${redEnvelopeAddress}`);
    console.log("=========================\n");
  } catch (error) {
    console.error(`Error deploying RedEnvelope contract: ${error.message}`);
    console.warn("Failed to deploy RedEnvelope contract or mint special envelopes.");
  }

  console.log("Redeployment to Sonic Mainnet completed successfully!");
  console.log("VRF subscription funding attempted - check logs for success confirmation.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 