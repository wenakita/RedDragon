const hre = require("hardhat");
const { parseUnits, formatUnits } = require("ethers");
const fs = require('fs');
require("dotenv").config();

/**
 * Create an 80/20 Balancer/Beets pool for DRAGON-wS
 */
async function main() {
  console.log("🚀 Creating 80/20 Balancer/Beets pool for DRAGON-wS...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);

    // Load deployment addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    let addresses = {};
    
    try {
      if (fs.existsSync(deploymentFile)) {
        addresses = JSON.parse(fs.readFileSync(deploymentFile));
        console.log("📝 Loaded existing deployment addresses");
      } else {
        console.error("❌ No deployment addresses file found. Run deploy-reddragon-sonic.js first.");
        process.exit(1);
      }
    } catch (error) {
      console.error("❌ Error reading deployment addresses:", error.message);
      process.exit(1);
    }

    // Get token addresses
    const redDragonAddress = addresses.redDragon || process.env.RED_DRAGON_ADDRESS;
    if (!redDragonAddress) {
      console.error("❌ RedDragon token address not found");
      process.exit(1);
    }

    // Balancer/Beets specific addresses
    const balancerVaultAddress = process.env.BALANCER_VAULT_ADDRESS;
    const weightedPoolFactoryAddress = process.env.BALANCER_WEIGHTED_POOL_FACTORY_ADDRESS;
    const pairedTokenAddress = process.env.PAIRED_TOKEN_ADDRESS; // wS

    console.log("\n📋 Configuration:");
    console.log("- RedDragon Token:", redDragonAddress);
    console.log("- Paired Token (wS):", pairedTokenAddress);
    console.log("- Balancer Vault:", balancerVaultAddress);
    console.log("- Weighted Pool Factory:", weightedPoolFactoryAddress);

    // Deploy RedDragonBalancerIntegration
    console.log("\n📦 Deploying RedDragonBalancerIntegration...");
    const RedDragonBalancerIntegration = await hre.ethers.getContractFactory("RedDragonBalancerIntegration");
    
    // First deploy LP Burner 
    console.log("\n📦 Deploying RedDragonLPBurner...");
    const RedDragonLPBurner = await hre.ethers.getContractFactory("RedDragonLPBurner");
    const lpBurner = await RedDragonLPBurner.deploy(
      process.env.JACKPOT_VAULT_ADDRESS || deployer.address // Use jackpot vault as fee collector
    );
    await lpBurner.waitForDeployment();
    const lpBurnerAddress = await lpBurner.getAddress();
    console.log("✅ RedDragonLPBurner deployed to:", lpBurnerAddress);

    // Now deploy the Balancer Integration
    const balancerIntegration = await RedDragonBalancerIntegration.deploy(
      balancerVaultAddress,
      weightedPoolFactoryAddress,
      redDragonAddress,
      pairedTokenAddress,
      lpBurnerAddress
    );
    await balancerIntegration.waitForDeployment();
    const balancerIntegrationAddress = await balancerIntegration.getAddress();
    console.log("✅ RedDragonBalancerIntegration deployed to:", balancerIntegrationAddress);

    // Create 80/20 pool with 0.25% fee
    console.log("\n📦 Creating 80/20 pool...");
    const createPoolTx = await balancerIntegration.createPool(25); // 0.25% swap fee
    await createPoolTx.wait();
    
    // Get pool address
    const poolAddress = await balancerIntegration.poolAddress();
    console.log("✅ Pool created at:", poolAddress);
    console.log("✅ Pool ID:", await balancerIntegration.poolId());

    // Save addresses to deployment file
    addresses.lpBurner = lpBurnerAddress;
    addresses.balancerIntegration = balancerIntegrationAddress;
    addresses.lpToken = poolAddress;
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));

    // Update .env with LP token address
    let envContent = fs.readFileSync('.env', 'utf8');
    envContent = envContent.replace(/LP_TOKEN_ADDRESS=".*"/, `LP_TOKEN_ADDRESS="${poolAddress}"`);
    fs.writeFileSync('.env', envContent);

    console.log("\n🎉 80/20 pool creation complete!");
    console.log("\n📋 Summary:");
    console.log("- LP Token (Pool Token):", poolAddress);
    console.log("- LP Burner:", lpBurnerAddress);
    console.log("- Balancer Integration:", balancerIntegrationAddress);

    console.log("\n🔹 Next steps:");
    console.log("1. Add initial liquidity to the pool:");
    console.log("   npx hardhat run scripts/deployment/add-balancer-liquidity.js --network sonic");
    console.log("2. Deploy ve8020 contract:");
    console.log("   npx hardhat run scripts/deployment/deploy-ve8020.js --network sonic");

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script error:", error);
    process.exit(1);
  }); 