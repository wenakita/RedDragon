const fs = require('fs');
require("dotenv").config();

/**
 * Generate verification status check links for all contracts
 */
async function main() {
  console.log("🔍 Generating verification status check links...");

  try {
    // Load deployment addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    const addresses = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    
    // Sonic block explorer base URL
    const explorerBaseUrl = "https://sonicscan.org/address/";
    
    console.log("\n📋 Contract Verification Links:");
    console.log("=============================");
    
    // Core contracts
    console.log("\n## Core Contracts\n");
    
    if (addresses.redDragon) {
      console.log(`RedDragon Token:       ${explorerBaseUrl}${addresses.redDragon}#code`);
    }
    
    if (addresses.lottery) {
      console.log(`Lottery:               ${explorerBaseUrl}${addresses.lottery}#code`);
    }
    
    if (addresses.paintswapVerifier) {
      console.log(`PaintSwap Verifier:    ${explorerBaseUrl}${addresses.paintswapVerifier}#code`);
    }
    
    if (addresses.multiSig) {
      console.log(`MultiSig:              ${explorerBaseUrl}${addresses.multiSig}#code`);
    }
    
    // LP System
    console.log("\n## LP System\n");
    
    if (addresses.lpBooster) {
      console.log(`LP Booster:            ${explorerBaseUrl}${addresses.lpBooster}#code`);
    }
    
    // ve8020 System
    console.log("\n## ve8020 System\n");
    
    if (addresses.ve8020) {
      console.log(`ve8020:                ${explorerBaseUrl}${addresses.ve8020}#code`);
    }
    
    if (addresses.ve8020FeeDistributor) {
      console.log(`ve8020 Fee Distributor: ${explorerBaseUrl}${addresses.ve8020FeeDistributor}#code`);
    }
    
    if (addresses.feeManager) {
      console.log(`Fee Manager:           ${explorerBaseUrl}${addresses.feeManager}#code`);
    }
    
    // Instructions
    console.log("\n✅ Verification Check Instructions:");
    console.log("1. Open each link in your browser");
    console.log("2. Check that the contract code is visible (not just bytecode)");
    console.log("3. Ensure all constructor arguments match your deployment parameters");
    
    // Export to text file
    let outputText = "# RedDragon Contract Verification Links\n\n";
    outputText += "Use these links to check that all contracts are properly verified on the block explorer.\n\n";
    
    // Core contracts
    outputText += "## Core Contracts\n\n";
    
    if (addresses.redDragon) {
      outputText += `- [RedDragon Token](${explorerBaseUrl}${addresses.redDragon}#code)\n`;
    }
    
    if (addresses.lottery) {
      outputText += `- [Lottery](${explorerBaseUrl}${addresses.lottery}#code)\n`;
    }
    
    if (addresses.paintswapVerifier) {
      outputText += `- [PaintSwap Verifier](${explorerBaseUrl}${addresses.paintswapVerifier}#code)\n`;
    }
    
    if (addresses.multiSig) {
      outputText += `- [MultiSig](${explorerBaseUrl}${addresses.multiSig}#code)\n`;
    }
    
    // LP System
    outputText += "\n## LP System\n\n";
    
    if (addresses.lpBooster) {
      outputText += `- [LP Booster](${explorerBaseUrl}${addresses.lpBooster}#code)\n`;
    }
    
    // ve8020 System
    outputText += "\n## ve8020 System\n\n";
    
    if (addresses.ve8020) {
      outputText += `- [ve8020](${explorerBaseUrl}${addresses.ve8020}#code)\n`;
    }
    
    if (addresses.ve8020FeeDistributor) {
      outputText += `- [ve8020 Fee Distributor](${explorerBaseUrl}${addresses.ve8020FeeDistributor}#code)\n`;
    }
    
    if (addresses.feeManager) {
      outputText += `- [Fee Manager](${explorerBaseUrl}${addresses.feeManager}#code)\n`;
    }
    
    // Write to file
    fs.writeFileSync("VERIFICATION-LINKS.md", outputText);
    
    console.log("\n✅ Links exported to VERIFICATION-LINKS.md");
    
  } catch (error) {
    console.error("❌ Error generating verification links:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Script error:", error);
    process.exit(1);
  }); 