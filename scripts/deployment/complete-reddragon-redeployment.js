const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Complete RedDragon System Redeployment
 * Deploys and configures all components of the RedDragon ecosystem:
 * - RedDragon Token
 * - RedDragonVerifier
 * - RedDragonSwapLottery
 * - RedDragonLPBooster
 * - ve8020 system
 * - Fee distribution system
 */
async function main() {
  console.log("🚀 Starting complete RedDragon system redeployment...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);
    const deployerBalance = await deployer.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", hre.ethers.formatUnits(deployerBalance, 18), "wS");

    // Track deployed addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    let addresses = {};
    
    // Configure environment variables and defaults
    addresses.jackpotVault = process.env.JACKPOT_VAULT_ADDRESS || deployer.address;
    addresses.liquidityVault = process.env.LIQUIDITY_VAULT_ADDRESS || deployer.address;
    addresses.developmentVault = process.env.DEVELOPMENT_VAULT_ADDRESS || deployer.address;
    addresses.burnAddress = process.env.BURN_ADDRESS || "0x000000000000000000000000000000000000dEaD";
    addresses.wrappedSonic = process.env.WRAPPED_SONIC_ADDRESS || "0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38";
    
    console.log("\n📋 Configuration:");
    console.log(`- Jackpot Vault: ${addresses.jackpotVault}`);
    console.log(`- Liquidity Vault: ${addresses.liquidityVault}`);
    console.log(`- Development Vault: ${addresses.developmentVault}`);
    console.log(`- Burn Address: ${addresses.burnAddress}`);
    console.log(`- Wrapped Sonic: ${addresses.wrappedSonic}`);

    // Step 1: Deploy PaintSwap Verifier for VRF
    console.log("\n📦 Step 1: Deploying PaintSwap Verifier...");
    const RedDragonPaintSwapVerifier = await hre.ethers.getContractFactory("RedDragonPaintSwapVerifier");
    const paintswapVerifier = await RedDragonPaintSwapVerifier.deploy();
    await paintswapVerifier.waitForDeployment();
    const paintswapVerifierAddress = await paintswapVerifier.getAddress();
    console.log("✅ RedDragonPaintSwapVerifier deployed to:", paintswapVerifierAddress);
    addresses.paintswapVerifier = paintswapVerifierAddress;
    
    // Save addresses after verifier deployment
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    // Step 2: Deploy Lottery with VRF
    console.log("\n📦 Step 2: Deploying RedDragonSwapLottery...");
    const RedDragonSwapLottery = await hre.ethers.getContractFactory("RedDragonSwapLottery");
    const lottery = await RedDragonSwapLottery.deploy(
      addresses.wrappedSonic,
      paintswapVerifierAddress
    );
    await lottery.waitForDeployment();
    const lotteryAddress = await lottery.getAddress();
    console.log("✅ RedDragonSwapLottery deployed to:", lotteryAddress);
    addresses.lottery = lotteryAddress;
    
    // Configure lottery initial settings
    console.log("Configuring lottery initial settings...");
    await lottery.setTokenContract(deployer.address); // Temporary, will update later
    
    // Save addresses after lottery deployment
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    // Step 3: Deploy RedDragon Token
    console.log("\n📦 Step 3: Deploying RedDragon token...");
    const RedDragon = await hre.ethers.getContractFactory("RedDragon");
    const redDragon = await RedDragon.deploy(
      addresses.jackpotVault,
      addresses.liquidityVault,
      addresses.burnAddress,
      addresses.developmentVault,
      addresses.wrappedSonic
    );
    await redDragon.waitForDeployment();
    const redDragonAddress = await redDragon.getAddress();
    console.log("✅ RedDragon token deployed to:", redDragonAddress);
    addresses.redDragon = redDragonAddress;
    
    // Set the lottery address in the token
    console.log("Setting lottery address in RedDragon token...");
    await redDragon.setLotteryAddress(lotteryAddress);
    
    // Update the token contract in the lottery
    console.log("Setting token contract in lottery...");
    await lottery.setTokenContract(redDragonAddress);
    
    // Save addresses after token deployment
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    // Step 4: Create liquidity pair if needed
    console.log("\n📦 Step 4: Setting up LP token...");
    
    // Check if we have an LP token address already
    let lpTokenAddress = process.env.LP_TOKEN_ADDRESS;
    if (lpTokenAddress) {
      console.log(`📝 Using existing LP token: ${lpTokenAddress}`);
      addresses.lpToken = lpTokenAddress;
    } else {
      console.log("⚠️ No LP token address provided in .env (LP_TOKEN_ADDRESS)");
      console.log("⚠️ Using a placeholder address. Create liquidity pair manually and update later!");
      // For testing purposes, use the wrappedSonic as a placeholder
      lpTokenAddress = addresses.wrappedSonic;
      addresses.lpToken = lpTokenAddress;
    }
    
    // Set LP token in lottery for boost calculations
    console.log("Setting LP token in lottery...");
    await lottery.setLPToken(lpTokenAddress);
    
    // Save addresses after LP setup
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    // Step 5: Deploy RedDragonLPBooster
    console.log("\n📦 Step 5: Deploying RedDragonLPBooster...");
    const minLpAmount = hre.ethers.parseEther("0.1"); // Minimum 0.1 LP tokens for boost
    const RedDragonLPBooster = await hre.ethers.getContractFactory("RedDragonLPBooster");
    const lpBooster = await RedDragonLPBooster.deploy(
      lpTokenAddress,
      lotteryAddress,
      minLpAmount
    );
    await lpBooster.waitForDeployment();
    const lpBoosterAddress = await lpBooster.getAddress();
    console.log("✅ RedDragonLPBooster deployed to:", lpBoosterAddress);
    addresses.lpBooster = lpBoosterAddress;
    
    // Configure booster tiers
    console.log("Configuring LP Booster tiers...");
    
    // Set initial boost parameters
    await lpBooster.setBoostParameters(69, minLpAmount); // 0.69% boost with min LP amount
    
    // Add boost tiers (amounts in LP tokens)
    await lpBooster.addBoostTier(minLpAmount, 69);                            // Tier 1: 0.1 LP, 0.69% boost
    await lpBooster.addBoostTier(hre.ethers.parseEther("1"), 150);            // Tier 2: 1 LP, 1.5% boost
    await lpBooster.addBoostTier(hre.ethers.parseEther("10"), 300);           // Tier 3: 10 LP, 3% boost
    await lpBooster.addBoostTier(hre.ethers.parseEther("100"), 500);          // Tier 4: 100 LP, 5% boost
    await lpBooster.addBoostTier(hre.ethers.parseEther("1000"), 1000);        // Tier 5: 1000 LP, 10% boost
    
    // Enable tiered boost system
    await lpBooster.setUseTiers(true);
    
    // Save addresses after booster deployment and configuration
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    // Step 6: Deploy ve8020 contract
    console.log("\n📦 Step 6: Deploying ve8020 contract...");
    const Ve8020 = await hre.ethers.getContractFactory("ve8020");
    const ve8020 = await Ve8020.deploy(lpTokenAddress);
    await ve8020.waitForDeployment();
    const ve8020Address = await ve8020.getAddress();
    console.log("✅ ve8020 contract deployed to:", ve8020Address);
    addresses.ve8020 = ve8020Address;
    
    // Save addresses after ve8020 deployment
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    // Step 7: Deploy ve8020LotteryIntegrator
    console.log("\n📦 Step 7: Deploying ve8020LotteryIntegrator...");
    const Ve8020LotteryIntegrator = await hre.ethers.getContractFactory("ve8020LotteryIntegrator");
    const lotteryIntegrator = await Ve8020LotteryIntegrator.deploy(
      ve8020Address,
      lotteryAddress
    );
    await lotteryIntegrator.waitForDeployment();
    const lotteryIntegratorAddress = await lotteryIntegrator.getAddress();
    console.log("✅ ve8020LotteryIntegrator deployed to:", lotteryIntegratorAddress);
    addresses.ve8020LotteryIntegrator = lotteryIntegratorAddress;
    
    // Save addresses after integrator deployment
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    // Step 8: Deploy Ve8020FeeDistributor
    console.log("\n📦 Step 8: Deploying Ve8020FeeDistributor...");
    const Ve8020FeeDistributor = await hre.ethers.getContractFactory("Ve8020FeeDistributor");
    const feeDistributor = await Ve8020FeeDistributor.deploy(
      ve8020Address,
      redDragonAddress
    );
    await feeDistributor.waitForDeployment();
    const feeDistributorAddress = await feeDistributor.getAddress();
    console.log("✅ Ve8020FeeDistributor deployed to:", feeDistributorAddress);
    addresses.ve8020FeeDistributor = feeDistributorAddress;
    
    // Save addresses after fee distributor deployment
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    // Step 9: Deploy RedDragonFeeManager
    console.log("\n📦 Step 9: Deploying RedDragonFeeManager...");
    const RedDragonFeeManager = await hre.ethers.getContractFactory("RedDragonFeeManager");
    const feeManager = await RedDragonFeeManager.deploy(
      redDragonAddress,
      feeDistributorAddress,
      addresses.jackpotVault,
      addresses.burnAddress
    );
    await feeManager.waitForDeployment();
    const feeManagerAddress = await feeManager.getAddress();
    console.log("✅ RedDragonFeeManager deployed to:", feeManagerAddress);
    addresses.feeManager = feeManagerAddress;
    
    // Set lottery in fee manager
    console.log("Setting lottery in fee manager...");
    await feeManager.setLottery(lotteryAddress);
    
    // Save addresses after fee manager deployment
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    // Step 10: Configure RedDragon to use fee manager
    console.log("\n📦 Step 10: Configuring RedDragon token to use fee manager...");
    
    // Set fee manager in RedDragon
    console.log("Setting fee manager address in RedDragon token...");
    await redDragon.setFeeManagerAddress(feeManagerAddress);
    
    // Configure token fees to use veDistributor
    console.log("Updating fee structure to use veDistributor...");
    
    // Get current fee details
    const feeInfo = await redDragon.getDetailedFeeInfo();
    console.log("Current fee structure:", feeInfo);
    
    // Update buy fees (redirect liquidity and dev fees to veDistributor)
    await redDragon.setBuyFees(
      0, // Liquidity fee (set to 0 as we're redirecting)
      feeInfo[1], // Jackpot fee (keep the same)
      feeInfo[2], // Burn fee (keep the same)
      Number(feeInfo[0]) + Number(feeInfo[3]) // Development fee now includes liquidity + old development
    );
    
    // Update sell fees
    await redDragon.setSellFees(
      0, // Liquidity fee (set to 0 as we're redirecting)
      feeInfo[6], // Jackpot fee (keep the same)
      feeInfo[7], // Burn fee (keep the same)
      Number(feeInfo[5]) + Number(feeInfo[8]) // Development fee now includes liquidity + old development
    );
    
    // Save addresses after token fee configuration
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    // Final Step: System Integration and Verification
    console.log("\n📦 Final Step: System Integration and Verification...");
    
    // Set LP booster in lottery
    console.log("Setting LP booster in lottery...");
    await lottery.setLPBooster(lpBoosterAddress);
    
    // Set voting token in lottery to ve8020LotteryIntegrator
    console.log("Setting voting token in lottery to ve8020LotteryIntegrator...");
    await lottery.setVotingToken(lotteryIntegratorAddress);
    
    // Enable trading on RedDragon token
    if (await redDragon.tradingEnabled() === false) {
      console.log("Enabling trading on RedDragon token...");
      await redDragon.enableTrading();
    }
    
    // Final configuration verification
    console.log("\n🔍 Verifying final configurations...");
    
    console.log("✓ RedDragon token address:", redDragonAddress);
    console.log("✓ RedDragonSwapLottery address:", lotteryAddress);
    console.log("✓ RedDragonLPBooster address:", lpBoosterAddress);
    console.log("✓ ve8020 address:", ve8020Address);
    console.log("✓ ve8020LotteryIntegrator address:", lotteryIntegratorAddress);
    console.log("✓ Ve8020FeeDistributor address:", feeDistributorAddress);
    console.log("✓ RedDragonFeeManager address:", feeManagerAddress);

    console.log("\n🎉 Complete system redeployment successful!");
    console.log(`📝 All contract addresses saved to ${deploymentFile}`);
    
    console.log("\n⚠️ Important Next Steps:");
    console.log("1. Create the LP token pair on DEX if not already existing");
    console.log("2. Update the LP token address in the system if using a placeholder");
    console.log("3. Transfer ownership of contracts to multi-sig wallet for security");
    console.log("4. Verify all contracts on block explorer");
    
  } catch (error) {
    console.error("❌ Deployment error:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Script error:", error);
    process.exit(1);
  }); 