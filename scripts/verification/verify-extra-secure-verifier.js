// Verify Extra Secure RedDragonVerifier on SonicScan
const { run } = require("hardhat");

async function main() {
  console.log("Verifying Extra Secure RedDragonVerifier on SonicScan...");
  
  // Get contract addresses from config
  const configPath = require('path').resolve(__dirname, '../config/deployment-addresses-sonic.json');
  const config = require(configPath);
  
  if (!config.extraSecureRedDragonVerifier) {
    console.error("Extra secure verifier address not found in config. Please deploy it first using deploy-extra-secure-verifier.js");
    process.exit(1);
  }
  
  console.log("Contract Address:", config.extraSecureRedDragonVerifier);
  console.log("Constructor Arguments:");
  console.log("  RedDragon:", config.redDragon);
  console.log("  Lottery:", config.lottery);
  console.log("  LP Token:", config.lpToken);
  
  try {
    // Verify the contract
    await run("verify:verify", {
      address: config.extraSecureRedDragonVerifier,
      constructorArguments: [
        config.redDragon,
        config.lottery,
        "0x0000000000000000000000000000000000000000", // LP Burner (not used)
        config.lpToken
      ],
    });
    
    console.log("Verification successful!");
  } catch (error) {
    console.error("Verification failed:", error.message);
    
    // If failed, provide instructions for manual flattening
    console.log("\nIf verification failed, you can try using the flatten-and-verify script:");
    console.log("npx hardhat run scripts/flatten-and-verify.js");
    console.log("Then verify manually on SonicScan using the flattened file.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 