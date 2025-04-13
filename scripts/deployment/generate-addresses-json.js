const fs = require('fs');
require("dotenv").config();

/**
 * Generate a formatted JSON file with all current deployment addresses
 * This can be used for web applications or other integrations
 */
async function main() {
  console.log("🚀 Generating formatted deployment addresses JSON...");

  try {
    // Load deployment addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    let addresses = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    
    // Output file
    const outputFile = "reddragon-addresses.json";
    
    // Create formatted output
    const formattedAddresses = {
      metadata: {
        network: "sonic",
        chainId: 2522,
        lastUpdated: new Date().toISOString(),
        deployer: addresses.liquidityVault || ""
      },
      core: {
        token: addresses.redDragon || "",
        lottery: addresses.lottery || "",
        verifier: addresses.paintswapVerifier || "",
        multiSig: addresses.multiSig || ""
      },
      lpSystem: {
        lpToken: addresses.lpToken || "",
        lpTokenDescription: "RedDragon-WSONIC 80/20 LP",
        lpBooster: addresses.lpBooster || ""
      },
      ve8020System: {
        ve8020: addresses.ve8020 || "",
        feeDistributor: addresses.ve8020FeeDistributor || "",
        feeManager: addresses.feeManager || ""
      },
      configuration: {
        jackpotVault: addresses.jackpotVault || "",
        liquidityVault: addresses.liquidityVault || "",
        developmentVault: addresses.developmentVault || "",
        burnAddress: addresses.burnAddress || "",
        wrappedSonic: addresses.wrappedSonic || ""
      },
      version: "1.0.0"
    };
    
    // Write the JSON to file (nicely formatted)
    fs.writeFileSync(outputFile, JSON.stringify(formattedAddresses, null, 2));
    
    console.log(`✅ JSON file generated at ${outputFile}`);
    console.log("You can use this file for web applications or other integrations");
    
  } catch (error) {
    console.error("❌ Error generating JSON:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Script error:", error);
    process.exit(1);
  }); 