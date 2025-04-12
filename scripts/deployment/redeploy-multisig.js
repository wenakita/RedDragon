const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Redeploy RedDragonMultiSig wallet with updated owners
 */
async function main() {
  console.log("🚀 Redeploying RedDragonMultiSig wallet...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);
    
    // Load deployment addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    let addresses = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    
    // Set up owner addresses with proper checksums
    const owner1 = deployer.address; // Your address (deployer)
    const owner2 = ethers.getAddress("0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db"); // Hardcoded owner 2
    const owner3 = ethers.getAddress("0x8ba1f109551bD432803012645Ac136ddd64DBA72"); // Hardcoded owner 3
    
    // Verify uniqueness
    const uniqueAddresses = new Set([
      owner1.toLowerCase(), 
      owner2.toLowerCase(), 
      owner3.toLowerCase()
    ]);
    
    if (uniqueAddresses.size < 3) {
      console.error("❌ Failed to create three unique owner addresses!");
      process.exit(1);
    }
    
    // Log the owner addresses
    console.log("\n📋 MultiSig Owners:");
    console.log(`- Owner 1 (You): ${owner1}`);
    console.log(`- Owner 2 (Liquidity): ${owner2}`);
    console.log(`- Owner 3 (Development): ${owner3}`);
    
    // Required confirmations (default: 2 of 3)
    const requiredConfirmations = 2;
    console.log(`- Required confirmations: ${requiredConfirmations} of 3`);
    
    // Deploy MultiSig wallet
    const RedDragonMultiSig = await hre.ethers.getContractFactory("RedDragonMultiSig");
    const multiSig = await RedDragonMultiSig.deploy(
      [owner1, owner2, owner3],
      requiredConfirmations
    );
    await multiSig.waitForDeployment();
    const multiSigAddress = await multiSig.getAddress();
    console.log("\n✅ RedDragonMultiSig deployed to:", multiSigAddress);
    
    // Save address to deployment file
    addresses.multiSig = multiSigAddress;
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    console.log("\n🎉 MultiSig deployment successful!");
    console.log(`📝 MultiSig address saved to ${deploymentFile}`);
    
    console.log("\n⚠️ Next Steps:");
    console.log("1. Deploy all remaining contracts");
    console.log("2. Then transfer ownership of all contracts to the multisig");
    
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