/**
 * Verification script for the RedDragonSwapLottery69 contract on SonicScan
 */

const { run } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=== VERIFYING REDDRAGON LOTTERY69 CONTRACT ===");
  
  // Get deployment addresses
  let deploymentAddresses;
  try {
    deploymentAddresses = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../../deployment-addresses-sonic.json"), "utf8")
    );
    console.log("Loaded deployment addresses");
  } catch (error) {
    console.error("Error loading deployment addresses:", error);
    process.exit(1);
  }
  
  // Check if lottery69 address exists
  if (!deploymentAddresses.lottery69) {
    console.error("Lottery69 address not found in deployment addresses");
    process.exit(1);
  }
  
  // Check for required constructor parameters
  if (!deploymentAddresses.wrappedSonic) {
    console.error("Wrapped Sonic address not found in deployment addresses");
    process.exit(1);
  }
  
  if (!deploymentAddresses.paintSwapVerifier) {
    console.error("PaintSwap Verifier address not found in deployment addresses");
    process.exit(1);
  }
  
  const lotteryAddress = deploymentAddresses.lottery69;
  const wrappedSonicAddress = deploymentAddresses.wrappedSonic;
  const verifierAddress = deploymentAddresses.paintSwapVerifier;
  
  console.log(`Verifying RedDragonSwapLottery69 at ${lotteryAddress}`);
  console.log(`Constructor parameters:`);
  console.log(`- wrappedSonic: ${wrappedSonicAddress}`);
  console.log(`- paintSwapVerifier: ${verifierAddress}`);
  
  try {
    // Run the verify task with constructor arguments
    await run("verify:verify", {
      address: lotteryAddress,
      constructorArguments: [
        wrappedSonicAddress,
        verifierAddress
      ],
      contract: "contracts/RedDragonSwapLottery69.sol:RedDragonSwapLottery69"
    });
    
    console.log("Verification successful!");
  } catch (error) {
    console.error("Verification failed:", error);
    process.exit(1);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 