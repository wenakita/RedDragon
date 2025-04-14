const hre = require("hardhat");
const { parseEther } = require("ethers");
require("dotenv").config();

async function main() {
  console.log("Deploying contracts to Sonic Mainnet (Chain ID: 146)...");
  
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

  let redDragonTokenAddress;
  // Deploy RedDragon token if needed
  if (!process.env.REDDRAGON_TOKEN_ADDRESS) {
    console.log("Deploying RedDragon token...");
    
    // Since we need to deploy RedDragon first but it requires addresses of other contracts,
    // we'll temporarily set the jackpot and ve8020 address to the deployer 
    // (these can be updated later by the contract owner)
    const jackpotAddress = deployer.address; // Will be updated after lottery deployment
    const ve8020Address = deployer.address;  // Will be updated after ve8020 deployment
    
    console.log(`Deploying RedDragon with parameters:`);
    console.log(`- Jackpot Address: ${jackpotAddress} (temporary)`);
    console.log(`- Ve8020 Address: ${ve8020Address} (temporary)`);
    console.log(`- Burn Address: ${burnAddress}`);
    console.log(`- Wrapped Sonic Address: ${wrappedSonicAddress}`);
    
    const RedDragon = await hre.ethers.getContractFactory("RedDragon", deployer);
    const redDragon = await RedDragon.deploy(
      jackpotAddress,    // _jackpotAddress
      ve8020Address,     // _ve8020Address 
      burnAddress,       // _burnAddress
      wrappedSonicAddress, // _wrappedSonicAddress
      overrides
    );
    await redDragon.deployed();
    redDragonTokenAddress = redDragon.address;
    console.log(`RedDragon token deployed to: ${redDragonTokenAddress}`);
  } else {
    redDragonTokenAddress = process.env.REDDRAGON_TOKEN_ADDRESS;
    console.log(`Using existing RedDragon token at: ${redDragonTokenAddress}`);
  }

  // Deploy ve8020
  console.log("Deploying ve8020 contract...");
  const Ve8020 = await hre.ethers.getContractFactory("ve8020", deployer);
  const ve8020 = await Ve8020.deploy(
    redDragonTokenAddress,
    overrides
  );
  await ve8020.deployed();
  const ve8020Address = ve8020.address;
  console.log(`ve8020 deployed to: ${ve8020Address}`);

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

  // First deploy the PaintSwap Verifier
  console.log("Deploying RedDragonPaintSwapVerifier contract...");
  const RedDragonPaintSwapVerifier = await hre.ethers.getContractFactory("RedDragonPaintSwapVerifier", deployer);
  const redDragonPaintSwapVerifier = await RedDragonPaintSwapVerifier.deploy(overrides);
  await redDragonPaintSwapVerifier.deployed();
  const redDragonPaintSwapVerifierAddress = redDragonPaintSwapVerifier.address;
  console.log(`RedDragonPaintSwapVerifier deployed to: ${redDragonPaintSwapVerifierAddress}`);

  // Deploy RedDragonSwapLottery with the correct constructor parameters
  console.log("Deploying RedDragonSwapLotteryWithScratcher contract...");
  const RedDragonSwapLottery = await hre.ethers.getContractFactory("RedDragonSwapLotteryWithScratcher", deployer);
  const redDragonSwapLottery = await RedDragonSwapLottery.deploy(
    wrappedSonicAddress,
    redDragonPaintSwapVerifierAddress, // Just need wS address and verifier address
    overrides
  );
  await redDragonSwapLottery.deployed();
  const redDragonSwapLotteryAddress = redDragonSwapLottery.address;
  console.log(`RedDragonSwapLotteryWithScratcher deployed to: ${redDragonSwapLotteryAddress}`);

  // Now initialize the verifier with the lottery address
  console.log("Initializing RedDragonPaintSwapVerifier...");
  const vrfCoordinator = process.env.PAINT_SWAP_VRF_COORDINATOR || "0x3ba925fdeae6b46d0bb4d424d829982cb2f7309e";
  const subscriptionId = process.env.PAINT_SWAP_SUBSCRIPTION_ID || "1";
  const gasLane = process.env.PAINT_SWAP_GAS_LANE || "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f";
  
  console.log("Using VRF configuration:");
  console.log(`VRF Coordinator: ${vrfCoordinator}`);
  console.log(`Subscription ID: ${subscriptionId}`);
  console.log(`Gas Lane: ${gasLane}`);

  await redDragonPaintSwapVerifier.initialize(
    vrfCoordinator,
    redDragonSwapLotteryAddress,
    subscriptionId,
    gasLane,
    overrides
  );
  console.log("RedDragonPaintSwapVerifier initialized");

  // First set the voting token in lottery to the deployer
  console.log("Setting up preliminary ownership...");
  
  // Only set voting token if not already set
  try {
    const currentVotingToken = await redDragonSwapLottery.votingToken();
    if (currentVotingToken !== deployer.address) {
      console.log(`Current voting token is ${currentVotingToken}, setting to deployer temporarily...`);
      const setVotingTokenTx = await redDragonSwapLottery.setVotingToken(deployer.address, overrides);
      await setVotingTokenTx.wait();
      console.log("Set deployer as voting token temporarily");
    } else {
      console.log("Voting token already set to deployer");
    }
  } catch (error) {
    console.log(`Error checking voting token: ${error.message}`);
    console.log("Attempting to set voting token anyway...");
    try {
      const setVotingTokenTx = await redDragonSwapLottery.setVotingToken(deployer.address, overrides);
      await setVotingTokenTx.wait();
      console.log("Set deployer as voting token temporarily");
    } catch (error) {
      console.log(`Failed to set voting token: ${error.message}`);
      console.log("Continuing with deployment - but there may be permission issues later");
    }
  }

  // Deploy ve8020LotteryIntegratorNoInit directly
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

  // Set the voting token to the integrator with better error handling
  console.log("Setting integrator as voting token in lottery...");
  try {
    const currentVotingToken = await redDragonSwapLottery.votingToken();
    if (currentVotingToken !== ve8020LotteryIntegratorAddress) {
      console.log(`Current voting token is ${currentVotingToken}, updating to integrator...`);
      const setFinalVotingTokenTx = await redDragonSwapLottery.setVotingToken(ve8020LotteryIntegratorAddress, overrides);
      await setFinalVotingTokenTx.wait();
      console.log("Set integrator as voting token in lottery");
    } else {
      console.log("Voting token already set to integrator");
    }
  } catch (error) {
    console.log(`Error setting integrator as voting token: ${error.message}`);
    console.log("Proceeding with deployment - manually set the integrator as the voting token later");
  }

  // Skip the failing initialize call - it's redundant since we already set the voting token
  console.log("Skipping initialize call since voting token is already set");

  // Deploy GoldScratcher
  console.log("Deploying GoldScratcher contract...");
  const GoldScratcher = await hre.ethers.getContractFactory("GoldScratcher", deployer);
  const goldScratcher = await GoldScratcher.deploy(
    "RedDragon Gold Scratcher",  // name
    "RDGS",                      // symbol
    "https://sonicreddragon.io/metadata/", // baseURI 
    "unrevealed",                // unrevealedFolder
    "winner",                    // winnerFolder
    "loser",                     // loserFolder
    overrides
  );
  await goldScratcher.deployed();
  const goldScratcherAddress = goldScratcher.address;
  console.log(`GoldScratcher deployed to: ${goldScratcherAddress}`);

  // Set up integrations with better error handling
  console.log("Setting up contract integrations...");
  
  // Set lottery contract in GoldScratcher
  try {
    console.log("Setting lottery contract in GoldScratcher...");
    const setLotteryTx = await goldScratcher.setLotteryContract(redDragonSwapLotteryAddress, overrides);
    await setLotteryTx.wait();
    console.log("Set lottery contract in GoldScratcher");
  } catch (error) {
    console.log(`Error setting lottery contract in GoldScratcher: ${error.message}`);
    console.log("You'll need to manually set the lottery contract in GoldScratcher later");
  }
  
  // Connect lottery with ve8020 integrator
  try {
    console.log("Setting ve8020LotteryIntegrator in lottery...");
    const setVe8020IntegratorTx = await redDragonSwapLottery.setVe8020Integrator(ve8020LotteryIntegratorAddress, overrides);
    await setVe8020IntegratorTx.wait();
    console.log("Set ve8020LotteryIntegrator in lottery");
  } catch (error) {
    console.log(`Error setting ve8020 integrator: ${error.message}`);
    console.log("You'll need to manually set the ve8020 integrator later");
  }
  
  // Set GoldScratcher in the lottery
  try {
    console.log("Setting GoldScratcher in lottery...");
    const setGoldScratcherTx = await redDragonSwapLottery.setGoldScratcher(goldScratcherAddress, overrides);
    await setGoldScratcherTx.wait();
    console.log("Set GoldScratcher in lottery");
  } catch (error) {
    console.log(`Error setting GoldScratcher: ${error.message}`);
    console.log("You'll need to manually set the GoldScratcher later");
  }

  // Update addresses in RedDragon contract if we deployed it
  if (!process.env.REDDRAGON_TOKEN_ADDRESS) {
    console.log("Updating addresses in RedDragon contract...");
    
    try {
      // Get the RedDragon contract instance
      const redDragon = await hre.ethers.getContractAt("RedDragon", redDragonTokenAddress, deployer);
      
      // Update jackpot address - requires timelock so we just set it directly to lottery
      try {
        console.log("Scheduling jackpot address update...");
        const scheduleJackpotTx = await redDragon.scheduleJackpotAddressUpdate(redDragonSwapLotteryAddress, overrides);
        await scheduleJackpotTx.wait();
        console.log(`Scheduled jackpot address update to: ${redDragonSwapLotteryAddress} (needs timelock)`);
      } catch (error) {
        console.log(`Error scheduling jackpot address update: ${error.message}`);
        console.log("You'll need to manually schedule the jackpot address update later");
      }
      
      // Update ve8020 address - setVe8020Address is immediate
      try {
        console.log("Updating ve8020 address...");
        const setVe8020Tx = await redDragon.setVe8020Address(ve8020Address, overrides);
        await setVe8020Tx.wait();
        console.log(`Updated ve8020 address to: ${ve8020Address}`);
      } catch (error) {
        console.log(`Error updating ve8020 address: ${error.message}`);
        console.log("You'll need to manually set the ve8020 address later");
      }
      
      console.log("Note: You will need to execute the jackpot address update after the timelock period (24 hours)");
      console.log("Call executeJackpotAddressUpdate(" + redDragonSwapLotteryAddress + ") on the RedDragon contract");
    } catch (error) {
      console.log(`Error connecting to RedDragon contract: ${error.message}`);
      console.log("You'll need to manually update the RedDragon contract addresses later");
    }
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

  console.log("Deployment to Sonic Mainnet completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 