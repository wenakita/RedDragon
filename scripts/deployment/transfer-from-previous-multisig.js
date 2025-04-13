const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Script to transfer contract ownership from a previous multisig to the new multisig
 * IMPORTANT: This must be run using the private key of the OWNER of the contracts
 */
async function main() {
  console.log("🚀 Transferring ownership from previous owner to new MultiSig...");

  try {
    // Get current signer (must be the owner of the contracts)
    const [signer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", signer.address);
    
    // Load deployment addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    let addresses = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    
    if (!addresses.multiSig) {
      console.error("❌ MultiSig address not found in deployment file!");
      process.exit(1);
    }
    
    const newMultiSigAddress = addresses.multiSig;
    console.log(`📋 New MultiSig address: ${newMultiSigAddress}`);
    console.log(`📋 Current signer: ${signer.address}`);
    
    // Initialize contracts
    const contractsToTransfer = [];
    
    // Check which contracts this signer owns and add them to the transfer list
    if (addresses.redDragon) {
      const RedDragon = await ethers.getContractFactory("RedDragon");
      const redDragon = RedDragon.attach(addresses.redDragon);
      try {
        const owner = await redDragon.owner();
        if (owner.toLowerCase() === signer.address.toLowerCase()) {
          contractsToTransfer.push({ name: "RedDragon Token", contract: redDragon });
        }
      } catch (error) {
        console.error(`❌ Error checking RedDragon Token ownership:`, error.message);
      }
    }
    
    if (addresses.lottery) {
      const Lottery = await ethers.getContractFactory("RedDragonSwapLottery");
      const lottery = Lottery.attach(addresses.lottery);
      try {
        const owner = await lottery.owner();
        if (owner.toLowerCase() === signer.address.toLowerCase()) {
          contractsToTransfer.push({ name: "Lottery", contract: lottery });
        }
      } catch (error) {
        console.error(`❌ Error checking Lottery ownership:`, error.message);
      }
    }
    
    if (addresses.paintswapVerifier) {
      const Verifier = await ethers.getContractFactory("RedDragonPaintSwapVerifier");
      const verifier = Verifier.attach(addresses.paintswapVerifier);
      try {
        const owner = await verifier.owner();
        if (owner.toLowerCase() === signer.address.toLowerCase()) {
          contractsToTransfer.push({ name: "PaintSwap Verifier", contract: verifier });
        }
      } catch (error) {
        console.error(`❌ Error checking PaintSwap Verifier ownership:`, error.message);
      }
    }
    
    if (addresses.lpBooster) {
      const LPBooster = await ethers.getContractFactory("RedDragonLPBooster");
      const lpBooster = LPBooster.attach(addresses.lpBooster);
      try {
        const owner = await lpBooster.owner();
        if (owner.toLowerCase() === signer.address.toLowerCase()) {
          contractsToTransfer.push({ name: "LP Booster", contract: lpBooster });
        }
      } catch (error) {
        console.error(`❌ Error checking LP Booster ownership:`, error.message);
      }
    }
    
    if (addresses.ve8020FeeDistributor) {
      const FeeDistributor = await ethers.getContractFactory("Ve8020FeeDistributor");
      const feeDistributor = FeeDistributor.attach(addresses.ve8020FeeDistributor);
      try {
        const owner = await feeDistributor.owner();
        if (owner.toLowerCase() === signer.address.toLowerCase()) {
          contractsToTransfer.push({ name: "ve8020 Fee Distributor", contract: feeDistributor });
        }
      } catch (error) {
        console.error(`❌ Error checking ve8020 Fee Distributor ownership:`, error.message);
      }
    }
    
    if (addresses.feeManager) {
      const FeeManager = await ethers.getContractFactory("RedDragonFeeManager");
      const feeManager = FeeManager.attach(addresses.feeManager);
      try {
        const owner = await feeManager.owner();
        if (owner.toLowerCase() === signer.address.toLowerCase()) {
          contractsToTransfer.push({ name: "Fee Manager", contract: feeManager });
        }
      } catch (error) {
        console.error(`❌ Error checking Fee Manager ownership:`, error.message);
      }
    }
    
    // Report on contracts that will be transferred
    if (contractsToTransfer.length === 0) {
      console.error("❌ No contracts found that are owned by the current signer!");
      console.log("This script must be run using the private key of the current contract owner(s).");
      console.log("Based on the check, you should run this with one of these accounts:");
      console.log("- 0xCF74dB6120af38373290556a64f32016b5EB7486 (owns RedDragon Token, Lottery, LP Booster)");
      console.log("- 0x03bF2b1eC635783c88aD880D85F0c8c689EE962C (owns PaintSwap Verifier, ve8020 Fee Distributor, Fee Manager)");
      process.exit(1);
    }
    
    console.log(`\n📋 Found ${contractsToTransfer.length} contracts owned by the current signer:`);
    contractsToTransfer.forEach(({ name }) => console.log(`- ${name}`));
    
    // Confirm before proceeding
    console.log("\n⚠️ WARNING: This will transfer ownership of these contracts to the new MultiSig:");
    console.log(`New MultiSig: ${newMultiSigAddress}`);
    console.log("\nPlease make sure this is what you want to do!");
    console.log("You should only run this script from the account that currently owns these contracts.");
    
    // Transfer ownership
    console.log("\n📤 Transferring ownership to new MultiSig...");
    for (const { name, contract } of contractsToTransfer) {
      try {
        console.log(`- Transferring ownership of ${name}...`);
        const tx = await contract.transferOwnership(newMultiSigAddress);
        await tx.wait();
        console.log(`  ✅ Ownership of ${name} transferred to new MultiSig`);
      } catch (error) {
        console.error(`  ❌ Failed to transfer ownership of ${name}:`, error.message);
      }
    }
    
    console.log("\n🎉 Ownership transfer completed!");
    
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