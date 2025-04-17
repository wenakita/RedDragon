const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("Setting up the Whitelist Dragon compensation system in DragonLotterySwap...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);
  
  // Load contract addresses from deployments.json or .env file
  let dragonLotterySwapAddress, compensationAddress;
  
  try {
    // Try to load from deployments.json first
    const fs = require("fs");
    const deployments = JSON.parse(fs.readFileSync("deployments.json", "utf8"));
    dragonLotterySwapAddress = deployments.lotterySwap;
    compensationAddress = deployments.compensation;
  } catch (error) {
    // Fall back to .env if deployments.json is not available
    dragonLotterySwapAddress = process.env.LOTTERY_SWAP_ADDRESS;
    compensationAddress = process.env.COMPENSATION_ADDRESS;
  }
  
  // Check if addresses are available
  if (!dragonLotterySwapAddress) {
    throw new Error("DragonLotterySwap address not found. Please set LOTTERY_SWAP_ADDRESS in .env or add to deployments.json");
  }
  
  if (!compensationAddress) {
    throw new Error("DelayedEntryCompensation address not found. Please set COMPENSATION_ADDRESS in .env or add to deployments.json");
  }
  
  console.log(`DragonLotterySwap address: ${dragonLotterySwapAddress}`);
  console.log(`DelayedEntryCompensation address: ${compensationAddress}`);
  
  // Connect to the DragonLotterySwap contract
  const DragonLotterySwap = await ethers.getContractFactory("DragonLotterySwap");
  const lotterySwap = await DragonLotterySwap.attach(dragonLotterySwapAddress);
  
  // Set the compensation system
  console.log("Setting compensation system...");
  const tx = await lotterySwap.setCompensationSystem(compensationAddress);
  await tx.wait();
  console.log(`Transaction hash: ${tx.hash}`);
  
  // Enable the compensation system
  console.log("Enabling compensation system...");
  const enableTx = await lotterySwap.setUseCompensation(true);
  await enableTx.wait();
  console.log(`Transaction hash: ${enableTx.hash}`);
  
  // Verify the setup
  console.log("Verifying setup...");
  try {
    const compensationSystem = await lotterySwap.compensationSystem();
    const isUsingCompensation = await lotterySwap.useCompensationForVRFOutages();
    
    console.log(`Compensation system address set to: ${compensationSystem}`);
    console.log(`Compensation system enabled: ${isUsingCompensation}`);
    
    if (compensationSystem === compensationAddress && isUsingCompensation) {
      console.log("✅ Compensation system successfully configured!");
    } else {
      console.warn("⚠️ Compensation system not correctly configured!");
    }
  } catch (error) {
    console.error("Error verifying setup:", error.message);
  }
}

main()
  .then(() => {
    console.log("Setup completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 