const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Deploy RedDragonMultiSig wallet
 * This wallet will be the ultimate owner of all contracts in the ecosystem
 */
async function main() {
  console.log("🚀 Deploying RedDragonMultiSig wallet...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);
    
    // Load deployment addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    let addresses = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    
    // Set up owner addresses with proper checksums
    const owner1 = process.env.MULTISIG_OWNER_1 || deployer.address;
    const owner2 = process.env.MULTISIG_OWNER_2 || ethers.getAddress("0xB05Cf01231cF2fF99499682E64D3780d57c80FdD");
    const owner3 = process.env.MULTISIG_OWNER_3 || ethers.getAddress("0xDDd0050d1E084dFc72d5d06447Cc10bcD3fEF60F");
    
    // Check for uniqueness
    if (owner1.toLowerCase() === owner2.toLowerCase() || 
        owner1.toLowerCase() === owner3.toLowerCase() || 
        owner2.toLowerCase() === owner3.toLowerCase()) {
      console.error("❌ Owners must be unique!");
      process.exit(1);
    }
    
    // Log the owner addresses
    console.log("\n📋 MultiSig Owners:");
    console.log(`- Owner 1: ${owner1}`);
    console.log(`- Owner 2: ${owner2}`);
    console.log(`- Owner 3: ${owner3}`);
    
    // Required confirmations (default: 2 of 3)
    const requiredConfirmations = process.env.MULTISIG_REQUIRED_CONFIRMATIONS || 2;
    console.log(`- Required confirmations: ${requiredConfirmations} of 3`);
    
    // Deploy MultiSig wallet
    const RedDragonMultiSig = await hre.ethers.getContractFactory("RedDragonMultiSig");
    const multiSig = await RedDragonMultiSig.deploy(
      [owner1, owner2, owner3],
      requiredConfirmations
    );
    await multiSig.deployed();
    const multiSigAddress = multiSig.address;
    console.log("\n✅ RedDragonMultiSig deployed to:", multiSigAddress);
    
    // Save address to deployment file
    addresses.multiSig = multiSigAddress;
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    console.log("\n🎉 MultiSig deployment successful!");
    console.log(`📝 MultiSig address saved to ${deploymentFile}`);
    
    console.log("\n⚠️ Important Next Steps:");
    console.log("1. Transfer ownership of all contracts to the multisig");
    console.log("2. Verify the multisig contract on block explorer");
    console.log("3. Test multisig functionality with a small transaction");
    
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