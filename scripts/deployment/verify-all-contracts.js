const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Verify all contracts on the block explorer
 */
async function main() {
  console.log("🔍 Starting contract verification process...");

  try {
    // Load deployment addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    const addresses = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    
    console.log("\n📋 Loaded addresses for verification:");
    
    // Verify contracts one by one
    if (addresses.redDragon) {
      console.log(`\n🔍 Verifying RedDragon token at ${addresses.redDragon}...`);
      try {
        await hre.run("verify:verify", {
          address: addresses.redDragon,
          constructorArguments: [
            addresses.jackpotVault,
            addresses.liquidityVault,
            addresses.burnAddress,
            addresses.developmentVault,
            addresses.wrappedSonic
          ],
        });
        console.log("✅ RedDragon token verified successfully");
      } catch (error) {
        console.error(`❌ RedDragon verification failed: ${error.message}`);
      }
    }
    
    if (addresses.lottery) {
      console.log(`\n🔍 Verifying RedDragonSwapLottery at ${addresses.lottery}...`);
      try {
        await hre.run("verify:verify", {
          address: addresses.lottery,
          constructorArguments: [
            addresses.wrappedSonic,
            addresses.paintswapVerifier
          ],
        });
        console.log("✅ RedDragonSwapLottery verified successfully");
      } catch (error) {
        console.error(`❌ RedDragonSwapLottery verification failed: ${error.message}`);
      }
    }
    
    if (addresses.lpBooster) {
      console.log(`\n🔍 Verifying RedDragonLPBooster at ${addresses.lpBooster}...`);
      try {
        const minLpAmount = hre.ethers.parseEther("0.1");
        await hre.run("verify:verify", {
          address: addresses.lpBooster,
          constructorArguments: [
            addresses.lpToken,
            addresses.lottery,
            minLpAmount
          ],
        });
        console.log("✅ RedDragonLPBooster verified successfully");
      } catch (error) {
        console.error(`❌ RedDragonLPBooster verification failed: ${error.message}`);
      }
    }
    
    if (addresses.ve8020) {
      console.log(`\n🔍 Verifying ve8020 at ${addresses.ve8020}...`);
      try {
        await hre.run("verify:verify", {
          address: addresses.ve8020,
          constructorArguments: [
            addresses.lpToken
          ],
        });
        console.log("✅ ve8020 verified successfully");
      } catch (error) {
        console.error(`❌ ve8020 verification failed: ${error.message}`);
      }
    }
    
    if (addresses.paintswapVerifier) {
      console.log(`\n🔍 Verifying RedDragonPaintSwapVerifier at ${addresses.paintswapVerifier}...`);
      try {
        await hre.run("verify:verify", {
          address: addresses.paintswapVerifier,
          constructorArguments: [],
        });
        console.log("✅ RedDragonPaintSwapVerifier verified successfully");
      } catch (error) {
        console.error(`❌ RedDragonPaintSwapVerifier verification failed: ${error.message}`);
      }
    }
    
    if (addresses.multiSig) {
      console.log(`\n🔍 Verifying RedDragonMultiSig at ${addresses.multiSig}...`);
      try {
        // Get the correct owner addresses
        const owners = [
          "0x78266EAb20Ff1483a926F183B3E5A6C84f87D54c", // Deployer
          "0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db", // Owner 2
          "0x8ba1f109551bD432803012645Ac136ddd64DBA72"  // Owner 3
        ];
        const confirmations = 2;
        
        await hre.run("verify:verify", {
          address: addresses.multiSig,
          constructorArguments: [
            owners,
            confirmations
          ],
        });
        console.log("✅ RedDragonMultiSig verified successfully");
      } catch (error) {
        console.error(`❌ RedDragonMultiSig verification failed: ${error.message}`);
      }
    }
    
    if (addresses.ve8020FeeDistributor) {
      console.log(`\n🔍 Verifying Ve8020FeeDistributor at ${addresses.ve8020FeeDistributor}...`);
      try {
        await hre.run("verify:verify", {
          address: addresses.ve8020FeeDistributor,
          constructorArguments: [
            addresses.ve8020,
            addresses.redDragon
          ],
        });
        console.log("✅ Ve8020FeeDistributor verified successfully");
      } catch (error) {
        console.error(`❌ Ve8020FeeDistributor verification failed: ${error.message}`);
      }
    }
    
    if (addresses.feeManager) {
      console.log(`\n🔍 Verifying RedDragonFeeManager at ${addresses.feeManager}...`);
      try {
        await hre.run("verify:verify", {
          address: addresses.feeManager,
          constructorArguments: [
            addresses.redDragon,
            addresses.ve8020FeeDistributor,
            addresses.jackpotVault,
            addresses.burnAddress
          ],
        });
        console.log("✅ RedDragonFeeManager verified successfully");
      } catch (error) {
        console.error(`❌ RedDragonFeeManager verification failed: ${error.message}`);
      }
    }
    
    console.log("\n🎉 Contract verification process completed!");
    console.log("📝 Any failures may be due to contracts already being verified or incorrect constructor arguments");
    
    console.log("\n⚠️ Next Steps for DEX Listing:");
    console.log("1. Submit RedDragon token details to DEX screeners");
    console.log("2. Include security features in your submission:");
    console.log("   - Ownership transferred to multisig");
    console.log("   - No mint function");
    console.log("   - No blacklist function");
    console.log("   - Timelock protection");
    console.log("   - Transparent fee structure");
    
  } catch (error) {
    console.error("❌ Verification process error:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Script error:", error);
    process.exit(1);
  }); 