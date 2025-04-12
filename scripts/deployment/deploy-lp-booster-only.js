const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Deploy LP Booster Only
 * This isolated script ensures correct deployment and configuration of the LP Booster
 */
async function main() {
  console.log("🚀 Starting LP Booster deployment...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);
    
    // Load existing addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    let addresses = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    
    console.log("\n📋 Loaded addresses:");
    console.log(`- LP Token: ${addresses.lpToken}`);
    console.log(`- Lottery: ${addresses.lottery}`);
    
    // Deploy RedDragonLPBooster
    console.log("\n📦 Deploying RedDragonLPBooster...");
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
    
    // Save addresses after deployment
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    // Set boost parameters
    console.log("\n📊 Setting boost parameters...");
    await lpBooster.setBoostParameters(69, minLpAmount);
    console.log("✅ Boost parameters set");
    
    // Now try adding the first tier - this is where we've had issues
    console.log("\n📈 Adding tier 1...");
    
    // Get the current minLpAmount from the contract
    const contractMinLpAmount = await lpBooster.minLpAmount();
    console.log(`Contract minLpAmount: ${contractMinLpAmount.toString()}`);
    
    // Use the exact value from the contract
    await lpBooster.addBoostTier(contractMinLpAmount, 69);
    console.log("✅ Tier 1 added successfully");
    
    // Add the rest of the tiers
    console.log("\n📈 Adding remaining tiers...");
    /*
    await lpBooster.addBoostTier(hre.ethers.parseEther("1"), 150);
    await lpBooster.addBoostTier(hre.ethers.parseEther("10"), 300);
    await lpBooster.addBoostTier(hre.ethers.parseEther("100"), 500);
    await lpBooster.addBoostTier(hre.ethers.parseEther("1000"), 1000);
    */
    console.log("⚠️ Skipping additional tiers for now - will add after addressing the first tier minimum issue");
    //console.log("✅ All tiers added successfully");
    
    // We'll use a single tier system for now
    console.log("\n📈 Using single tier boost system...");
    console.log("✅ Single tier system configured successfully");
    
    // Enable tiered boost system
    console.log("\n📈 Enabling tiered boost system...");
    // Using a single tier for now
    await lpBooster.setUseTiers(false);
    console.log("✅ Single tier system enabled");
    
    // Connect to lottery and set the LP booster
    console.log("\n🎲 Setting LP booster in lottery...");
    const RedDragonSwapLottery = await hre.ethers.getContractFactory("RedDragonSwapLottery");
    const lottery = RedDragonSwapLottery.attach(addresses.lottery);
    await lottery.setLPBooster(lpBoosterAddress);
    console.log("✅ LP booster set in lottery");
    
    console.log("\n🎉 LP Booster deployment and configuration successful!");
    console.log(`📝 LP Booster address saved to ${deploymentFile}: ${lpBoosterAddress}`);
    
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