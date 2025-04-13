const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Deploy remaining components and complete the redeployment
 */
async function main() {
  console.log("🚀 Finishing redeployment of remaining components...");

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
    
    console.log(`\n📋 Using MultiSig: ${addresses.multiSig}`);
    
    // Deploy Ve8020FeeDistributor
    console.log("\n📦 Step 1: Deploying Ve8020FeeDistributor...");
    const Ve8020FeeDistributor = await ethers.getContractFactory("Ve8020FeeDistributor");
    const feeDistributor = await Ve8020FeeDistributor.deploy(
      addresses.ve8020,
      addresses.redDragon
    );
    await feeDistributor.waitForDeployment();
    const feeDistributorAddress = await feeDistributor.getAddress();
    console.log("✅ Ve8020FeeDistributor deployed to:", feeDistributorAddress);
    addresses.ve8020FeeDistributor = feeDistributorAddress;
    
    // Save addresses after fee distributor deployment
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    // Deploy RedDragonFeeManager
    console.log("\n📦 Step 2: Deploying RedDragonFeeManager...");
    const RedDragonFeeManager = await ethers.getContractFactory("RedDragonFeeManager");
    const feeManager = await RedDragonFeeManager.deploy(
      addresses.redDragon,
      feeDistributorAddress,
      addresses.jackpotVault,
      addresses.burnAddress
    );
    await feeManager.waitForDeployment();
    const feeManagerAddress = await feeManager.getAddress();
    console.log("✅ RedDragonFeeManager deployed to:", feeManagerAddress);
    addresses.feeManager = feeManagerAddress;
    
    // Save addresses after fee manager deployment
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    
    // Transfer ownership where possible
    console.log("\n📦 Step 3: Transferring ownership to MultiSig where possible...");
    
    // A collection of contracts to transfer ownership
    const contractsToTransfer = [];
    
    // Check which contracts are owned by the deployer and can be transferred
    
    // PaintSwap Verifier
    if (addresses.paintswapVerifier) {
      try {
        console.log("Checking PaintSwap Verifier ownership...");
        const Verifier = await ethers.getContractFactory("RedDragonPaintSwapVerifier");
        const verifier = Verifier.attach(addresses.paintswapVerifier);
        const owner = await verifier.owner();
        if (owner.toLowerCase() === deployer.address.toLowerCase()) {
          console.log("- PaintSwap Verifier is owned by deployer");
          contractsToTransfer.push({ name: "PaintSwap Verifier", contract: verifier });
        } else {
          console.log(`- PaintSwap Verifier is owned by: ${owner}`);
        }
      } catch (error) {
        console.error("Error checking PaintSwap Verifier:", error.message);
      }
    }
    
    // ve8020
    if (addresses.ve8020) {
      try {
        console.log("Checking ve8020 ownership...");
        const Ve8020 = await ethers.getContractFactory("ve8020");
        const ve8020 = Ve8020.attach(addresses.ve8020);
        const owner = await ve8020.owner();
        if (owner.toLowerCase() === deployer.address.toLowerCase()) {
          console.log("- ve8020 is owned by deployer");
          contractsToTransfer.push({ name: "ve8020", contract: ve8020 });
        } else {
          console.log(`- ve8020 is owned by: ${owner}`);
        }
      } catch (error) {
        console.error("Error checking ve8020:", error.message);
      }
    }
    
    // LP Booster
    if (addresses.lpBooster) {
      try {
        console.log("Checking LP Booster ownership...");
        const LPBooster = await ethers.getContractFactory("RedDragonLPBooster");
        const lpBooster = LPBooster.attach(addresses.lpBooster);
        const owner = await lpBooster.owner();
        if (owner.toLowerCase() === deployer.address.toLowerCase()) {
          console.log("- LP Booster is owned by deployer");
          contractsToTransfer.push({ name: "LP Booster", contract: lpBooster });
        } else {
          console.log(`- LP Booster is owned by: ${owner}`);
        }
      } catch (error) {
        console.error("Error checking LP Booster:", error.message);
      }
    }
    
    // RedDragon Token
    if (addresses.redDragon) {
      try {
        console.log("Checking RedDragon Token ownership...");
        const RedDragon = await ethers.getContractFactory("RedDragon");
        const redDragon = RedDragon.attach(addresses.redDragon);
        const owner = await redDragon.owner();
        if (owner.toLowerCase() === deployer.address.toLowerCase()) {
          console.log("- RedDragon Token is owned by deployer");
          contractsToTransfer.push({ name: "RedDragon Token", contract: redDragon });
        } else {
          console.log(`- RedDragon Token is owned by: ${owner}`);
        }
      } catch (error) {
        console.error("Error checking RedDragon Token:", error.message);
      }
    }
    
    // Lottery
    if (addresses.lottery) {
      try {
        console.log("Checking Lottery ownership...");
        const Lottery = await ethers.getContractFactory("RedDragonSwapLottery");
        const lottery = Lottery.attach(addresses.lottery);
        const owner = await lottery.owner();
        if (owner.toLowerCase() === deployer.address.toLowerCase()) {
          console.log("- Lottery is owned by deployer");
          contractsToTransfer.push({ name: "Lottery", contract: lottery });
        } else {
          console.log(`- Lottery is owned by: ${owner}`);
        }
      } catch (error) {
        console.error("Error checking Lottery:", error.message);
      }
    }
    
    // ve8020 Fee Distributor
    if (addresses.ve8020FeeDistributor) {
      try {
        console.log("Checking ve8020 Fee Distributor ownership...");
        const FeeDistributor = await ethers.getContractFactory("Ve8020FeeDistributor");
        const feeDistributor = FeeDistributor.attach(addresses.ve8020FeeDistributor);
        const owner = await feeDistributor.owner();
        if (owner.toLowerCase() === deployer.address.toLowerCase()) {
          console.log("- ve8020 Fee Distributor is owned by deployer");
          contractsToTransfer.push({ name: "ve8020 Fee Distributor", contract: feeDistributor });
        } else {
          console.log(`- ve8020 Fee Distributor is owned by: ${owner}`);
        }
      } catch (error) {
        console.error("Error checking ve8020 Fee Distributor:", error.message);
      }
    }
    
    // Fee Manager
    if (addresses.feeManager) {
      try {
        console.log("Checking Fee Manager ownership...");
        const FeeManager = await ethers.getContractFactory("RedDragonFeeManager");
        const feeManager = FeeManager.attach(addresses.feeManager);
        const owner = await feeManager.owner();
        if (owner.toLowerCase() === deployer.address.toLowerCase()) {
          console.log("- Fee Manager is owned by deployer");
          contractsToTransfer.push({ name: "Fee Manager", contract: feeManager });
        } else {
          console.log(`- Fee Manager is owned by: ${owner}`);
        }
      } catch (error) {
        console.error("Error checking Fee Manager:", error.message);
      }
    }
    
    // Transfer ownership to multisig where possible
    if (contractsToTransfer.length > 0) {
      console.log(`\n📤 Transferring ownership of ${contractsToTransfer.length} contracts to MultiSig...`);
      for (const { name, contract } of contractsToTransfer) {
        try {
          console.log(`- Transferring ownership of ${name}...`);
          const tx = await contract.transferOwnership(addresses.multiSig);
          await tx.wait();
          console.log(`  ✅ Ownership of ${name} transferred to MultiSig`);
        } catch (error) {
          console.error(`  ❌ Failed to transfer ownership of ${name}:`, error.message);
        }
      }
    } else {
      console.log("\n⚠️ No contracts found that can be transferred by the deployer!");
    }
    
    console.log("\n🎉 Deployment of remaining components finished!");
    console.log(`📝 All addresses saved to ${deploymentFile}`);
    
    // Generate ownership report
    console.log("\n📊 Final Ownership Report:");
    const contracts = [
      { name: "RedDragon Token", factory: "RedDragon", address: addresses.redDragon },
      { name: "Lottery", factory: "RedDragonSwapLottery", address: addresses.lottery },
      { name: "PaintSwap Verifier", factory: "RedDragonPaintSwapVerifier", address: addresses.paintswapVerifier },
      { name: "LP Booster", factory: "RedDragonLPBooster", address: addresses.lpBooster },
      { name: "ve8020", factory: "ve8020", address: addresses.ve8020 },
      { name: "ve8020 Fee Distributor", factory: "Ve8020FeeDistributor", address: addresses.ve8020FeeDistributor },
      { name: "Fee Manager", factory: "RedDragonFeeManager", address: addresses.feeManager }
    ];
    
    for (const { name, factory, address } of contracts) {
      if (address) {
        try {
          const Contract = await ethers.getContractFactory(factory);
          const contract = Contract.attach(address);
          const owner = await contract.owner();
          if (owner.toLowerCase() === addresses.multiSig.toLowerCase()) {
            console.log(`✅ ${name} is owned by the MultiSig`);
          } else {
            console.log(`❌ ${name} is owned by: ${owner}`);
          }
        } catch (error) {
          console.error(`Error checking ${name}:`, error.message);
        }
      } else {
        console.log(`⚠️ ${name} not deployed`);
      }
    }
    
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