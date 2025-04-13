const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Update the RedDragonSwapLottery to use the new secure verifier
 */
async function main() {
  console.log("Updating Lottery with Secure RedDragonVerifier...");
  
  // Get deployment addresses
  const deploymentAddressesPath = path.join(__dirname, "../deployment-addresses-sonic.json");
  const deploymentAddresses = JSON.parse(fs.readFileSync(deploymentAddressesPath, "utf8"));

  // Required addresses
  const lotteryAddress = deploymentAddresses.lottery;
  const secureVerifierAddress = deploymentAddresses.secureVerifier;

  // Validate addresses
  if (!lotteryAddress || lotteryAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error("Lottery address not set in deployment-addresses-sonic.json");
  }
  if (!secureVerifierAddress || secureVerifierAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error("Secure verifier address not set in deployment-addresses-sonic.json");
  }

  console.log("Using addresses:");
  console.log("  RedDragonSwapLottery:", lotteryAddress);
  console.log("  Secure RedDragonVerifier:", secureVerifierAddress);

  // Connect to the lottery contract
  const lottery = await hre.ethers.getContractAt("RedDragonSwapLottery", lotteryAddress);
  
  // Get current verifier address
  const currentVerifier = await lottery.verifier();
  console.log("Current verifier address:", currentVerifier);
  
  if (currentVerifier.toLowerCase() === secureVerifierAddress.toLowerCase()) {
    console.log("Lottery is already using the secure verifier. No update needed.");
    return;
  }

  console.log("Updating lottery to use the new secure verifier...");
  
  // Update the verifier
  const tx = await lottery.setVerifier(secureVerifierAddress);
  console.log("Transaction sent:", tx.hash);
  
  console.log("Waiting for transaction to be mined...");
  const receipt = await tx.wait();
  console.log("Transaction confirmed in block:", receipt.blockNumber);
  
  // Verify the update
  const newVerifier = await lottery.verifier();
  
  if (newVerifier.toLowerCase() === secureVerifierAddress.toLowerCase()) {
    console.log("✅ Lottery successfully updated to use the secure verifier!");
  } else {
    console.log("❌ Update failed. Current verifier:", newVerifier);
  }
}

// Run the function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 