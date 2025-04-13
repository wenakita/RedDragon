const hre = require("hardhat");
const fs = require("fs");
require("dotenv").config();

/**
 * Update existing system to use a newly deployed combined Ve8020FeeDistributor
 */
async function main() {
  console.log("🔄 Updating system to use combined Ve8020FeeDistributor...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);

    // Load deployment addresses
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
    if (!addresses.redDragon) {
      console.error("❌ RedDragon token address not found in deployment addresses file.");
      process.exit(1);
    }

    // Step 1: Deploy Combined Ve8020FeeDistributor
    console.log("\n📦 Deploying combined Ve8020FeeDistributor...");
    
    if (!addresses.ve8020) {
      console.log("⚠️ ve8020 address not found. Using RedDragon token address as temporary placeholder.");
      addresses.ve8020 = addresses.redDragon;
    }
    
    const Ve8020FeeDistributor = await hre.ethers.getContractFactory("Ve8020FeeDistributor");
    const feeDistributor = await Ve8020FeeDistributor.deploy(
      addresses.ve8020,
      addresses.redDragon,
      addresses.wrappedSonic,
      addresses.router
    );
    await feeDistributor.deployed();
    
    // Save the old ve8020FeeDistributor address if it exists
    if (addresses.ve8020FeeDistributor) {
      if (!addresses.oldAddresses) {
        addresses.oldAddresses = {};
      }
      addresses.oldAddresses.ve8020FeeDistributor = addresses.ve8020FeeDistributor;
    }
    
    addresses.ve8020FeeDistributor = feeDistributor.address;
    console.log("✅ Combined Ve8020FeeDistributor deployed to:", feeDistributor.address);
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    // Step 2: Update addresses to use the combined distributor
    console.log("\n🔄 Updating RedDragon token to use combined distributor...");
    
    // Get token contract instance
    const redDragon = await hre.ethers.getContractAt("RedDragon", addresses.redDragon);
    
    // Check if setVe8020Address function exists and can be used
    try {
      const methodExists = await redDragon.estimateGas.setVe8020Address(feeDistributor.address);
      console.log("🔍 setVe8020Address method exists and can be called");
    } catch (error) {
      console.error("❌ setVe8020Address method cannot be called:", error.message);
      console.log("⚠️ This likely means the token contract doesn't support method or the ve8020Address is immutable.");
      console.log("Manual redeployment of the token contract with the new address would be required.");
      return;
    }
    
    try {
      // Check if we are the owner of the token
      const tokenOwner = await redDragon.owner();
      if (tokenOwner.toLowerCase() !== deployer.address.toLowerCase()) {
        console.log("❌ You are not the owner of the RedDragon token.");
        console.log("The token owner is:", tokenOwner);
        console.log("Please update the token configuration manually with the new ve8020FeeDistributor address.");
        return;
      }
      
      // We're the owner, so we can update the configuration
      console.log("🔄 Setting ve8020FeeDistributor address in RedDragon token...");
      const setVe8020Tx = await redDragon.setVe8020Address(feeDistributor.address);
      await setVe8020Tx.wait();
      console.log("✅ ve8020FeeDistributor address set in RedDragon token");
      
      console.log("\n🎉 System updated to use combined Ve8020FeeDistributor!");
      console.log("\nNew addresses:");
      console.log("- Combined Ve8020FeeDistributor:", addresses.ve8020FeeDistributor);
      
      console.log("\nNext steps:");
      console.log("1. Verify the combined Ve8020FeeDistributor contract on the block explorer");
      console.log("2. Test the combined fee distribution flow");
    } catch (error) {
      console.error("❌ Failed to update RedDragon token configuration:", error.message);
      console.log("Manual intervention required to update the token configuration.");
    }
  } catch (error) {
    console.error("❌ Update error:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Script error:", error);
    process.exit(1);
  }); 