const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Deploy LP Booster with proper tier configuration
 */
async function main() {
  console.log("🚀 Deploying LP Booster with proper tier configuration...");

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
    
    // Defining parameters
    const minLpAmount = ethers.parseEther("0.1"); // 0.1 LP tokens for minimum
    console.log(`- Using minimum LP amount: ${ethers.formatEther(minLpAmount)} LP tokens`);
    
    // Deploy the contract
    const RedDragonLPBooster = await ethers.getContractFactory("RedDragonLPBooster");
    const lpBooster = await RedDragonLPBooster.deploy(
      addresses.lpToken,
      addresses.lottery,
      minLpAmount
    );
    
    await lpBooster.waitForDeployment();
    const lpBoosterAddress = await lpBooster.getAddress();
    console.log("✅ LP Booster deployed to:", lpBoosterAddress);
    
    // Configure basic boost parameters
    console.log("\n📊 Configuring basic boost parameters...");
    await lpBooster.setBoostParameters(69, minLpAmount); // 0.69% boost for minimum LP
    console.log("✅ Basic parameters set");
    
    // Now add the boost tiers, starting with the same minimum as the global minimum
    console.log("\n📊 Adding boost tiers...");
    
    // Important: First tier MUST match the constructor minLpAmount exactly
    console.log(`- Adding Tier 1: ${ethers.formatEther(minLpAmount)} LP, 0.69% boost`);
    await lpBooster.addBoostTier(minLpAmount, 69);
    
    // Add higher tiers
    const tier2 = ethers.parseEther("1");    // 1 LP
    const tier3 = ethers.parseEther("10");   // 10 LP
    const tier4 = ethers.parseEther("100");  // 100 LP
    const tier5 = ethers.parseEther("1000"); // 1000 LP
    
    console.log(`- Adding Tier 2: ${ethers.formatEther(tier2)} LP, 1.5% boost`);
    await lpBooster.addBoostTier(tier2, 150);
    
    console.log(`- Adding Tier 3: ${ethers.formatEther(tier3)} LP, 3% boost`);
    await lpBooster.addBoostTier(tier3, 300);
    
    console.log(`- Adding Tier 4: ${ethers.formatEther(tier4)} LP, 5% boost`);
    await lpBooster.addBoostTier(tier4, 500);
    
    console.log(`- Adding Tier 5: ${ethers.formatEther(tier5)} LP, 10% boost`);
    await lpBooster.addBoostTier(tier5, 1000);
    
    // Enable tiered boost system
    console.log("\n📊 Enabling tiered boost system...");
    await lpBooster.setUseTiers(true);
    console.log("✅ Tiered boost system enabled");
    
    // Update the address in the deployment file
    addresses.lpBooster = lpBoosterAddress;
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    console.log(`\n🎉 LP Booster deployed and configured successfully!`);
    console.log(`📝 Address saved to ${deploymentFile}`);
    
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