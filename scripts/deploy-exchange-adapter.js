const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying DragonExchangeAdapter...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  // Get addresses from environment variables
  const wsToken = process.env.WS_TOKEN_ADDRESS;
  const dragonToken = process.env.DRAGON_TOKEN_ADDRESS;
  const balancerVault = process.env.BALANCER_VAULT_ADDRESS;
  const poolId = process.env.BALANCER_POOL_ID;
  const bptToken = process.env.BALANCER_BPT_ADDRESS;
  const jackpotAddress = process.env.JACKPOT_ADDRESS;
  const ve69LPAddress = process.env.VE69LP_ADDRESS;
  
  // Whether to set as exchange pair immediately (be careful with this)
  const setAsExchangePair = process.env.SET_AS_EXCHANGE_PAIR === "true";
  
  // Validate required addresses
  const requiredAddresses = {
    WS_TOKEN_ADDRESS: wsToken,
    DRAGON_TOKEN_ADDRESS: dragonToken,
    BALANCER_VAULT_ADDRESS: balancerVault,
    BALANCER_POOL_ID: poolId,
    BALANCER_BPT_ADDRESS: bptToken,
    JACKPOT_ADDRESS: jackpotAddress,
    VE69LP_ADDRESS: ve69LPAddress
  };
  
  const missingAddresses = Object.entries(requiredAddresses)
    .filter(([_, value]) => !value)
    .map(([key]) => key);
  
  if (missingAddresses.length > 0) {
    console.error("ERROR: Missing required environment variables:");
    missingAddresses.forEach(key => console.error(`- ${key}`));
    console.error("Please set all required addresses in your .env file");
    process.exit(1);
  }
  
  console.log("\nDeployment Parameters:");
  console.log(`- WS Token: ${wsToken}`);
  console.log(`- Dragon Token: ${dragonToken}`);
  console.log(`- Balancer Vault: ${balancerVault}`);
  console.log(`- Pool ID: ${poolId}`);
  console.log(`- BPT Token: ${bptToken}`);
  console.log(`- Jackpot: ${jackpotAddress}`);
  console.log(`- ve69LP: ${ve69LPAddress}`);
  console.log(`- Set as Exchange Pair: ${setAsExchangePair}`);
  
  // Deploy DragonExchangeAdapter
  console.log("\nDeploying DragonExchangeAdapter...");
  const DragonExchangeAdapter = await ethers.getContractFactory("DragonExchangeAdapter");
  const adapter = await DragonExchangeAdapter.deploy(
    wsToken,
    dragonToken,
    balancerVault,
    poolId,
    bptToken,
    jackpotAddress,
    ve69LPAddress,
    setAsExchangePair
  );
  
  await adapter.deployed();
  console.log(`DragonExchangeAdapter deployed to: ${adapter.address}`);
  
  // If not set as exchange pair, remind user
  if (!setAsExchangePair) {
    console.log("\n*** IMPORTANT: The adapter has NOT been set as the exchange pair ***");
    console.log("To set it as the exchange pair, call the following function:");
    console.log(`await dragonToken.setExchangePair("${adapter.address}")`);
    console.log("Or via the adapter:");
    console.log(`await adapter.setAsExchangePair()`);
  } else {
    console.log("\nAdapter has been set as the exchange pair for the Dragon token.");
  }
  
  // Verification instructions
  console.log("\nTo verify the contract on SonicScan:");
  console.log(`npx hardhat verify --network sonic ${adapter.address} ${wsToken} ${dragonToken} ${balancerVault} ${poolId} ${bptToken} ${jackpotAddress} ${ve69LPAddress} ${setAsExchangePair}`);
  
  return { adapter };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 