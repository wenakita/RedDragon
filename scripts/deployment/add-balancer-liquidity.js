const hre = require("hardhat");
const { parseUnits, formatUnits } = require("ethers");
const fs = require('fs');
require("dotenv").config();

/**
 * Add initial liquidity to the 80/20 Balancer/Beets pool
 */
async function main() {
  console.log("🚀 Adding initial liquidity to 80/20 Balancer/Beets pool...");

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
        console.error("❌ No deployment addresses file found. Run create-balancer-pool.js first.");
        process.exit(1);
      }
    } catch (error) {
      console.error("❌ Error reading deployment addresses:", error.message);
      process.exit(1);
    }

    // Verify we have the necessary addresses
    if (!addresses.redDragon) {
      console.error("❌ RedDragon token address not found");
      process.exit(1);
    }
    if (!addresses.balancerIntegration) {
      console.error("❌ BalancerIntegration address not found");
      process.exit(1);
    }
    if (!addresses.lpToken) {
      console.error("❌ LP token address not found");
      process.exit(1);
    }

    // Get contract instances
    const pairedTokenAddress = process.env.PAIRED_TOKEN_ADDRESS;
    const redDragonAddress = addresses.redDragon;
    const balancerIntegrationAddress = addresses.balancerIntegration;
    
    // Create contract instances
    const IERC20 = [
      "function approve(address spender, uint256 amount) external returns (bool)",
      "function balanceOf(address account) external view returns (uint256)",
      "function transfer(address to, uint256 amount) external returns (bool)"
    ];

    const IBalancerIntegration = [
      "function addInitialLiquidity(uint256 dragonAmount, uint256 pairedTokenAmount) external returns (uint256)",
      "function addLiquidity(uint256 dragonAmount, uint256 pairedTokenAmount) external returns (uint256)",
      "function poolAddress() external view returns (address)"
    ];

    const dragonToken = new hre.ethers.Contract(redDragonAddress, IERC20, deployer);
    const pairedToken = new hre.ethers.Contract(pairedTokenAddress, IERC20, deployer);
    const balancerIntegration = new hre.ethers.Contract(balancerIntegrationAddress, IBalancerIntegration, deployer);

    // Calculate liquidity amounts (80% DRAGON, 20% wS)
    // Adjust these values based on your tokenomics and available tokens
    const dragonAmount = parseUnits("8000000", 18); // 8 million DRAGON tokens (80%)
    const pairedAmount = parseUnits("2", 18);      // 2 wS (20%)

    // Check balances
    const dragonBalance = await dragonToken.balanceOf(deployer.address);
    const pairedBalance = await pairedToken.balanceOf(deployer.address);

    console.log("\n📋 Token balances:");
    console.log(`- DRAGON: ${formatUnits(dragonBalance, 18)} (need ${formatUnits(dragonAmount, 18)})`);
    console.log(`- wS: ${formatUnits(pairedBalance, 18)} (need ${formatUnits(pairedAmount, 18)})`);

    if (dragonBalance.lt(dragonAmount)) {
      console.error("❌ Insufficient DRAGON token balance");
      process.exit(1);
    }

    if (pairedBalance.lt(pairedAmount)) {
      console.error("❌ Insufficient wS token balance");
      process.exit(1);
    }

    // Approve tokens for the BalancerIntegration contract
    console.log("\n📦 Approving tokens...");
    const approveRedDragonTx = await dragonToken.approve(balancerIntegrationAddress, dragonAmount);
    await approveRedDragonTx.wait();
    console.log("✅ DRAGON tokens approved");

    const approvePairedTx = await pairedToken.approve(balancerIntegrationAddress, pairedAmount);
    await approvePairedTx.wait();
    console.log("✅ wS tokens approved");

    // Add initial liquidity
    console.log("\n📦 Adding initial liquidity...");
    const addLiquidityTx = await balancerIntegration.addInitialLiquidity(dragonAmount, pairedAmount);
    await addLiquidityTx.wait();
    console.log("✅ Initial liquidity added successfully");

    // Get pool address
    const poolAddress = await balancerIntegration.poolAddress();
    const poolToken = new hre.ethers.Contract(poolAddress, IERC20, deployer);
    const lpBalance = await poolToken.balanceOf(deployer.address);
    
    console.log("\n📋 Liquidity summary:");
    console.log(`- Pool address: ${poolAddress}`);
    console.log(`- LP tokens received: ${formatUnits(lpBalance, 18)}`);
    console.log(`- DRAGON tokens added: ${formatUnits(dragonAmount, 18)}`);
    console.log(`- wS tokens added: ${formatUnits(pairedAmount, 18)}`);

    console.log("\n🎉 Liquidity addition complete!");
    
    console.log("\n🔹 Next steps:");
    console.log("1. Deploy ve8020 contract:");
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