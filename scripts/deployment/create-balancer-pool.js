const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Create a weighted 80/20 Balancer (Beethoven X) pool for RedDragon/wSonic
 * This creates the LP that will be used for the ve8020 system and the lottery boost
 */
async function main() {
  console.log("🚀 Creating weighted 80/20 Balancer pool for RedDragon/wSonic...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);
    const deployerBalance = await deployer.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", hre.ethers.utils.formatEther(deployerBalance), "wS");

    // Load deployment addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    let addresses = {};
    
    try {
      if (fs.existsSync(deploymentFile)) {
        addresses = JSON.parse(fs.readFileSync(deploymentFile));
        console.log("📝 Loaded existing deployment addresses");
      } else {
        console.error("❌ No deployment addresses file found");
        return;
      }
    } catch (error) {
      console.error("❌ Error loading deployment addresses:", error);
      return;
    }
    
    // Check for required addresses
    if (!addresses.redDragon || !addresses.wrappedSonic) {
      console.error("❌ Missing required token addresses in deployment file");
      console.log("Required addresses: redDragon, wrappedSonic");
      return;
    }

    // Connect to deployed contracts
    const redDragon = await hre.ethers.getContractAt("RedDragon", addresses.redDragon);
    const wrappedSonic = await hre.ethers.getContractAt("IERC20", addresses.wrappedSonic);

    // Get Balancer Vault address
    const balancerVaultAddress = process.env.BALANCER_VAULT_ADDRESS;
    if (!balancerVaultAddress) {
      console.error("❌ Balancer Vault address not found. Please set BALANCER_VAULT_ADDRESS in .env");
      return;
    }
    console.log("📝 Balancer Vault address:", balancerVaultAddress);

    // Get Balancer Factory address
    const balancerFactoryAddress = process.env.BALANCER_FACTORY_ADDRESS;
    if (!balancerFactoryAddress) {
      console.error("❌ Balancer Factory address not found. Please set BALANCER_FACTORY_ADDRESS in .env");
      return;
    }
    console.log("📝 Balancer Factory address:", balancerFactoryAddress);

    // Connect to Balancer contracts
    const balancerVault = await hre.ethers.getContractAt("IVault", balancerVaultAddress);
    const weightedPoolFactory = await hre.ethers.getContractAt("IWeightedPoolFactory", balancerFactoryAddress);

    // Check if pool already exists
    if (addresses.balancerPool) {
      console.log("⚠️ Balancer pool already exists at", addresses.balancerPool);
      console.log("Skipping pool creation. To create a new pool, remove the balancerPool address from the deployment file.");
      return;
    }

    // Configure pool parameters
    const poolName = "RedDragon-wSonic 80/20";
    const poolSymbol = "80RED-20wS";
    const tokens = [
      addresses.redDragon, // RedDragon
      addresses.wrappedSonic   // wSonic
    ].sort(); // Tokens must be sorted by address

    // Sort index for tokens (important for Balancer)
    const redDragonIndex = tokens.indexOf(addresses.redDragon);
    const wSonicIndex = tokens.indexOf(addresses.wrappedSonic);

    // Weights must sum to 1e18 (100%)
    // 80% for RedDragon, 20% for wSonic
    const weights = Array(2).fill(0);
    weights[redDragonIndex] = hre.ethers.utils.parseEther("0.8"); // 80%
    weights[wSonicIndex] = hre.ethers.utils.parseEther("0.2");    // 20%

    // Set swap fee 0.3%
    const swapFee = hre.ethers.utils.parseEther("0.003");
    
    // Create pool
    console.log("\n📦 Creating Balancer weighted pool...");
    console.log("Pool tokens:", tokens);
    console.log("Weights:", weights.map(w => hre.ethers.utils.formatEther(w)));
    
    // Create pool using the factory
    console.log("Creating pool...");
    const tx = await weightedPoolFactory.create(
      poolName,
      poolSymbol,
      tokens,
      weights,
      swapFee,
      deployer.address // Owner
    );
    
    // Wait for transaction to be mined
    console.log("Waiting for pool creation transaction to be mined...");
    const receipt = await tx.wait();
    
    // Extract pool address from event logs
    let poolAddress;
    for (const event of receipt.events) {
      if (event.event === "PoolCreated") {
        poolAddress = event.args.pool;
        break;
      }
    }
    
    if (!poolAddress) {
      console.error("❌ Failed to extract pool address from transaction logs");
      return;
    }
    
    console.log("✅ Balancer pool created at:", poolAddress);
    
    // Save pool address
    addresses.balancerPool = poolAddress;
    
    // Get pool ID
    const poolContract = await hre.ethers.getContractAt("IWeightedPool", poolAddress);
    const poolId = await poolContract.getPoolId();
    console.log("📝 Pool ID:", poolId);
    addresses.balancerPoolId = poolId;
    
    // Save to deployment file
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    console.log("📝 Saved pool address and ID to deployment file");
    
    // Instructions for next steps
    console.log("\n⚠️ Next Steps:");
    console.log("1. Run the add-balancer-liquidity.js script to add liquidity to the pool");
    console.log("2. Set the LP token (pool address) in the lottery contract using setup-liquidity.js");
    console.log(`3. Add the LP token address to your .env: LP_TOKEN_ADDRESS=${poolAddress}`);
    
    console.log("\n🎉 Balancer pool setup completed!");
    
  } catch (error) {
    console.error("❌ Setup failed:", error);
    console.error(error.stack);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 