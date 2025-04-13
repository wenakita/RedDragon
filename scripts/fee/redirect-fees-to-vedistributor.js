// Redirect liquidity and development fees to veDistributor
// This script updates the fee structure to redirect liquidity and development fees to the veDistributor contract.
// Part of the fee management system for RedDragon token.
const { ethers } = require("hardhat");

async function main() {
  console.log("🔄 Redirecting liquidity and development fees to veDistributor...");
  
  // Get contract addresses from config
  const configPath = require('path').resolve(__dirname, '../config/deployment-addresses-sonic.json');
  const config = require(configPath);
  
  if (!config.ve8020FeeDistributor) {
    console.error("❌ veDistributor address not found in config!");
    process.exit(1);
  }
  
  if (!config.redDragon) {
    console.error("❌ RedDragon token address not found in config!");
    process.exit(1);
  }
  
  if (!config.feeManager) {
    console.error("❌ Fee Manager address not found in config!");
    process.exit(1);
  }
  
  console.log("Using addresses:");
  console.log("  RedDragon Token:", config.redDragon);
  console.log("  Fee Manager:", config.feeManager);
  console.log("  ve8020 Fee Distributor:", config.ve8020FeeDistributor);
  
  // Connect to token contract
  const tokenAbi = [
    "function owner() view returns (address)",
    "function getDetailedFeeInfo() view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256)",
    "function setBuyFees(uint256, uint256, uint256, uint256) external",
    "function setSellFees(uint256, uint256, uint256, uint256) external",
    "function liquidityAddress() view returns (address)",
    "function developmentAddress() view returns (address)",
    "function setFeeManagerAddress(address) external"
  ];
  
  const token = await ethers.getContractAt(tokenAbi, config.redDragon);
  
  // Connect to fee manager contract
  const feeManagerAbi = [
    "function owner() view returns (address)",
    "function veDistributor() view returns (address)",
    "function distributeFees(uint256, uint256, uint256) external"
  ];
  
  const feeManager = await ethers.getContractAt(feeManagerAbi, config.feeManager);
  
  // Get current owner
  const tokenOwner = await token.owner();
  const feeManagerOwner = await feeManager.owner();
  const [deployer] = await ethers.getSigners();
  
  console.log("  Token Owner:", tokenOwner);
  console.log("  Fee Manager Owner:", feeManagerOwner);
  console.log("  Your address:", deployer.address);
  
  if (tokenOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.error("❌ You are not the owner of the RedDragon token!");
    process.exit(1);
  }
  
  // Get current fee structure
  const feeInfo = await token.getDetailedFeeInfo();
  
  console.log("\n📊 Current Fee Structure:");
  console.log("  Buy Fees:");
  console.log("    Liquidity Fee:", feeInfo[0].toString(), "basis points");
  console.log("    Jackpot Fee:", feeInfo[1].toString(), "basis points");
  console.log("    Burn Fee:", feeInfo[2].toString(), "basis points");
  console.log("    Development Fee:", feeInfo[3].toString(), "basis points");
  console.log("    Total Buy Fee:", feeInfo[4].toString(), "basis points");
  
  console.log("  Sell Fees:");
  console.log("    Liquidity Fee:", feeInfo[5].toString(), "basis points");
  console.log("    Jackpot Fee:", feeInfo[6].toString(), "basis points");
  console.log("    Burn Fee:", feeInfo[7].toString(), "basis points");
  console.log("    Development Fee:", feeInfo[8].toString(), "basis points");
  console.log("    Total Sell Fee:", feeInfo[9].toString(), "basis points");
  
  // Calculate new fee structure
  // We'll redirect liquidity and development fees to veDistributor
  const newVeDistributorFeeBuy = Number(feeInfo[0]) + Number(feeInfo[3]); // Liquidity + Development
  const newJackpotFeeBuy = Number(feeInfo[1]); // Keep jackpot fee the same
  const newBurnFeeBuy = Number(feeInfo[2]); // Keep burn fee the same
  const newDevelopmentFeeBuy = 0; // Set to zero as we're redirecting
  
  const newVeDistributorFeeSell = Number(feeInfo[5]) + Number(feeInfo[8]); // Liquidity + Development
  const newJackpotFeeSell = Number(feeInfo[6]); // Keep jackpot fee the same
  const newBurnFeeSell = Number(feeInfo[7]); // Keep burn fee the same
  const newDevelopmentFeeSell = 0; // Set to zero as we're redirecting
  
  console.log("\n📊 New Fee Structure (after redirection):");
  console.log("  Buy Fees:");
  console.log("    veDistributor Fee:", newVeDistributorFeeBuy, "basis points (liquidity + development)");
  console.log("    Jackpot Fee:", newJackpotFeeBuy, "basis points");
  console.log("    Burn Fee:", newBurnFeeBuy, "basis points");
  console.log("    Development Fee:", newDevelopmentFeeBuy, "basis points");
  console.log("    Total Buy Fee:", newVeDistributorFeeBuy + newJackpotFeeBuy + newBurnFeeBuy + newDevelopmentFeeBuy, "basis points");
  
  console.log("  Sell Fees:");
  console.log("    veDistributor Fee:", newVeDistributorFeeSell, "basis points (liquidity + development)");
  console.log("    Jackpot Fee:", newJackpotFeeSell, "basis points");
  console.log("    Burn Fee:", newBurnFeeSell, "basis points");
  console.log("    Development Fee:", newDevelopmentFeeSell, "basis points");
  console.log("    Total Sell Fee:", newVeDistributorFeeSell + newJackpotFeeSell + newBurnFeeSell + newDevelopmentFeeSell, "basis points");
  
  // Prompt for confirmation
  console.log("\n⚠️ Are you sure you want to redirect liquidity and development fees to veDistributor?");
  console.log("This will change the fee structure as shown above.");
  console.log("Press Ctrl+C to cancel, or wait 5 seconds to continue...");
  
  // Wait for 5 seconds
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log("\n🔄 Updating fee structure...");
  
  // Update buy fees
  try {
    console.log("  Setting new buy fees...");
    const buyTx = await token.setBuyFees(
      0, // Liquidity fee (set to 0 as we're redirecting)
      newJackpotFeeBuy, // Jackpot fee (keep the same)
      newBurnFeeBuy, // Burn fee (keep the same)
      newVeDistributorFeeBuy // Development fee (now includes liquidity + old development)
    );
    console.log("  Transaction hash:", buyTx.hash);
    await buyTx.wait();
    console.log("  ✅ Buy fees updated successfully");
  } catch (error) {
    console.error("  ❌ Failed to update buy fees:", error.message);
    process.exit(1);
  }
  
  // Update sell fees
  try {
    console.log("  Setting new sell fees...");
    const sellTx = await token.setSellFees(
      0, // Liquidity fee (set to 0 as we're redirecting)
      newJackpotFeeSell, // Jackpot fee (keep the same)
      newBurnFeeSell, // Burn fee (keep the same)
      newVeDistributorFeeSell // Development fee (now includes liquidity + old development)
    );
    console.log("  Transaction hash:", sellTx.hash);
    await sellTx.wait();
    console.log("  ✅ Sell fees updated successfully");
  } catch (error) {
    console.error("  ❌ Failed to update sell fees:", error.message);
    process.exit(1);
  }
  
  // Configure the token to use the fee manager for new fee structure
  try {
    console.log("  Setting fee manager address in token...");
    const feeManagerTx = await token.setFeeManagerAddress(config.feeManager);
    console.log("  Transaction hash:", feeManagerTx.hash);
    await feeManagerTx.wait();
    console.log("  ✅ Fee manager address set successfully");
  } catch (error) {
    console.error("  ❌ Failed to set fee manager address:", error.message);
    process.exit(1);
  }
  
  console.log("\n✅ All updates completed successfully!");
  console.log("Liquidity and development fees are now being redirected to veDistributor.");
  console.log("\nNew fee distribution:");
  console.log("- veDistributor: Gets liquidity + development fees (LP holders get more rewards)");
  console.log("- Jackpot: Same as before");
  console.log("- Burn: Same as before");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 