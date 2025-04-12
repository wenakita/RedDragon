const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Update LP token address across all contracts
 * Run after creating the LP token pair, if it wasn't available during initial deployment
 */
async function main() {
  console.log("🔄 Updating LP token address across all contracts...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);

    // Get LP token address from environment or prompt
    let lpTokenAddress = process.env.LP_TOKEN_ADDRESS;
    if (!lpTokenAddress) {
      console.error("❌ LP_TOKEN_ADDRESS not found in .env file");
      console.error("Please add LP_TOKEN_ADDRESS=0x... to your .env file");
      process.exit(1);
    }

    console.log("🔄 Using LP token address:", lpTokenAddress);

    // Load deployment addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    let addresses;
    
    try {
      if (fs.existsSync(deploymentFile)) {
        addresses = JSON.parse(fs.readFileSync(deploymentFile));
        console.log("📝 Loaded deployment addresses");
      } else {
        console.error("❌ No deployment file found at", deploymentFile);
        process.exit(1);
      }
    } catch (error) {
      console.error("❌ Error reading deployment addresses:", error.message);
      process.exit(1);
    }

    // Verify required contract addresses
    if (!addresses.lottery) {
      console.error("❌ Lottery address not found in deployment addresses");
      process.exit(1);
    }

    if (!addresses.lpBooster) {
      console.error("❌ LP Booster address not found in deployment addresses");
      process.exit(1);
    }

    if (!addresses.ve8020) {
      console.error("❌ ve8020 address not found in deployment addresses");
      process.exit(1);
    }

    // Update LP token address in contracts
    console.log("\n📝 Updating LP token address in contracts...");

    // 1. Update in Lottery
    console.log("Updating LP token in RedDragonSwapLottery...");
    const lottery = await hre.ethers.getContractAt("RedDragonSwapLottery", addresses.lottery);
    await lottery.setLPToken(lpTokenAddress);
    console.log("✅ LP token updated in lottery");

    // 2. Update in LP Booster
    console.log("Updating LP token in RedDragonLPBooster...");
    const lpBooster = await hre.ethers.getContractAt("RedDragonLPBooster", addresses.lpBooster);
    await lpBooster.setLpTokenAddress(lpTokenAddress);
    console.log("✅ LP token updated in LP Booster");

    // 3. Update in ve8020 (This requires redeploying ve8020 if changed)
    console.log("⚠️ Note: ve8020 contract cannot update LP token address after deployment");
    console.log("⚠️ Current ve8020 LP token:", await (await hre.ethers.getContractAt("ve8020", addresses.ve8020)).lpToken());
    console.log("⚠️ If different from new LP token address, you'll need to redeploy ve8020");

    // Update LP token address in deployment file
    addresses.lpToken = lpTokenAddress;
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    console.log("📝 Updated deployment file with new LP token address");

    console.log("\n✅ LP token address update complete!");
    console.log("Next step: Verify contracts on explorer");
    console.log("npx hardhat run scripts/deployment/verify-contracts.js --network sonic");
  } catch (error) {
    console.error("❌ Update error:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Script error:", error);
    process.exit(1);
  }); 