const hre = require("hardhat");
const fs = require("fs");
require("dotenv").config();

/**
 * Setup script for lottery owners to integrate with ve8020
 * THIS SCRIPT MUST BE RUN BY THE LOTTERY CONTRACT OWNER
 */
async function main() {
  console.log("🚀 Setting up lottery integration with ve8020 system...");
  console.log("⚠️ NOTE: This script must be run by the LOTTERY CONTRACT OWNER");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);

    // Load the deployment addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    let addresses = {};
    
    try {
      if (fs.existsSync(deploymentFile)) {
        addresses = JSON.parse(fs.readFileSync(deploymentFile));
        console.log("📝 Loaded existing deployment addresses");
      } else {
        console.error("❌ No deployment addresses file found");
        process.exit(1);
      }
    } catch (error) {
      console.error("❌ Error reading deployment addresses:", error.message);
      process.exit(1);
    }

    // Verify we have the required addresses
    if (!addresses.ve8020) {
      console.error("❌ ve8020 address not found in deployment addresses file");
      process.exit(1);
    }

    if (!addresses.lottery) {
      console.error("❌ Lottery address not found in deployment addresses file");
      process.exit(1);
    }

    const ve8020Address = addresses.ve8020;
    const lotteryAddress = addresses.lottery;
    
    // Connect to the lottery contract
    console.log("\n🔧 Connecting to contracts...");
    console.log("- Lottery address:", lotteryAddress);
    console.log("- ve8020 address:", ve8020Address);
    
    const lottery = await hre.ethers.getContractAt("RedDragonSwapLottery", lotteryAddress);
    
    // Verify ownership
    const lotteryOwner = await lottery.owner();
    if (lotteryOwner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.error(`❌ Your address (${deployer.address}) is not the owner of the lottery contract`);
      console.error(`The lottery owner is: ${lotteryOwner}`);
      console.error("Please run this script with the lottery owner's private key");
      process.exit(1);
    }
    
    console.log("✅ You are the lottery contract owner");

    // Deploy ve8020LotteryIntegrator
    console.log("\n📦 Deploying ve8020LotteryIntegrator...");
    const Ve8020LotteryIntegrator = await hre.ethers.getContractFactory("ve8020LotteryIntegrator");
    const integrator = await Ve8020LotteryIntegrator.deploy(
      ve8020Address,
      lotteryAddress
    );
    
    await integrator.waitForDeployment();
    const integratorAddress = await integrator.getAddress();
    console.log("✅ ve8020LotteryIntegrator deployed to:", integratorAddress);
    
    // Save the address to deployment file
    addresses.ve8020LotteryIntegrator = integratorAddress;
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    // Verify the lottery now uses the integrator as voting token
    const votingToken = await lottery.votingToken();
    console.log("\n📋 Voting token verification:");
    console.log("- Current voting token:", votingToken);
    console.log("- Integrator address:", integratorAddress);
    
    if (votingToken.toLowerCase() === integratorAddress.toLowerCase()) {
      console.log("✅ Lottery is correctly configured to use the integrator");
    } else {
      console.log("⚠️ Lottery voting token is not set to the integrator");
      console.log("This could mean the integrator's _setLotteryVotingToken() function failed");
      console.log("Please call lottery.setVotingToken(integratorAddress) manually");
    }
    
    console.log("\n🎉 ve8020 lottery integration complete!");
    console.log("\n🔹 Next steps for users:");
    console.log("1. Lock LP tokens in the ve8020 contract");
    console.log("2. Call ve8020LotteryIntegrator.syncMyVotingPower() to update lottery boost");
    console.log("3. Enjoy boosted lottery odds (up to 2.5x) based on voting power");
    
  } catch (error) {
    console.error("❌ Setup error:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Script error:", error);
    process.exit(1);
  }); 