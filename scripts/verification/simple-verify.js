/**
 * Simple verification script for Ve8020FeeDistributor
 * 
 * This script:
 * 1. Connects to deployed contracts
 * 2. Checks the configuration of Ve8020FeeDistributor to ensure it uses wS tokens
 * 3. Adds a token to Ve8020FeeDistributor and checks its balance
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Load deployment info
  const deploymentPath = path.join(__dirname, "../../deployments/deployment-localhost.json");
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ Deployment file not found. Deploy contracts first.");
    process.exit(1);
  }
  
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const addresses = deploymentInfo.contracts;
  
  // Get signer
  const [owner] = await ethers.getSigners();
  console.log("Using account:", owner.address);

  // Connect to contracts
  console.log("\n📄 Connecting to deployed contracts...");
  const wrappedSonic = await ethers.getContractAt("MockERC20", addresses.wrappedSonic);
  const ve8020Token = await ethers.getContractAt("ve8020", addresses.ve8020);
  const feeDistributor = await ethers.getContractAt("Ve8020FeeDistributor", addresses.Ve8020FeeDistributor);
  
  console.log("- wrappedSonic:", wrappedSonic.address);
  console.log("- ve8020:", ve8020Token.address);
  console.log("- Ve8020FeeDistributor:", feeDistributor.address);
  
  // Check Ve8020FeeDistributor configuration
  console.log("\n🔍 Checking Ve8020FeeDistributor configuration...");
  const veTokenAddress = await feeDistributor.veToken();
  const wrappedSonicAddress = await feeDistributor.wrappedSonic();
  
  console.log(`- veToken address in FeeDistributor: ${veTokenAddress}`);
  console.log(`- wrappedSonic address in FeeDistributor: ${wrappedSonicAddress}`);
  
  if (veTokenAddress === ve8020Token.address) {
    console.log("✅ veToken address correctly configured");
  } else {
    console.log("❌ veToken address INCORRECTLY configured");
  }
  
  if (wrappedSonicAddress === wrappedSonic.address) {
    console.log("✅ wrappedSonic address correctly configured");
  } else {
    console.log("❌ wrappedSonic address INCORRECTLY configured");
  }
  
  // Check initial balances
  console.log("\n💰 Checking initial balances...");
  const initialDistributorBalance = await wrappedSonic.balanceOf(feeDistributor.address);
  console.log(`- Fee distributor wS balance: ${ethers.utils.formatEther(initialDistributorBalance)}`);
  
  // Transfer some wS to the fee distributor
  console.log("\n📤 Transferring wS tokens to fee distributor...");
  const amount = ethers.utils.parseEther("100");
  await wrappedSonic.transfer(feeDistributor.address, amount);
  
  // Check new balance
  const newDistributorBalance = await wrappedSonic.balanceOf(feeDistributor.address);
  console.log(`- Fee distributor wS balance after transfer: ${ethers.utils.formatEther(newDistributorBalance)}`);
  
  // Register the transfer
  console.log("\n📝 Registering the transfer as rewards...");
  await feeDistributor.receiveRewards(amount);
  
  // Check epoch rewards
  const currentEpoch = await feeDistributor.currentEpoch();
  const epochRewards = await feeDistributor.epochRewards(currentEpoch);
  console.log(`- Current epoch: ${currentEpoch}`);
  console.log(`- Registered rewards for current epoch: ${ethers.utils.formatEther(epochRewards)}`);
  
  console.log("\n✅ Verification complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed!");
    console.error(error);
    process.exit(1);
  }); 