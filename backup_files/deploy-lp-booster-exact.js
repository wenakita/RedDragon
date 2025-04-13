const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Deploy LP Booster with exact BigInt value for minimum
 */
async function main() {
  console.log("🚀 Deploying LP Booster with exact BigInt values...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);
    
    // Load deployment addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    let addresses = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    
    if (!addresses.lpToken || !addresses.lottery) {
      console.error("❌ Missing required addresses in deployment file!");
      console.log("Make sure lpToken and lottery addresses are set in the deployment file.");
      process.exit(1);
    }
    
    console.log(`\n📋 Using LP Token: ${addresses.lpToken}`);
    console.log(`📋 Using Lottery: ${addresses.lottery}`);
    
    // Deploy LP Booster with proper configuration
    console.log("\n📦 Deploying LP Booster...");
    
    // Define the EXACT same BigInt value to use in all places
    // 0.1 LP tokens = 10^17 (since LP tokens have 18 decimals)
    const MIN_LP = 100000000000000000n; // Exactly 0.1 LP
    console.log(`- Using minimum LP amount: ${MIN_LP} (0.1 LP tokens)`);
    
    // Deploy the contract with the BigInt value
    const RedDragonLPBooster = await ethers.getContractFactory("RedDragonLPBooster");
    const lpBooster = await RedDragonLPBooster.deploy(
      addresses.lpToken,
      addresses.lottery,
      MIN_LP
    );
    
    await lpBooster.waitForDeployment();
    const lpBoosterAddress = await lpBooster.getAddress();
    console.log("✅ LP Booster deployed to:", lpBoosterAddress);
    
    // Set boost parameters with the SAME BigInt value
    console.log("\n📊 Configuring basic boost parameters...");
    const tx1 = await lpBooster.setBoostParameters(69, MIN_LP);
    await tx1.wait();
    console.log("✅ Basic parameters set");
    
    // Add the first tier with the SAME BigInt value
    console.log("\n📊 Adding boost tiers...");
    console.log(`- Adding Tier 1: ${MIN_LP} (0.1 LP), 0.69% boost`);
    const tx2 = await lpBooster.addBoostTier(MIN_LP, 69);
    await tx2.wait();
    console.log("✅ Tier 1 added successfully");
    
    // Add higher tiers
    console.log(`- Adding Tier 2: 1.0 LP, 1.5% boost`);
    const tx3 = await lpBooster.addBoostTier(ethers.parseEther("1.0"), 150);
    await tx3.wait();
    
    console.log(`- Adding Tier 3: 10.0 LP, 3% boost`);
    const tx4 = await lpBooster.addBoostTier(ethers.parseEther("10.0"), 300);
    await tx4.wait();
    
    console.log(`- Adding Tier 4: 100.0 LP, 5% boost`);
    const tx5 = await lpBooster.addBoostTier(ethers.parseEther("100.0"), 500);
    await tx5.wait();
    
    console.log(`- Adding Tier 5: 1000.0 LP, 10% boost`);
    const tx6 = await lpBooster.addBoostTier(ethers.parseEther("1000.0"), 1000);
    await tx6.wait();
    
    // Enable tiered boost system
    console.log("\n📊 Enabling tiered boost system...");
    const tx7 = await lpBooster.setUseTiers(true);
    await tx7.wait();
    console.log("✅ Tiered boost system enabled");
    
    // Update the address in the deployment file
    addresses.lpBooster = lpBoosterAddress;
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    console.log(`\n🎉 LP Booster deployed and configured successfully!`);
    console.log(`📝 Address saved to ${deploymentFile}`);
    
    // Continue with ve8020 deployment
    console.log("\n📦 Deploying ve8020 contract...");
    const Ve8020 = await ethers.getContractFactory("ve8020");
    const ve8020 = await Ve8020.deploy(addresses.lpToken);
    await ve8020.waitForDeployment();
    const ve8020Address = await ve8020.getAddress();
    console.log("✅ ve8020 contract deployed to:", ve8020Address);
    addresses.ve8020 = ve8020Address;
    
    // Save addresses after ve8020 deployment
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    // Deploy ve8020LotteryIntegrator
    console.log("\n📦 Deploying ve8020LotteryIntegrator...");
    const Ve8020LotteryIntegrator = await ethers.getContractFactory("ve8020LotteryIntegrator");
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
    
    // Deploy Ve8020FeeDistributor
    console.log("\n📦 Deploying Ve8020FeeDistributor...");
    const Ve8020FeeDistributor = await ethers.getContractFactory("Ve8020FeeDistributor");
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
    
    // Deploy RedDragonFeeManager
    console.log("\n📦 Deploying RedDragonFeeManager...");
    const RedDragonFeeManager = await ethers.getContractFactory("RedDragonFeeManager");
    const feeManager = await RedDragonFeeManager.deploy(feeDistributorAddress);
    await feeManager.waitForDeployment();
    const feeManagerAddress = await feeManager.getAddress();
    console.log("✅ RedDragonFeeManager deployed to:", feeManagerAddress);
    addresses.feeManager = feeManagerAddress;
    
    // Save addresses after fee manager deployment
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    // Deploy MultiSig
    console.log("\n📦 Deploying MultiSig...");
    const owner1 = deployer.address;
    const owner2 = ethers.getAddress("0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db");
    const owner3 = ethers.getAddress("0x8ba1f109551bD432803012645Ac136ddd64DBA72");
    
    const RedDragonMultiSig = await ethers.getContractFactory("RedDragonMultiSig");
    const multiSig = await RedDragonMultiSig.deploy(
      [owner1, owner2, owner3],
      2 // 2 of 3 required confirmations
    );
    await multiSig.waitForDeployment();
    const multiSigAddress = await multiSig.getAddress();
    console.log("✅ RedDragonMultiSig deployed to:", multiSigAddress);
    addresses.multiSig = multiSigAddress;
    
    // Save addresses
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    // Transfer ownership to MultiSig
    console.log("\n📦 Transferring ownership to MultiSig...");
    
    // A collection of contracts to transfer ownership
    const contractsToTransfer = [];
    
    // RedDragon Token
    if (addresses.redDragon) {
      const RedDragon = await ethers.getContractFactory("RedDragon");
      const redDragon = RedDragon.attach(addresses.redDragon);
      contractsToTransfer.push({ name: "RedDragon Token", contract: redDragon });
    }
    
    // Lottery
    if (addresses.lottery) {
      const Lottery = await ethers.getContractFactory("RedDragonSwapLottery");
      const lottery = Lottery.attach(addresses.lottery);
      contractsToTransfer.push({ name: "Lottery", contract: lottery });
    }
    
    // PaintSwap Verifier
    if (addresses.paintswapVerifier) {
      const Verifier = await ethers.getContractFactory("RedDragonPaintSwapVerifier");
      const verifier = Verifier.attach(addresses.paintswapVerifier);
      contractsToTransfer.push({ name: "PaintSwap Verifier", contract: verifier });
    }
    
    // LP Booster
    if (addresses.lpBooster) {
      const LPBooster = await ethers.getContractFactory("RedDragonLPBooster");
      const lpBooster = LPBooster.attach(addresses.lpBooster);
      contractsToTransfer.push({ name: "LP Booster", contract: lpBooster });
    }
    
    // ve8020
    if (addresses.ve8020) {
      const Ve8020 = await ethers.getContractFactory("ve8020");
      const ve8020 = Ve8020.attach(addresses.ve8020);
      contractsToTransfer.push({ name: "ve8020", contract: ve8020 });
    }
    
    // ve8020 Fee Distributor
    if (addresses.ve8020FeeDistributor) {
      const FeeDistributor = await ethers.getContractFactory("Ve8020FeeDistributor");
      const feeDistributor = FeeDistributor.attach(addresses.ve8020FeeDistributor);
      contractsToTransfer.push({ name: "ve8020 Fee Distributor", contract: feeDistributor });
    }
    
    // Fee Manager
    if (addresses.feeManager) {
      const FeeManager = await ethers.getContractFactory("RedDragonFeeManager");
      const feeManager = FeeManager.attach(addresses.feeManager);
      contractsToTransfer.push({ name: "Fee Manager", contract: feeManager });
    }
    
    // Transfer ownership to multisig
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
    
    console.log("\n🎉 Complete deployment finished successfully!");
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