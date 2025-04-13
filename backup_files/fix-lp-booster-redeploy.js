const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Fixed LP Booster redeployment script that fixes the tier minimum issue
 */
async function main() {
  console.log("🚀 Redeploying LP Booster and continuing deployment...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);
    
    // Load deployment addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    let addresses = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    
    // Verify we have the necessary addresses
    if (!addresses.lpToken || !addresses.lottery) {
      console.error("❌ Missing required addresses in deployment file!");
      process.exit(1);
    }
    
    console.log(`\n📋 Using LP Token: ${addresses.lpToken}`);
    console.log(`📋 Using Lottery: ${addresses.lottery}`);
    
    // Step 5: Redeploy RedDragonLPBooster
    console.log("\n📦 Step 5: Redeploying RedDragonLPBooster...");
    const minLpAmount = hre.ethers.parseEther("0.1"); // Minimum 0.1 LP tokens for boost
    const RedDragonLPBooster = await hre.ethers.getContractFactory("RedDragonLPBooster");
    const lpBooster = await RedDragonLPBooster.deploy(
      addresses.lpToken,
      addresses.lottery,
      minLpAmount
    );
    await lpBooster.waitForDeployment();
    const lpBoosterAddress = await lpBooster.getAddress();
    console.log("✅ RedDragonLPBooster deployed to:", lpBoosterAddress);
    addresses.lpBooster = lpBoosterAddress;
    
    // Configure booster tiers - FIXED to use the same minLpAmount for the first tier
    console.log("Configuring LP Booster tiers (fixed)...");
    
    // Set initial boost parameters
    await lpBooster.setBoostParameters(69, minLpAmount); // 0.69% boost with min LP amount
    
    // Add boost tiers (amounts in LP tokens) - First tier uses exactly minLpAmount
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
    const ve8020 = await Ve8020.deploy(addresses.lpToken);
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
      addresses.lottery
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
      addresses.redDragon
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
      feeDistributorAddress
    );
    await feeManager.waitForDeployment();
    const feeManagerAddress = await feeManager.getAddress();
    console.log("✅ RedDragonFeeManager deployed to:", feeManagerAddress);
    addresses.feeManager = feeManagerAddress;
    
    // Save addresses after fee manager deployment
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    // Step 10: Deploy MultiSig
    console.log("\n📦 Step 10: Deploying MultiSig...");
    
    // Set up owner addresses with proper checksums
    const owner1 = deployer.address; // Your address (deployer)
    const owner2 = hre.ethers.getAddress("0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db"); // Owner 2
    const owner3 = hre.ethers.getAddress("0x8ba1f109551bD432803012645Ac136ddd64DBA72"); // Owner 3
    
    // Verify uniqueness
    const uniqueAddresses = new Set([
      owner1.toLowerCase(), 
      owner2.toLowerCase(), 
      owner3.toLowerCase()
    ]);
    
    if (uniqueAddresses.size < 3) {
      console.error("❌ Failed to create three unique owner addresses!");
      process.exit(1);
    }
    
    // Log the owner addresses
    console.log("\n📋 MultiSig Owners:");
    console.log(`- Owner 1 (You): ${owner1}`);
    console.log(`- Owner 2: ${owner2}`);
    console.log(`- Owner 3: ${owner3}`);
    
    // Required confirmations (default: 2 of 3)
    const requiredConfirmations = 2;
    console.log(`- Required confirmations: ${requiredConfirmations} of 3`);
    
    // Deploy MultiSig wallet
    const RedDragonMultiSig = await hre.ethers.getContractFactory("RedDragonMultiSig");
    const multiSig = await RedDragonMultiSig.deploy(
      [owner1, owner2, owner3],
      requiredConfirmations
    );
    await multiSig.waitForDeployment();
    const multiSigAddress = await multiSig.getAddress();
    console.log("✅ RedDragonMultiSig deployed to:", multiSigAddress);
    addresses.multiSig = multiSigAddress;
    
    // Save final addresses
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    // Step 11: Transfer all ownerships to MultiSig
    console.log("\n📦 Step 11: Transferring ownership to MultiSig...");
    
    // A collection of contracts to transfer ownership
    const contractsToTransfer = [];
    
    // RedDragon Token
    if (addresses.redDragon) {
      console.log("Adding RedDragon Token to transfer list...");
      const RedDragon = await hre.ethers.getContractFactory("RedDragon");
      const redDragon = RedDragon.attach(addresses.redDragon);
      contractsToTransfer.push({ name: "RedDragon Token", contract: redDragon });
    }
    
    // Lottery
    if (addresses.lottery) {
      console.log("Adding Lottery to transfer list...");
      const Lottery = await hre.ethers.getContractFactory("RedDragonSwapLottery");
      const lottery = Lottery.attach(addresses.lottery);
      contractsToTransfer.push({ name: "Lottery", contract: lottery });
    }
    
    // PaintSwap Verifier
    if (addresses.paintswapVerifier) {
      console.log("Adding PaintSwap Verifier to transfer list...");
      const Verifier = await hre.ethers.getContractFactory("RedDragonPaintSwapVerifier");
      const verifier = Verifier.attach(addresses.paintswapVerifier);
      contractsToTransfer.push({ name: "PaintSwap Verifier", contract: verifier });
    }
    
    // LP Booster
    if (addresses.lpBooster) {
      console.log("Adding LP Booster to transfer list...");
      const LPBooster = await hre.ethers.getContractFactory("RedDragonLPBooster");
      const lpBooster = LPBooster.attach(addresses.lpBooster);
      contractsToTransfer.push({ name: "LP Booster", contract: lpBooster });
    }
    
    // ve8020
    if (addresses.ve8020) {
      console.log("Adding ve8020 to transfer list...");
      const Ve8020 = await hre.ethers.getContractFactory("ve8020");
      const ve8020 = Ve8020.attach(addresses.ve8020);
      contractsToTransfer.push({ name: "ve8020", contract: ve8020 });
    }
    
    // ve8020 Fee Distributor
    if (addresses.ve8020FeeDistributor) {
      console.log("Adding ve8020 Fee Distributor to transfer list...");
      const FeeDistributor = await hre.ethers.getContractFactory("Ve8020FeeDistributor");
      const feeDistributor = FeeDistributor.attach(addresses.ve8020FeeDistributor);
      contractsToTransfer.push({ name: "ve8020 Fee Distributor", contract: feeDistributor });
    }
    
    // Fee Manager
    if (addresses.feeManager) {
      console.log("Adding Fee Manager to transfer list...");
      const FeeManager = await hre.ethers.getContractFactory("RedDragonFeeManager");
      const feeManager = FeeManager.attach(addresses.feeManager);
      contractsToTransfer.push({ name: "Fee Manager", contract: feeManager });
    }
    
    // Transfer ownership to multisig
    console.log("\n📤 Transferring ownership to MultiSig...");
    for (const { name, contract } of contractsToTransfer) {
      try {
        console.log(`- Transferring ownership of ${name}...`);
        const tx = await contract.transferOwnership(multiSigAddress);
        await tx.wait();
        console.log(`  ✅ Ownership of ${name} transferred to MultiSig`);
      } catch (error) {
        console.error(`  ❌ Failed to transfer ownership of ${name}:`, error.message);
      }
    }
    
    console.log("\n🎉 Redeployment completed successfully!");
    console.log(`📝 All addresses saved to ${deploymentFile}`);
    
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