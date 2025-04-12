const hre = require("hardhat");
const fs = require("fs");
require("dotenv").config();

/**
 * Deploy the RedDragonPaintSwapVerifier contract
 * This script is optimized to work with both ethers v5 and v6
 */
async function main() {
  console.log("🚀 Deploying RedDragonPaintSwapVerifier contract...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);

    // Deploy the contract
    console.log("\n📦 Deploying PaintSwap Verifier...");
    const factory = await hre.ethers.getContractFactory("RedDragonPaintSwapVerifier");
    const verifier = await factory.deploy();
    
    // Get the contract address (compatible with both ethers v5 and v6)
    const contractAddress = verifier.target || verifier.address;
    console.log("📝 Contract address:", contractAddress);
    
    if (!contractAddress) {
      throw new Error("Failed to get contract address");
    }
    
    // Wait for deployment to complete
    console.log("⏳ Waiting for deployment transaction to be mined...");
    await verifier.deployTransaction?.wait();
    
    // Save the address to deployment file
    const addressesFile = "deployment-addresses-sonic.json";
    let addresses = {};
    
    try {
      if (fs.existsSync(addressesFile)) {
        addresses = JSON.parse(fs.readFileSync(addressesFile));
        console.log("📝 Loaded existing deployment addresses");
      }
    } catch (error) {
      console.log("⚠️ Creating new deployment addresses file");
    }

    // Save the verifier address
    addresses.verifier = contractAddress;
    fs.writeFileSync(addressesFile, JSON.stringify(addresses, null, 2));
    console.log(`📝 Saved verifier address to ${addressesFile}`);

    console.log("\n🎉 Deployment complete!");
    console.log("Verifier Address:", contractAddress);
    console.log("\nNext steps:");
    console.log("1. Initialize the verifier with PaintSwap VRF settings:");
    console.log("   npx hardhat run scripts/deployment/setup-vrf.js --network sonic");
  } catch (error) {
    console.error("❌ Deployment error:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Script error:", error);
    process.exit(1);
  }); 