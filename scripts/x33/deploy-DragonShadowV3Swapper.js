const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying combined ConcreteDragonLotterySwap with ShadowDex integration...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  // Get contract addresses needed for deployment
  const routerAddress = process.env.SHADOW_ROUTER_ADDRESS;
  const quoterAddress = process.env.SHADOW_QUOTER_ADDRESS;
  const x33Address = process.env.X33_ADDRESS;
  const beetsLpAddress = process.env.BEETSLP_ADDRESS;
  const wsAddress = process.env.WS_ADDRESS;
  const usdcAddress = process.env.USDC_ADDRESS;
  const jackpotAddress = process.env.JACKPOT_ADDRESS;
  const ve69LPAddress = process.env.VE69LP_ADDRESS;
  const verifierAddress = process.env.VRF_VERIFIER_ADDRESS;
  const registryAddress = process.env.PROMO_REGISTRY_ADDRESS;
  const goldScratcherAddress = process.env.GOLD_SCRATCHER_ADDRESS;
  
  // Validate all required addresses
  const requiredAddresses = {
    WS_ADDRESS: wsAddress,
    VRF_VERIFIER_ADDRESS: verifierAddress
  };
  
  // Optional addresses
  const optionalAddresses = {
    SHADOW_ROUTER_ADDRESS: routerAddress,
    SHADOW_QUOTER_ADDRESS: quoterAddress,
    X33_ADDRESS: x33Address,
    BEETSLP_ADDRESS: beetsLpAddress,
    USDC_ADDRESS: usdcAddress,
    JACKPOT_ADDRESS: jackpotAddress,
    VE69LP_ADDRESS: ve69LPAddress,
    PROMO_REGISTRY_ADDRESS: registryAddress,
    GOLD_SCRATCHER_ADDRESS: goldScratcherAddress
  };
  
  // Check for missing required addresses
  const missingAddresses = Object.entries(requiredAddresses)
    .filter(([_, value]) => !value)
    .map(([key]) => key);
  
  if (missingAddresses.length > 0) {
    console.error("ERROR: Missing required environment variables:");
    missingAddresses.forEach(key => console.error(`- ${key}`));
    console.error("Please set all required addresses in your .env file");
    process.exit(1);
  }
  
  // Log which optional addresses are missing
  const missingOptionalAddresses = Object.entries(optionalAddresses)
    .filter(([_, value]) => !value)
    .map(([key]) => key);
  
  if (missingOptionalAddresses.length > 0) {
    console.log("NOTE: The following optional addresses are not set:");
    missingOptionalAddresses.forEach(key => console.log(`- ${key}`));
    console.log("These can be set later using the appropriate functions.");
  }
  
  // Deploy ConcreteDragonLotterySwap contract
  console.log("Deploying ConcreteDragonLotterySwap contract...");
  const ConcreteDragonLotterySwap = await ethers.getContractFactory("ConcreteDragonLotterySwap");
  const lotterySwap = await ConcreteDragonLotterySwap.deploy(
    wsAddress,
    verifierAddress,
    registryAddress || ethers.constants.AddressZero,
    goldScratcherAddress || ethers.constants.AddressZero
  );
  await lotterySwap.deployed();
  
  console.log("ConcreteDragonLotterySwap deployed to:", lotterySwap.address);
  
  // Initialize ShadowDex if all required addresses are available
  if (routerAddress && quoterAddress && x33Address && beetsLpAddress && usdcAddress && ve69LPAddress) {
    console.log("Initializing ShadowDex integration...");
    await lotterySwap.initializeFullShadowDex(
      routerAddress,
      quoterAddress,
      x33Address,
      beetsLpAddress,
      usdcAddress,
      ve69LPAddress
    );
    console.log("ShadowDex integration initialized successfully");
  } else {
    console.log("ShadowDex integration can be initialized later using initializeFullShadowDex");
  }
  
  console.log("\nVerify with:");
  console.log(`npx hardhat verify --network sonic ${lotterySwap.address} ${wsAddress} ${verifierAddress} ${registryAddress || ethers.constants.AddressZero} ${goldScratcherAddress || ethers.constants.AddressZero}`);
  
  return { lotterySwap };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 