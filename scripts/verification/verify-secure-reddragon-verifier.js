const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Verifying Secure RedDragonVerifier on Sonic Explorer...");
  
  // Get deployment addresses
  const deploymentAddressesPath = path.join(__dirname, "../deployment-addresses-sonic.json");
  const deploymentAddresses = JSON.parse(fs.readFileSync(deploymentAddressesPath, "utf8"));

  // Required addresses
  const secureVerifierAddress = deploymentAddresses.secureVerifier;
  const redDragonToken = deploymentAddresses.redDragon;
  const redDragonLottery = deploymentAddresses.lottery;
  const redDragonLPBurner = "0x0000000000000000000000000000000000000000"; // No LP burner used anymore
  const lpToken = deploymentAddresses.lpToken || "0x0000000000000000000000000000000000000000";

  // Validate addresses
  if (!secureVerifierAddress || secureVerifierAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error("Secure verifier address not set in deployment-addresses-sonic.json");
  }

  console.log("Verifier Address:", secureVerifierAddress);
  console.log("Constructor Arguments:");
  console.log("  RedDragon Token:", redDragonToken);
  console.log("  RedDragonSwapLottery:", redDragonLottery);
  console.log("  RedDragonLPBurner:", redDragonLPBurner);
  console.log("  LP Token:", lpToken);

  // Verify the contract
  console.log("Submitting verification request...");
  try {
    await hre.run("verify:verify", {
      address: secureVerifierAddress,
      constructorArguments: [
        redDragonToken,
        redDragonLottery,
        redDragonLPBurner,
        lpToken
      ],
    });
    console.log("✅ Contract verified successfully!");
  } catch (error) {
    console.error("Error verifying contract:", error.message);
    
    // Check if it's already verified
    if (error.message.includes("already verified")) {
      console.log("Contract is already verified on the explorer.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 