const { exec } = require('child_process');
const fs = require('fs');
require('dotenv').config();

async function main() {
  console.log("Updating GCP contract-addresses.json secret with new ve69LP address...");
  
  // Check if contract-addresses.json exists
  if (!fs.existsSync('contract-addresses.json')) {
    console.error("Error: contract-addresses.json not found!");
    process.exit(1);
  }
  
  // Get deployments.json
  let deployments;
  try {
    deployments = JSON.parse(fs.readFileSync('deployments.json', 'utf8'));
  } catch (error) {
    console.error("Error reading deployments.json:", error.message);
    process.exit(1);
  }
  
  // Get contract-addresses.json
  let contractAddresses;
  try {
    contractAddresses = JSON.parse(fs.readFileSync('contract-addresses.json', 'utf8'));
  } catch (error) {
    console.error("Error reading contract-addresses.json:", error.message);
    process.exit(1);
  }
  
  // Update ve69LP address in contract-addresses.json
  const newVe69LPAddress = deployments.ve69lp;
  if (!newVe69LPAddress) {
    console.error("Error: ve69LP address not found in deployments.json");
    process.exit(1);
  }
  
  console.log(`New ve69LP address: ${newVe69LPAddress}`);
  
  // Update address
  let updated = false;
  if (contractAddresses.tokens && contractAddresses.tokens.ve69LP) {
    const oldAddress = contractAddresses.tokens.ve69LP;
    contractAddresses.tokens.ve69LP = newVe69LPAddress;
    console.log(`Updated ve69LP address in contract-addresses.json:`);
    console.log(`  Old: ${oldAddress}`);
    console.log(`  New: ${newVe69LPAddress}`);
    updated = true;
  } else {
    console.warn("Warning: ve69LP address not found in contract-addresses.json");
    if (!contractAddresses.tokens) {
      contractAddresses.tokens = {};
    }
    contractAddresses.tokens.ve69LP = newVe69LPAddress;
    console.log(`Added ve69LP address to contract-addresses.json: ${newVe69LPAddress}`);
    updated = true;
  }
  
  if (updated) {
    // Write updated contract-addresses.json
    fs.writeFileSync('contract-addresses.json', JSON.stringify(contractAddresses, null, 2));
    console.log("contract-addresses.json updated successfully");
    
    // Update GCP secret
    console.log("Updating GCP secret...");
    
    // Get GCP project ID from environment or use a default
    const projectId = process.env.GCP_PROJECT_ID;
    if (!projectId) {
      console.warn("Warning: GCP_PROJECT_ID not found in environment. Using the current GCP project.");
    }
    
    // Command to update GCP secret
    const updateCommand = projectId
      ? `gcloud secrets versions add dragon-contracts --project=${projectId} --data-file=contract-addresses.json`
      : `gcloud secrets versions add dragon-contracts --data-file=contract-addresses.json`;
    
    // Execute command
    exec(updateCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error updating GCP secret: ${error.message}`);
        console.error("Please update the GCP secret manually:");
        console.error("gcloud secrets versions add dragon-contracts --data-file=contract-addresses.json");
        process.exit(1);
      }
      
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
      
      console.log(`stdout: ${stdout}`);
      console.log("✅ GCP secret 'dragon-contracts' updated successfully with new ve69LP address!");
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 