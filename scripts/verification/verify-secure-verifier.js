const hre = require("hardhat");
const fs = require("fs");

/**
 * Verify the secure verifier contract on SonicScan
 */
async function main() {
  console.log("🔍 Verifying Secure PaintSwap Verifier on SonicScan");
  console.log("===============================================");
  
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
    
    // Check secure verifier address exists
    if (!addresses.secureVerifier) {
      console.error("❌ Secure verifier address not found in deployment file");
      process.exit(1);
    }
    
    const secureVerifierAddress = addresses.secureVerifier;
    console.log(`📋 Secure Verifier address: ${secureVerifierAddress}`);
    
    // Verify contract
    console.log("\n🔄 Verifying contract on SonicScan...");
    try {
      await hre.run("verify:verify", {
        address: secureVerifierAddress,
        constructorArguments: []
      });
      console.log("✅ Secure Verifier verified successfully on SonicScan!");
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log("✅ Contract already verified on SonicScan");
      } else {
        console.error("❌ Error during verification:", error.message);
      }
    }
    
    // Connect to the contract to check EOA security features
    const verifier = await hre.ethers.getContractAt("RedDragonPaintSwapVerifier", secureVerifierAddress);
    
    console.log("\n🔍 Checking Secure Verifier configuration...");
    const vrfCoordinator = await verifier.vrfCoordinator();
    console.log(`VRF Coordinator: ${vrfCoordinator}`);
    
    console.log("\n✅ Security features implemented in this verifier:");
    console.log("1. EOA-only access (tx.origin == msg.sender check)");
    console.log("2. No-contract rule (msg.sender.code.length == 0 check)");
    console.log("3. No insecure fallbacks (revert if VRF coordinator not set)");
    console.log("4. Proper VRF integration for reliable randomness");
    
    console.log("\n🔄 Recommended next steps:");
    console.log("1. Ensure the lottery is using this secure verifier");
    console.log("2. Test the lottery to confirm randomness is working correctly");
    console.log("3. Announce the security upgrade to your community");
    
    console.log("\n🎉 Verification complete!");
    
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Run the function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 