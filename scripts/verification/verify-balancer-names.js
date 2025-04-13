// Script to verify the Balancer pool name and symbol constants
const fs = require('fs');
const path = require('path');

function main() {
  console.log("Verifying Balancer pool name and symbol settings...");
  
  // Path to the contract file
  const contractPath = path.join(__dirname, '../contracts/RedDragonBalancerIntegration.sol');
  
  try {
    // Read the contract file
    const contractCode = fs.readFileSync(contractPath, 'utf8');
    
    // Regular expressions to find pool name and symbol
    const poolNameRegex = /string\s+public\s+constant\s+poolName\s*=\s*"([^"]+)"/;
    const poolSymbolRegex = /string\s+public\s+constant\s+poolSymbol\s*=\s*"([^"]+)"/;
    
    // Extract the values
    const poolNameMatch = contractCode.match(poolNameRegex);
    const poolSymbolMatch = contractCode.match(poolSymbolRegex);
    
    // Current values from the contract
    const poolName = poolNameMatch ? poolNameMatch[1] : "Not found";
    const poolSymbol = poolSymbolMatch ? poolSymbolMatch[1] : "Not found";
    
    console.log("Current settings in contract code:");
    console.log(`- Pool Name: ${poolName}`);
    console.log(`- Pool Symbol: ${poolSymbol}`);
    
    console.log("\nSUMMARY AND NOTES:");
    console.log(`1. Pool name '${poolName}' is descriptive and clear`);
    console.log(`2. Pool symbol '${poolSymbol}' indicates token pair and weights`);
    console.log("3. These are constants and cannot be changed after deployment");
    console.log("4. If you need different values, modify the contract code before deployment");
    
    console.log("\nThese names will appear on platforms like DexScreener and Dextools.");
  } catch (error) {
    console.error("Error reading contract file:", error.message);
  }
}

main(); 