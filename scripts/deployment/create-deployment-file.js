const fs = require("fs");
require("dotenv").config();

/**
 * This script creates or updates the deployment-addresses-sonic.json file
 * with contract addresses that are already deployed.
 */
async function main() {
  console.log("🚀 Creating deployment addresses file...");
  
  // The file to create/update
  const addressesFile = "deployment-addresses-sonic.json";
  
  // Load existing file if it exists
  let addresses = {};
  try {
    if (fs.existsSync(addressesFile)) {
      addresses = JSON.parse(fs.readFileSync(addressesFile));
      console.log("📝 Loaded existing deployment addresses");
    }
  } catch (error) {
    console.log("⚠️ Error loading existing file, creating new one");
  }
  
  // Prompt for input
  const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  // If no verifier address is provided, ask for it
  if (!addresses.verifier) {
    const verifierAddress = await new Promise(resolve => {
      readline.question("Enter the deployed RedDragonPaintSwapVerifier address: ", (answer) => {
        resolve(answer);
      });
    });
    
    if (verifierAddress && verifierAddress.startsWith("0x") && verifierAddress.length === 42) {
      addresses.verifier = verifierAddress;
      console.log(`✅ Added verifier address: ${verifierAddress}`);
    } else {
      console.error("❌ Invalid address format. Address should start with 0x and be 42 characters long.");
      readline.close();
      process.exit(1);
    }
  } else {
    console.log(`ℹ️ Verifier address already set: ${addresses.verifier}`);
  }
  
  // Save the file
  fs.writeFileSync(addressesFile, JSON.stringify(addresses, null, 2));
  console.log(`✅ Deployment addresses saved to ${addressesFile}`);
  
  readline.close();
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 