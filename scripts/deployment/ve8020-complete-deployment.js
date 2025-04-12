const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Complete ve(80/20) system deployment script
 * Deploys and configures all components of the ve(80/20) system in one go
 */
async function main() {
  console.log("🚀 Starting complete ve(80/20) system deployment...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);
    const deployerBalance = await deployer.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", hre.ethers.formatUnits(deployerBalance, 18), "wS");

    // Track deployed addresses
    const deploymentFile = "ve8020-deployment.json";
    let addresses = {};
    
    // Add existing RedDragon token address if specified in .env
    if (process.env.RED_DRAGON_ADDRESS) {
      addresses.redDragon = process.env.RED_DRAGON_ADDRESS;
      console.log("📝 Using existing RedDragon token:", addresses.redDragon);
    }

    // Configure environment variables
    addresses.jackpotVault = process.env.JACKPOT_VAULT_ADDRESS || deployer.address;
    addresses.burnAddress = process.env.BURN_ADDRESS || "0x000000000000000000000000000000000000dEaD";
    addresses.wrappedSonic = process.env.WRAPPED_SONIC_ADDRESS || "0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38";
    
    console.log("\n📋 Configuration:");
    console.log(`- Jackpot Vault: ${addresses.jackpotVault}`);
    console.log(`- Burn Address: ${addresses.burnAddress}`);
    console.log(`- Wrapped Sonic: ${addresses.wrappedSonic}`);

    // Step 1: Deploy RedDragon token if needed
    if (!addresses.redDragon) {
      console.log("\n📦 Step 1: Deploying RedDragon token...");
      
      console.log("Deploying RedDragonVerifier...");
      const RedDragonVerifier = await hre.ethers.getContractFactory("RedDragonVerifier");
      const verifier = await RedDragonVerifier.deploy(
        "0x0000000000000000000000000000000000000000", // Placeholder, will be updated
        "0x0000000000000000000000000000000000000000", // Placeholder, will be updated
        "0x0000000000000000000000000000000000000000", // Placeholder, will be updated
        "0x0000000000000000000000000000000000000000"  // Placeholder, will be updated
      );
      await verifier.waitForDeployment();
      const verifierAddress = await verifier.getAddress();
      console.log("✅ RedDragonVerifier deployed to:", verifierAddress);
      addresses.verifier = verifierAddress;
      
      console.log("Deploying RedDragon token...");
      const RedDragon = await hre.ethers.getContractFactory("RedDragon");
      const redDragon = await RedDragon.deploy(
        addresses.wrappedSonic,
        addresses.jackpotVault,
        deployer.address, // liquidityVault
        deployer.address, // developmentVault
        addresses.burnAddress,
        verifierAddress
      );
      await redDragon.waitForDeployment();
      const redDragonAddress = await redDragon.getAddress();
      console.log("✅ RedDragon token deployed to:", redDragonAddress);
      addresses.redDragon = redDragonAddress;
      
      // Deploy lottery
      console.log("Deploying RedDragonSwapLottery...");
      const RedDragonSwapLottery = await hre.ethers.getContractFactory("RedDragonSwapLottery");
      const lottery = await RedDragonSwapLottery.deploy(
        addresses.wrappedSonic,
        verifierAddress
      );
      await lottery.waitForDeployment();
      const lotteryAddress = await lottery.getAddress();
      console.log("✅ RedDragonSwapLottery deployed to:", lotteryAddress);
      addresses.lottery = lotteryAddress;
      
      // Update verifier with actual addresses
      console.log("Updating RedDragonVerifier with actual addresses...");
      await verifier.setContractAddresses(
        redDragonAddress,
        lotteryAddress,
        "0x0000000000000000000000000000000000000000", // LP Burner will be updated later
        "0x0000000000000000000000000000000000000000"  // LP Token will be updated later
      );
      
      // Set RedDragon token to use the lottery
      console.log("Setting lottery address in RedDragon token...");
      await redDragon.setLotteryAddress(lotteryAddress);
      
      console.log("✅ Step 1 complete: RedDragon token system deployed");
    } else {
      console.log("\n⏩ Step 1 skipped: Using existing RedDragon token");
      
      // Try to load lottery address from .env
      if (process.env.LOTTERY_ADDRESS) {
        addresses.lottery = process.env.LOTTERY_ADDRESS;
        console.log("📝 Using existing lottery:", addresses.lottery);
      } else {
        // Need to figure out lottery address from token
        console.log("Connecting to RedDragon token to get lottery address...");
        const redDragon = await hre.ethers.getContractAt("RedDragon", addresses.redDragon);
        addresses.lottery = await redDragon.lotteryAddress();
        console.log("📝 Found lottery address:", addresses.lottery);
      }
    }
    
    // Save addresses after token deployment
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    console.log(`📝 Saved addresses to ${deploymentFile}`);

    // Step 2: Skip LP Burner, directly use token pair
    console.log("\n📦 Step 2: Setting up LP token...");
    
    // Check if we have an LP token address
    let lpTokenAddress = process.env.LP_TOKEN_ADDRESS;
    if (lpTokenAddress) {
      console.log(`📝 Using existing LP token: ${lpTokenAddress}`);
      addresses.lpToken = lpTokenAddress;
    } else {
      console.log("⚠️ No LP token address provided in .env (LP_TOKEN_ADDRESS)");
      console.log("⚠️ Using jackpot vault address as placeholder. Update this later!");
      lpTokenAddress = addresses.jackpotVault;
      addresses.lpToken = lpTokenAddress;
    }
    
    // Update verifier if needed
    if (addresses.verifier) {
      console.log("Updating verifier with LP Token address...");
      const verifier = await hre.ethers.getContractAt("RedDragonVerifier", addresses.verifier);
      await verifier.setContractAddresses(
        addresses.redDragon,
        addresses.lottery,
        "0x0000000000000000000000000000000000000000", // No LP Burner
        lpTokenAddress
      );
      console.log("✅ Verifier updated");
    }
    
    // Save addresses after LP setup
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    // Step 3: Deploy ve8020 contract
    console.log("\n📦 Step 3: Deploying ve8020 contract...");
    const Ve8020 = await hre.ethers.getContractFactory("ve8020");
    const ve8020 = await Ve8020.deploy(lpTokenAddress);
    await ve8020.waitForDeployment();
    const ve8020Address = await ve8020.getAddress();
    console.log("✅ ve8020 contract deployed to:", ve8020Address);
    addresses.ve8020 = ve8020Address;
    
    // Save addresses after ve8020 deployment
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    // Step 4: Deploy Ve8020FeeDistributor
    console.log("\n📦 Step 4: Deploying Ve8020FeeDistributor...");
    const Ve8020FeeDistributor = await hre.ethers.getContractFactory("Ve8020FeeDistributor");
    const feeDistributor = await Ve8020FeeDistributor.deploy(
      ve8020Address,
      addresses.redDragon
    );
    await feeDistributor.waitForDeployment();
    const feeDistributorAddress = await feeDistributor.getAddress();
    console.log("✅ Ve8020FeeDistributor deployed to:", feeDistributorAddress);
    addresses.ve8020FeeDistributor = feeDistributorAddress;
    
    // Save addresses after fee distributor deployment
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    // Step 5: Deploy RedDragonFeeManager
    console.log("\n📦 Step 5: Deploying RedDragonFeeManager...");
    const RedDragonFeeManager = await hre.ethers.getContractFactory("RedDragonFeeManager");
    const feeManager = await RedDragonFeeManager.deploy(
      addresses.redDragon,
      feeDistributorAddress,
      addresses.jackpotVault,
      addresses.burnAddress
    );
    await feeManager.waitForDeployment();
    const feeManagerAddress = await feeManager.getAddress();
    console.log("✅ RedDragonFeeManager deployed to:", feeManagerAddress);
    addresses.feeManager = feeManagerAddress;
    
    // Save addresses after fee manager deployment
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    // Step 6: Configure RedDragon to use fee manager
    console.log("\n📦 Step 6: Configuring RedDragon token to use fee manager...");
    const redDragon = await hre.ethers.getContractAt("RedDragon", addresses.redDragon);
    
    // Set fee manager as lottery address to receive jackpot fees
    console.log("Setting fee manager as lottery address in RedDragon token...");
    await redDragon.setLotteryAddress(feeManagerAddress);
    
    // Set lottery in fee manager
    console.log("Setting lottery in fee manager...");
    await feeManager.setLottery(addresses.lottery);
    
    console.log("✅ RedDragon token configured to use fee manager");
    
    // Step 7: Try deploying the lottery integrator if we own the lottery
    console.log("\n📦 Step 7: Attempting to deploy ve8020LotteryIntegrator...");
    
    try {
      const lottery = await hre.ethers.getContractAt("RedDragonSwapLottery", addresses.lottery);
      const lotteryOwner = await lottery.owner();
      
      if (lotteryOwner.toLowerCase() === deployer.address.toLowerCase()) {
        console.log("You are the lottery owner. Deploying lottery integrator...");
        
        const Ve8020LotteryIntegrator = await hre.ethers.getContractFactory("ve8020LotteryIntegrator");
        const integrator = await Ve8020LotteryIntegrator.deploy(
          ve8020Address,
          addresses.lottery
        );
        await integrator.waitForDeployment();
        const integratorAddress = await integrator.getAddress();
        console.log("✅ ve8020LotteryIntegrator deployed to:", integratorAddress);
        addresses.ve8020LotteryIntegrator = integratorAddress;
        
        // Verify lottery using integrator
        const votingToken = await lottery.votingToken();
        if (votingToken.toLowerCase() === integratorAddress.toLowerCase()) {
          console.log("✅ Lottery correctly configured to use the integrator");
        } else {
          console.log("⚠️ Lottery voting token is not set to the integrator");
          console.log("⚠️ The integrator's _setLotteryVotingToken() function may have failed");
          console.log("⚠️ You may need to manually call lottery.setVotingToken(integratorAddress)");
        }
      } else {
        console.log(`⚠️ You are not the lottery owner (owner: ${lotteryOwner})`);
        console.log("⚠️ Could not deploy ve8020LotteryIntegrator");
        console.log("⚠️ The lottery owner must run this script or deploy the integrator manually");
      }
    } catch (error) {
      console.log(`⚠️ Error deploying lottery integrator: ${error.message}`);
      console.log("⚠️ Skipping lottery integrator deployment");
    }
    
    // Save final addresses
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    console.log(`📝 Saved all addresses to ${deploymentFile}`);
    
    // Done!
    console.log("\n🎉 ve(80/20) system deployment complete!");
    console.log("\n📋 Deployed contracts:");
    Object.entries(addresses).forEach(([key, value]) => {
      console.log(`- ${key}: ${value}`);
    });
    
    console.log("\n🔹 Next steps:");
    console.log("1. Create liquidity in the 80/20 pool");
    console.log("2. Lock LP tokens in the ve8020 contract");
    console.log("3. Users will earn a share of 2.41% of all DRAGON transfers");
    console.log("4. Users can boost their lottery odds (up to 2.5x)");
    
  } catch (error) {
    console.error("❌ Deployment error:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script error:", error);
    process.exit(1);
  }); 