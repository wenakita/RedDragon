const fs = require('fs');
require("dotenv").config();

/**
 * Generate a markdown file with all current deployment addresses
 * This can be used to update the GitHub repository with the latest addresses
 */
async function main() {
  console.log("🚀 Generating deployment addresses markdown...");

  try {
    // Load deployment addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    let addresses = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    
    // Output file
    const outputFile = "DEPLOYMENT-ADDRESSES.md";
    
    // Generate markdown content
    let markdown = `# RedDragon Deployment Addresses\n\n`;
    markdown += `Last updated: ${new Date().toUTCString()}\n\n`;
    
    markdown += `## Core Contracts\n\n`;
    markdown += `| Contract | Address | Notes |\n`;
    markdown += `| --- | --- | --- |\n`;
    
    // Core contracts in a specific order
    const coreContracts = [
      { name: "RedDragon Token", key: "redDragon", notes: "Main token" },
      { name: "Lottery", key: "lottery", notes: "Handles jackpot draws" },
      { name: "PaintSwap Verifier", key: "paintswapVerifier", notes: "Provides VRF for lottery" },
      { name: "MultiSig", key: "multiSig", notes: "Governance wallet (2/3)" },
    ];
    
    // Add core contracts to markdown
    coreContracts.forEach(contract => {
      if (addresses[contract.key]) {
        markdown += `| ${contract.name} | \`${addresses[contract.key]}\` | ${contract.notes} |\n`;
      }
    });
    
    markdown += `\n## LP Boost System\n\n`;
    markdown += `| Contract | Address | Notes |\n`;
    markdown += `| --- | --- | --- |\n`;
    
    // LP Boost contracts
    const lpBoostContracts = [
      { name: "LP Token", key: "lpToken", notes: "RedDragon-WSONIC 80/20 LP" },
      { name: "LP Booster", key: "lpBooster", notes: "Provides probability boosts based on LP holdings" },
    ];
    
    // Add LP Boost contracts to markdown
    lpBoostContracts.forEach(contract => {
      if (addresses[contract.key]) {
        markdown += `| ${contract.name} | \`${addresses[contract.key]}\` | ${contract.notes} |\n`;
      }
    });
    
    markdown += `\n## ve8020 System\n\n`;
    markdown += `| Contract | Address | Notes |\n`;
    markdown += `| --- | --- | --- |\n`;
    
    // ve8020 contracts
    const ve8020Contracts = [
      { name: "ve8020", key: "ve8020", notes: "Vote-escrowed token for LP stakers" },
      { name: "ve8020 Fee Distributor", key: "ve8020FeeDistributor", notes: "Distributes fees to ve8020 holders" },
      { name: "Fee Manager", key: "feeManager", notes: "Manages fee distribution" },
    ];
    
    // Add ve8020 contracts to markdown
    ve8020Contracts.forEach(contract => {
      if (addresses[contract.key]) {
        markdown += `| ${contract.name} | \`${addresses[contract.key]}\` | ${contract.notes} |\n`;
      }
    });
    
    // Add other configuration addresses
    markdown += `\n## Configuration Addresses\n\n`;
    markdown += `| Purpose | Address | Notes |\n`;
    markdown += `| --- | --- | --- |\n`;
    
    const configAddresses = [
      { name: "Jackpot Vault", key: "jackpotVault", notes: "Receives jackpot fees" },
      { name: "Liquidity Vault", key: "liquidityVault", notes: "Receives liquidity fees" },
      { name: "Development Vault", key: "developmentVault", notes: "Receives development fees" },
      { name: "Burn Address", key: "burnAddress", notes: "Address for burning tokens" },
      { name: "Wrapped Sonic", key: "wrappedSonic", notes: "WSONIC token address" },
    ];
    
    // Add configuration addresses to markdown
    configAddresses.forEach(address => {
      if (addresses[address.key]) {
        markdown += `| ${address.name} | \`${addresses[address.key]}\` | ${address.notes} |\n`;
      }
    });
    
    // Write the markdown to file
    fs.writeFileSync(outputFile, markdown);
    
    console.log(`✅ Markdown file generated at ${outputFile}`);
    console.log("You can now commit this file to your GitHub repository");
    
    // Also print the markdown to console
    console.log("\n📋 Generated Markdown:\n");
    console.log(markdown);
    
  } catch (error) {
    console.error("❌ Error generating markdown:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Script error:", error);
    process.exit(1);
  }); 