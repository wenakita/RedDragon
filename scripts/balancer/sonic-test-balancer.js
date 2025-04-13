// Script to test the $DRAGON Balancer 80/20 implementation on Sonic network
const { ethers } = require("hardhat");

// Sonic network addresses
const SONIC_ADDRESSES = {
  BALANCER_VAULT: "0xBA12222222228d8Ba445958a75a0704d566BF2C8", // Vault V2
  WEIGHTED_POOL_FACTORY: "0x22f5b7FDD99076f1f20f8118854ce3984544D56d",
  WSONIC: "0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38" // Wrapped Sonic
};

// Sonic network chainIds (there's some inconsistency in documentation)
const SONIC_CHAIN_IDS = [146, 64165];

async function main() {
  console.log("Testing $DRAGON Balancer 80/20 implementation on Sonic network...");
  
  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  
  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log(`Network: ${network.name} (chainId: ${network.chainId})`);
  
  // Verify we're on the right network (Sonic Network has chainId 146 or 64165)
  if (!SONIC_CHAIN_IDS.includes(Number(network.chainId))) {
    console.warn(`WARNING: Not running on Sonic Network (expected chainId 146, got ${network.chainId})`);
    console.warn(`This script is designed to work with Sonic Network addresses`);
    
    // Uncomment to force exit if not on Sonic
    // console.error("Exiting due to wrong network");
    // return;
  } else {
    console.log("✓ Connected to Sonic Network");
  }
  
  // Get DRAGON token address
  let dragonTokenAddress;
  try {
    const deploymentAddresses = require("../deployment-addresses-sonic.json");
    dragonTokenAddress = deploymentAddresses.RedDragon;
    console.log(`Using existing RedDragon token address: ${dragonTokenAddress}`);
  } catch (error) {
    console.error("Could not find existing token address, please provide it manually below");
    dragonTokenAddress = "0x0000000000000000000000000000000000000000"; // Replace with actual address
  }
  
  // Make sure we have a valid DRAGON token address
  if (dragonTokenAddress === "0x0000000000000000000000000000000000000000") {
    console.error("Invalid DRAGON token address. Please update the script with your token address.");
    return;
  }
  
  // Get the MultiSig wallet address
  const multiSigAddress = "0x7F9634C927890F8675b1CA7f35C485EAb772A113"; // Replace with your actual MultiSig address
  
  console.log("\n=== Deployment Info ===");
  console.log(`DRAGON Token: ${dragonTokenAddress}`);
  console.log(`MultiSig Wallet: ${multiSigAddress}`);
  console.log(`Balancer Vault: ${SONIC_ADDRESSES.BALANCER_VAULT}`);
  console.log(`WeightedPoolFactory: ${SONIC_ADDRESSES.WEIGHTED_POOL_FACTORY}`);
  console.log(`Paired Token (wSONC): ${SONIC_ADDRESSES.WSONIC}`);
  
  // Option 1: Deploy a new Balancer Integration
  console.log("\n=== Option 1: Deploy New Contracts ===");
  console.log("To deploy new contracts, run:");
  console.log("npx hardhat run scripts/deploy-security-contracts.js --network sonic");
  
  // Option 2: Work with existing contracts
  console.log("\n=== Option 2: Use Existing Contracts ===");
  console.log("If you've already deployed the contracts, you can use these steps:");
  
  // Example code to interact with existing contracts
  console.log(`
// Connect to LP Burner
const lpBurner = await ethers.getContractAt("RedDragonLPBurner", "YOUR_LP_BURNER_ADDRESS");

// Connect to Balancer Integration
const balancerIntegration = await ethers.getContractAt(
  "RedDragonBalancerIntegration", 
  "YOUR_INTEGRATION_ADDRESS"
);

// Optional: Set a custom pool name 
// This must be done BEFORE creating the pool
await balancerIntegration.setPoolNameAndSymbol(
  "80DRAGON-20SONIC", 
  "DR-SONIC" // Using a shorter symbol
);

// Create a new pool with 0.25% fee
const createPoolTx = await balancerIntegration.createPool(25);
await createPoolTx.wait();
console.log("80/20 pool created!");

// Get the pool address
const poolAddress = await balancerIntegration.poolAddress();
console.log(\`Pool address: \${poolAddress}\`);

// Add initial liquidity
// First approve tokens
const dragonToken = await ethers.getContractAt("IERC20", "${dragonTokenAddress}");
const pairedToken = await ethers.getContractAt("IERC20", "${SONIC_ADDRESSES.WSONIC}");

const dragonAmount = ethers.utils.parseEther("10000000"); // 10M DRAGON
const pairedAmount = ethers.utils.parseEther("2500000");  // 2.5M Staked Sonic (adjust based on token values)

await dragonToken.approve(balancerIntegration.address, dragonAmount);
await pairedToken.approve(balancerIntegration.address, pairedAmount);

// Add the liquidity
const addLiquidityTx = await balancerIntegration.addInitialLiquidity(dragonAmount, pairedAmount);
await addLiquidityTx.wait();
console.log("Initial liquidity added!");
  `);
  
  // Verification steps
  console.log("\n=== Verification Steps ===");
  console.log("1. Verify pool creation on Balancer/Beethoven X interface");
  console.log("2. Check LP token balance");
  console.log("3. Verify pool composition (should be 80/20)");
  console.log("4. Burn a portion of LP tokens for security");
  console.log("5. Transfer ownership/admin rights to MultiSig");
  
  // Explain how to burn LP
  console.log("\n=== LP Burning Example ===");
  console.log(`
// Get LP token balance
const lpToken = await ethers.getContractAt("IERC20", poolAddress);
const lpBalance = await lpToken.balanceOf(deployer.address);

// Approve LP tokens for the Balancer Integration
await lpToken.approve(balancerIntegration.address, lpBalance);

// Burn 20% of LP tokens, send 80% to fee collector
const burnTx = await balancerIntegration.burnPoolTokens(lpBalance);
await burnTx.wait();
console.log("LP tokens processed: 20% burned, 80% sent to fee collector");
  `);
  
  console.log("\n=== Important Security Note ===");
  console.log("After deployment and setup, all critical functions should be managed through the MultiSig wallet.");
  console.log("This ensures proper security and decentralized control over the protocol.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 