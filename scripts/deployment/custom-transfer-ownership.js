const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Custom script to check and verify ownership of all contracts
 */
async function main() {
  console.log("🔍 Checking ownership status of all contracts...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);
    
    // Load deployment addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    let addresses = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    
    if (!addresses.multiSig) {
      console.error("❌ MultiSig address not found in deployment file!");
      process.exit(1);
    }
    
    const multiSigAddress = addresses.multiSig;
    console.log(`📋 MultiSig address: ${multiSigAddress}`);
    
    // Initialize contracts that support ownership checking
    const contractsToCheck = [];
    
    if (addresses.redDragon) {
      console.log("\n🔄 Setting up RedDragon token contract...");
      const RedDragon = await ethers.getContractFactory("RedDragon");
      const redDragon = RedDragon.attach(addresses.redDragon);
      contractsToCheck.push({ name: "RedDragon Token", contract: redDragon });
    }
    
    if (addresses.lottery) {
      console.log("🔄 Setting up Lottery contract...");
      const Lottery = await ethers.getContractFactory("RedDragonSwapLottery");
      const lottery = Lottery.attach(addresses.lottery);
      contractsToCheck.push({ name: "Lottery", contract: lottery });
    }
    
    if (addresses.paintswapVerifier) {
      console.log("🔄 Setting up PaintSwapVerifier contract...");
      const Verifier = await ethers.getContractFactory("RedDragonPaintSwapVerifier");
      const verifier = Verifier.attach(addresses.paintswapVerifier);
      contractsToCheck.push({ name: "PaintSwap Verifier", contract: verifier });
    }
    
    if (addresses.lpBooster) {
      console.log("🔄 Setting up LP Booster contract...");
      const LPBooster = await ethers.getContractFactory("RedDragonLPBooster");
      const lpBooster = LPBooster.attach(addresses.lpBooster);
      contractsToCheck.push({ name: "LP Booster", contract: lpBooster });
    }
    
    if (addresses.ve8020) {
      console.log("🔄 Setting up ve8020 contract...");
      const Ve8020 = await ethers.getContractFactory("ve8020");
      const ve8020 = Ve8020.attach(addresses.ve8020);
      contractsToCheck.push({ name: "ve8020", contract: ve8020 });
    }
    
    if (addresses.ve8020FeeDistributor) {
      console.log("🔄 Setting up ve8020FeeDistributor contract...");
      const FeeDistributor = await ethers.getContractFactory("Ve8020FeeDistributor");
      const feeDistributor = FeeDistributor.attach(addresses.ve8020FeeDistributor);
      contractsToCheck.push({ name: "ve8020 Fee Distributor", contract: feeDistributor });
    }
    
    if (addresses.feeManager) {
      console.log("🔄 Setting up RedDragonFeeManager contract...");
      const FeeManager = await ethers.getContractFactory("RedDragonFeeManager");
      const feeManager = FeeManager.attach(addresses.feeManager);
      contractsToCheck.push({ name: "Fee Manager", contract: feeManager });
    }
    
    // Check current ownership and track contracts that need ownership transfer
    console.log("\n📊 Current Ownership Status:");
    const ownedByMultisig = [];
    const notOwnedByMultisig = [];
    const allOwners = new Set();
    
    for (const { name, contract } of contractsToCheck) {
      try {
        const currentOwner = await contract.owner();
        allOwners.add(currentOwner.toLowerCase());
        
        if (currentOwner.toLowerCase() === multiSigAddress.toLowerCase()) {
          console.log(`✅ ${name} is already owned by the new MultiSig`);
          ownedByMultisig.push(name);
        } else {
          console.log(`❌ ${name} is currently owned by: ${currentOwner}`);
          notOwnedByMultisig.push({ name, currentOwner });
        }
      } catch (error) {
        console.error(`⚠️ Error checking ownership of ${name}:`, error.message);
      }
    }
    
    // Summary report
    console.log("\n📋 Ownership Summary:");
    console.log(`- Contracts already owned by new MultiSig: ${ownedByMultisig.length} / ${contractsToCheck.length}`);
    
    if (notOwnedByMultisig.length > 0) {
      console.log("\n⚠️ The following contracts need ownership transfer to the new MultiSig:");
      
      // Group contracts by current owner
      const contractsByOwner = {};
      for (const { name, currentOwner } of notOwnedByMultisig) {
        if (!contractsByOwner[currentOwner]) {
          contractsByOwner[currentOwner] = [];
        }
        contractsByOwner[currentOwner].push(name);
      }
      
      // List contracts by owner
      for (const owner in contractsByOwner) {
        console.log(`\n📝 Contracts owned by ${owner}:`);
        contractsByOwner[owner].forEach(name => console.log(`  - ${name}`));
      }
      
      console.log("\n⚠️ To complete the ownership transfer:");
      console.log("1. If these addresses are existing multisigs, you need to submit proposals through them");
      console.log("2. If you have control of these addresses, you can run a transfer script from those accounts");
      console.log(`3. Each owner must call transferOwnership(${multiSigAddress}) on their contracts`);
    } else {
      console.log("\n🎉 All contracts are already owned by the new MultiSig!");
    }
    
  } catch (error) {
    console.error("❌ Script error:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Script error:", error);
    process.exit(1);
  }); 