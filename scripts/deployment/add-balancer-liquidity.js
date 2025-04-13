const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Add initial liquidity to the Balancer 80/20 pool
 */
async function main() {
  console.log("🚀 Adding initial liquidity to Balancer 80/20 pool...");

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
    if (!addresses.redDragon || !addresses.wrappedSonic || !addresses.balancerPool || !addresses.balancerPoolId) {
      console.error("❌ Missing required addresses in deployment file");
      console.log("Required addresses: redDragon, wrappedSonic, balancerPool, balancerPoolId");
      return;
    }

    // Connect to deployed contracts
    const redDragon = await hre.ethers.getContractAt("RedDragon", addresses.redDragon);
    const wrappedSonic = await hre.ethers.getContractAt("IERC20", addresses.wrappedSonic);
    const balancerPool = await hre.ethers.getContractAt("IWeightedPool", addresses.balancerPool);

    // Get Balancer Vault address
    const balancerVaultAddress = process.env.BALANCER_VAULT_ADDRESS;
    if (!balancerVaultAddress) {
      console.error("❌ Balancer Vault address not found. Please set BALANCER_VAULT_ADDRESS in .env");
      return;
    }
    console.log("📝 Balancer Vault address:", balancerVaultAddress);

    // Connect to Balancer Vault
    const balancerVault = await hre.ethers.getContractAt("IVault", balancerVaultAddress);

    // Get liquidity amounts from environment or prompt user
    const redDragonAmount = process.env.INITIAL_REDDRAGON_LIQUIDITY 
      ? hre.ethers.utils.parseEther(process.env.INITIAL_REDDRAGON_LIQUIDITY)
      : hre.ethers.utils.parseEther("1000000"); // Default: 1M RedDragon
    
    const wSonicAmount = process.env.INITIAL_WSONIC_LIQUIDITY
      ? hre.ethers.utils.parseEther(process.env.INITIAL_WSONIC_LIQUIDITY)
      : hre.ethers.utils.parseEther("50000"); // Default: 50K wSonic
    
    console.log("\n📋 Liquidity Configuration:");
    console.log("- RedDragon Amount:", hre.ethers.utils.formatEther(redDragonAmount), "RED");
    console.log("- wSonic Amount:", hre.ethers.utils.formatEther(wSonicAmount), "wS");

    // Check balances
    const redDragonBalance = await redDragon.balanceOf(deployer.address);
    const wSonicBalance = await wrappedSonic.balanceOf(deployer.address);

    console.log("\n📋 Your Token Balances:");
    console.log("- RedDragon Balance:", hre.ethers.utils.formatEther(redDragonBalance), "RED");
    console.log("- wSonic Balance:", hre.ethers.utils.formatEther(wSonicBalance), "wS");

    if (redDragonBalance.lt(redDragonAmount)) {
      console.error(`❌ Insufficient RedDragon balance. Need ${hre.ethers.utils.formatEther(redDragonAmount)} RED`);
      return;
    }

    if (wSonicBalance.lt(wSonicAmount)) {
      console.error(`❌ Insufficient wSonic balance. Need ${hre.ethers.utils.formatEther(wSonicAmount)} wS`);
      return;
    }

    // Approve tokens to Balancer Vault
    console.log("\n🔄 Approving tokens to Balancer Vault...");
    
    console.log("Approving RedDragon...");
    const redDragonApproveTx = await redDragon.approve(balancerVaultAddress, redDragonAmount);
    await redDragonApproveTx.wait();
    
    console.log("Approving wSonic...");
    const wSonicApproveTx = await wrappedSonic.approve(balancerVaultAddress, wSonicAmount);
    await wSonicApproveTx.wait();
    
    console.log("✅ Approvals completed");

    // Prepare tokens and amounts for join
    // Note: tokens must be sorted by address
    const tokens = [addresses.redDragon, addresses.wrappedSonic].sort();
    
    // Determine token indexes
    const redDragonIndex = tokens.indexOf(addresses.redDragon);
    const wSonicIndex = tokens.indexOf(addresses.wrappedSonic);
    
    // Prepare amounts array based on token order
    const amountsIn = Array(2).fill(0);
    amountsIn[redDragonIndex] = redDragonAmount;
    amountsIn[wSonicIndex] = wSonicAmount;
    
    // Prepare join transaction
    const JOIN_KIND_INIT = 0; // Initialization of the pool
    const userData = hre.ethers.utils.defaultAbiCoder.encode(
      ['uint256', 'uint256[]'],
      [JOIN_KIND_INIT, amountsIn]
    );
    
    const joinPoolRequest = {
      assets: tokens,
      maxAmountsIn: amountsIn,
      userData,
      fromInternalBalance: false
    };
    
    // Join pool
    console.log("\n🔄 Adding liquidity to pool...");
    const joinTx = await balancerVault.joinPool(
      addresses.balancerPoolId,
      deployer.address,
      deployer.address,
      joinPoolRequest
    );
    
    console.log("Waiting for transaction to be mined...");
    await joinTx.wait();
    
    console.log("✅ Liquidity added successfully!");
    
    // Get pool token balance
    const bptBalance = await balancerPool.balanceOf(deployer.address);
    console.log("\n📋 Your Pool Token Balance:", hre.ethers.utils.formatEther(bptBalance), "BPT");
    
    // Update LP token in deployment addresses if not already set
    if (!addresses.lpToken) {
      addresses.lpToken = addresses.balancerPool;
      fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
      console.log("📝 Updated lpToken in deployment file");
    }
    
    console.log("\n⚠️ Next Steps:");
    console.log("1. Run setup-liquidity.js to configure the LP token and exchange pair");
    console.log("2. Deploy ve8020 (if not already deployed)");
    console.log("3. Run transfer-ownership.js to transfer ownership to the multisig");
    
    console.log("\n🎉 Liquidity setup completed!");
    
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