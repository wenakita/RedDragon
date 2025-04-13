/**
 * Deployment script for the RedDragonSwapLottery69
 * 
 * This script deploys the new RedDragonSwapLottery69 contract which pays out 69% of the jackpot
 * and keeps 31% as a reserve for future jackpots.
 */

const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Starting RedDragonSwapLottery69 deployment...");
  
  // Get deployment addresses
  const deploymentAddressesPath = "./deployment-addresses-sonic.json";
  let addresses;
  
  try {
    addresses = JSON.parse(fs.readFileSync(deploymentAddressesPath, "utf8"));
  } catch (error) {
    console.error("Error reading deployment addresses file:", error);
    process.exit(1);
  }
  
  // Validate required addresses
  const requiredAddresses = [
    "exchangePair",
    "lpToken",
    "ve8020",
    "lpBooster",
    "redDragon",
    "wrappedSonic",
    "paintswapVerifier"
  ];
  
  for (const required of requiredAddresses) {
    if (!addresses[required]) {
      console.error(`Missing required address: ${required}`);
      process.exit(1);
    }
  }
  
  console.log("All required addresses found, deploying RedDragonSwapLottery69...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  
  // Deploy the RedDragonSwapLottery69 contract
  const RedDragonSwapLottery69 = await ethers.getContractFactory("RedDragonSwapLottery69");
  const lottery69 = await RedDragonSwapLottery69.deploy(
    addresses.exchangePair,
    addresses.lpToken,
    addresses.ve8020,
    addresses.lpBooster,
    addresses.redDragon,
    addresses.wrappedSonic,
    addresses.paintswapVerifier
  );
  
  await lottery69.deployed();
  console.log(`RedDragonSwapLottery69 deployed to: ${lottery69.address}`);
  
  // Update deployment addresses file with the new lottery address
  addresses.lottery69 = lottery69.address;
  
  fs.writeFileSync(
    deploymentAddressesPath,
    JSON.stringify(addresses, null, 2)
  );
  
  console.log(`Updated ${deploymentAddressesPath} with lottery69 address`);
  console.log("Deployment completed successfully");
  
  // Log contract parameters for verification
  console.log("\nContract Parameters:");
  console.log(`Exchange Pair: ${addresses.exchangePair}`);
  console.log(`LP Token: ${addresses.lpToken}`);
  console.log(`Voting Token (ve8020): ${addresses.ve8020}`);
  console.log(`LP Booster: ${addresses.lpBooster}`);
  console.log(`RedDragon Token: ${addresses.redDragon}`);
  console.log(`Wrapped Sonic: ${addresses.wrappedSonic}`);
  console.log(`PaintSwap Verifier: ${addresses.paintswapVerifier}`);
  
  console.log("\nNext Steps:");
  console.log("1. Verify contract on the blockchain explorer");
  console.log("2. Fund initial jackpot");
  console.log("3. Transfer ownership to the multisig");
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 