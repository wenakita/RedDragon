const hre = require("hardhat");
const fs = require("fs");

/**
 * Verify that the RedDragonSwapLottery is pointing to the correct verifier
 * This is a critical connection for the lottery system
 */
async function main() {
  console.log("🔍 Verifying Lottery -> Verifier Connection");
  console.log("==========================================");
  
  try {
    // Load deployment addresses
    let addresses = {};
    const deploymentFile = "deployment-addresses-sonic.json";
    
    if (fs.existsSync(deploymentFile)) {
      addresses = JSON.parse(fs.readFileSync(deploymentFile));
      console.log("📝 Loaded deployment addresses from file");
    } else {
      console.error("❌ Deployment addresses file not found");
      process.exit(1);
    }
    
    // Check required addresses exist
    if (!addresses.lottery) {
      console.error("❌ Lottery address not found in deployment file");
      process.exit(1);
    }
    
    if (!addresses.verifier) {
      console.error("❌ Verifier address not found in deployment file");
      process.exit(1);
    }
    
    console.log(`\n📋 Addresses to verify:`);
    console.log(`  Lottery: ${addresses.lottery}`);
    console.log(`  Expected Verifier: ${addresses.verifier}`);
    
    // Connect to lottery contract
    console.log("\n🔌 Connecting to lottery contract...");
    const lottery = await hre.ethers.getContractAt("RedDragonSwapLottery", addresses.lottery);
    
    // Get current verifier from lottery
    console.log("🔍 Checking current verifier in lottery contract...");
    const currentVerifier = await lottery.verifier();
    console.log(`  Current Verifier: ${currentVerifier}`);
    
    // Check if verifier matches expected address
    if (currentVerifier.toLowerCase() === addresses.verifier.toLowerCase()) {
      console.log("✅ SUCCESS: Lottery is correctly pointing to the expected verifier");
    } else {
      console.error("❌ ERROR: Lottery is pointing to the wrong verifier");
      console.log(`  Expected: ${addresses.verifier}`);
      console.log(`  Actual: ${currentVerifier}`);
      
      // Check if verifier matches PaintSwap verifier
      if (addresses.paintSwapVerifier && currentVerifier.toLowerCase() === addresses.paintSwapVerifier.toLowerCase()) {
        console.log("ℹ️ NOTE: Lottery is pointing to the PaintSwap verifier instead of the regular verifier");
        
        // Ask if user wants to fix this
        console.log("\n🔧 Do you want to fix this by updating the lottery to point to the regular verifier?");
        console.log("   Run this command:");
        console.log(`   npx hardhat run scripts/fix-system-connections.js --network sonic`);
      }
    }
    
  } catch (error) {
    console.error("❌ Error during verification:", error.message);
    if (error.message.includes("'verifier' is not a function")) {
      console.error("\nThis error suggests a problem with the contract interface.");
      console.error("Please double-check that you're using the correct ABI for the lottery contract.");
    }
    process.exit(1);
  }
}

// Run the verification function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 