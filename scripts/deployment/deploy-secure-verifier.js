const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Deploy an updated RedDragonPaintSwapVerifier with enhanced EOA security
 * This script deploys a new contract with tx.origin and code.length checks
 */
async function main() {
  console.log("Deploying Secure RedDragonVerifier...");
  
  // Get deployment addresses
  const deploymentAddressesPath = path.join(__dirname, "../deployment-addresses-sonic.json");
  const deploymentAddresses = JSON.parse(fs.readFileSync(deploymentAddressesPath, "utf8"));

  // Required addresses
  const redDragonToken = deploymentAddresses.redDragon;
  const redDragonLottery = deploymentAddresses.lottery;
  const redDragonLPBurner = "0x0000000000000000000000000000000000000000"; // No LP burner used anymore
  const lpToken = deploymentAddresses.lpToken || "0x0000000000000000000000000000000000000000";

  // Validate addresses (at least token and lottery should be set)
  if (!redDragonToken || redDragonToken === "0x0000000000000000000000000000000000000000") {
    throw new Error("RedDragon token address not set in deployment-addresses-sonic.json");
  }
  if (!redDragonLottery || redDragonLottery === "0x0000000000000000000000000000000000000000") {
    throw new Error("RedDragonSwapLottery address not set in deployment-addresses-sonic.json");
  }

  console.log("Using addresses:");
  console.log("  RedDragon Token:", redDragonToken);
  console.log("  RedDragonSwapLottery:", redDragonLottery);
  console.log("  RedDragonLPBurner:", redDragonLPBurner);
  console.log("  LP Token:", lpToken);

  // Deploy the secure verifier
  const RedDragonVerifier = await hre.ethers.getContractFactory("RedDragonVerifier");
  const secureVerifier = await RedDragonVerifier.deploy(
    redDragonToken,
    redDragonLottery,
    redDragonLPBurner,
    lpToken
  );

  console.log("Deployment transaction sent:", secureVerifier.deploymentTransaction().hash);
  console.log("Waiting for deployment to complete...");
  await secureVerifier.waitForDeployment();
  
  const secureVerifierAddress = await secureVerifier.getAddress();
  console.log("Secure RedDragonVerifier deployed to:", secureVerifierAddress);

  // Update deployment addresses
  deploymentAddresses.secureVerifier = secureVerifierAddress;
  fs.writeFileSync(deploymentAddressesPath, JSON.stringify(deploymentAddresses, null, 2));
  console.log("Deployment addresses updated in deployment-addresses-sonic.json");

  // Verify the contract on the explorer (if not localhost)
  if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
    console.log("Waiting for block confirmations...");
    // Wait for 5 confirmations
    await secureVerifier.deploymentTransaction().wait(5);

    console.log("Verifying contract on explorer...");
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
      console.log("Contract verified successfully!");
    } catch (error) {
      console.error("Error verifying contract:", error);
    }
  }
}

// Run the function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 