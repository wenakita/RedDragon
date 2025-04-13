const hre = require("hardhat");
const fs = require("fs");
require("dotenv").config();

/**
 * Deploy the updated Ve8020FeeDistributor contract with combined liquidity and development functionality
 */
async function main() {
  console.log("🚀 Deploying Combined Ve8020FeeDistributor contract...");

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
        console.error("❌ No deployment addresses file found.");
        process.exit(1);
      }
    } catch (error) {
      console.error("❌ Error reading deployment addresses:", error.message);
      process.exit(1);
    }

    // Verify we have the required addresses
    if (!addresses.ve8020) {
      console.error("❌ ve8020 address not found in deployment addresses file.");
      console.error("Please deploy the ve8020 contract first.");
      process.exit(1);
    }

    if (!addresses.redDragon) {
      console.error("❌ RedDragon token address not found in deployment addresses file.");
      console.error("Please deploy the RedDragon token first.");
      process.exit(1);
    }

    if (!addresses.wrappedSonic) {
      console.error("❌ Wrapped Sonic address not found in deployment addresses file.");
      process.exit(1);
    }

    if (!addresses.router) {
      console.error("❌ Router address not found in deployment addresses file.");
      process.exit(1);
    }

    const ve8020Address = addresses.ve8020;
    const redDragonAddress = addresses.redDragon;
    const wrappedSonicAddress = addresses.wrappedSonic;
    const routerAddress = addresses.router;
    
    // Deploy updated Ve8020FeeDistributor contract
    console.log("\n📦 Deploying combined Ve8020FeeDistributor contract...");
    console.log("Using ve8020 address:", ve8020Address);
    console.log("Using RedDragon token address:", redDragonAddress);
    console.log("Using Wrapped Sonic address:", wrappedSonicAddress);
    console.log("Using Router address:", routerAddress);
    
    const Ve8020FeeDistributor = await hre.ethers.getContractFactory("Ve8020FeeDistributor");
    const feeDistributor = await Ve8020FeeDistributor.deploy(
      ve8020Address,
      redDragonAddress,
      wrappedSonicAddress,
      routerAddress
    );

    // Wait for deployment to complete
    await feeDistributor.deployed();
    console.log("✅ Combined Ve8020FeeDistributor contract deployed to:", feeDistributor.address);

    // Save the address to deployment file
    const oldDistributorAddress = addresses.ve8020FeeDistributor;
    addresses.ve8020FeeDistributor = feeDistributor.address;
    
    // Also save as a different name to avoid confusion
    addresses.combinedVe8020FeeDistributor = feeDistributor.address;
    
    // Keep track of old addresses
    if (!addresses.oldAddresses) {
      addresses.oldAddresses = {};
    }
    addresses.oldAddresses.ve8020FeeDistributor = oldDistributorAddress;
    
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    console.log(`📝 Saved Combined Ve8020FeeDistributor address to ${deploymentFile}`);

    // Now we need to update the RedDragon token to use the new address
    console.log("\n🔄 Updating RedDragon token configuration...");
    console.log("Getting RedDragon token at address:", redDragonAddress);
    
    // Get token contract instance
    const redDragon = await hre.ethers.getContractAt("RedDragon", redDragonAddress);
    
    // Check if we are the owner of the token
    const tokenOwner = await redDragon.owner();
    if (tokenOwner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.log("❌ You are not the owner of the RedDragon token.");
      console.log("The token owner is:", tokenOwner);
      console.log("Please update the token configuration manually with the new ve8020FeeDistributor address.");
      console.log("\n🎉 Combined Ve8020FeeDistributor deployment complete, but token configuration requires owner action.");
      return;
    }

    // We're the owner, so we can update the configuration
    // Note: In production, this would typically use a timelock or other governance mechanism
    try {
      // We need to create a token update transaction that makes all the necessary changes
      console.log("🔄 Setting new ve8020 address in RedDragon token...");
      
      // For setting the ve8020 address in the token
      // This assumes a function like this exists or is similar
      const tx = await redDragon.setVe8020Address(feeDistributor.address);
      await tx.wait();
      
      console.log("✅ RedDragon token configuration updated successfully");
      
      console.log("\n🎉 Combined Ve8020FeeDistributor deployment and token configuration complete!");
      console.log("\nNew addresses:");
      console.log("- Combined Ve8020FeeDistributor:", feeDistributor.address);
      
      console.log("\nNext steps:");
      console.log("1. Verify the combined Ve8020FeeDistributor contract on the block explorer");
      console.log("2. Set up appropriate permissions and configurations for the new contract");
      console.log("3. Test fee distribution through the new contract");
    } catch (error) {
      console.error("❌ Failed to update RedDragon token configuration:", error.message);
      console.log("Please update the token configuration manually with the new ve8020FeeDistributor address.");
    }
  } catch (error) {
    console.error("❌ Deployment error:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Script error:", error);
    process.exit(1);
  }); 