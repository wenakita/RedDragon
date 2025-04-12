const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Redeploy the verifier contracts to fix the randomness security issue
 */
async function main() {
  console.log("🔒 Redeploying verifier contracts with security fixes...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);
    const deployerBalance = await deployer.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", hre.ethers.formatUnits(deployerBalance, 18), "wS");

    // Load deployment addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    let addresses = {};
    
    try {
      if (fs.existsSync(deploymentFile)) {
        addresses = JSON.parse(fs.readFileSync(deploymentFile));
        console.log("📝 Loaded existing deployment addresses");
      } else {
        console.error("❌ No deployment addresses file found");
        return;
      }
    } catch (error) {
      console.error("❌ Error loading deployment addresses:", error);
      return;
    }

    // 1. Deploy fixed RedDragonPaintSwapVerifier
    console.log("\n📦 Deploying fixed RedDragonPaintSwapVerifier...");
    const RedDragonPaintSwapVerifier = await hre.ethers.getContractFactory("RedDragonPaintSwapVerifier");
    const paintSwapVerifier = await RedDragonPaintSwapVerifier.deploy();
    await paintSwapVerifier.waitForDeployment();
    const paintSwapVerifierAddress = await paintSwapVerifier.getAddress();
    console.log("✅ RedDragonPaintSwapVerifier deployed to:", paintSwapVerifierAddress);
    
    // Store new address
    addresses.paintSwapVerifier = paintSwapVerifierAddress;

    // 2. Deploy enhanced RedDragonVerifier with security checks
    console.log("\n📦 Deploying enhanced RedDragonVerifier with security checks...");
    const RedDragonVerifier = await hre.ethers.getContractFactory("RedDragonVerifier");
    const verifier = await RedDragonVerifier.deploy(
      addresses.redDragon,
      addresses.lottery, 
      "0x0000000000000000000000000000000000000000", // No LP Burner
      addresses.lpToken
    );
    await verifier.waitForDeployment();
    const verifierAddress = await verifier.getAddress();
    console.log("✅ RedDragonVerifier deployed to:", verifierAddress);
    
    // Store new address
    addresses.verifier = verifierAddress;

    // Save updated addresses
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    console.log("📝 Saved updated addresses to", deploymentFile);

    console.log("\n🎉 Verifier contracts redeployed successfully!");
    console.log("\n⚙️ Next steps:");
    console.log("1. Update the lottery to use the new PaintSwap verifier");
    console.log("2. Initialize the new PaintSwap verifier with VRF configuration");
  } catch (error) {
    console.error("❌ Deployment failed:", error);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 