// Script to update contract addresses with mock values for testing
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: "./deployment.env" });

async function main() {
  console.log("Updating configuration with mock contract addresses...");
  
  // Define mock addresses
  const mockAddresses = {
    VRF_CONSUMER_SONIC: "0xA1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2",
    VRF_REQUESTER_ARBITRUM: "0xB1C2D3E4F5A6B1C2D3E4F5A6B1C2D3E4F5A6B1C2",
    DRAGON_ADDRESS: "0xC1D2E3F4A5B6C1D2E3F4A5B6C1D2E3F4A5B6C1D2",
    JACKPOT_VAULT_ADDRESS: "0xD1E2F3A4B5C6D1E2F3A4B5C6D1E2F3A4B5C6D1E2"
  };
  
  // Update deployment.env
  const envPath = path.join(__dirname, '../../deployment.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Update each variable in the .env file
  Object.entries(mockAddresses).forEach(([key, value]) => {
    const regex = new RegExp(`${key}=.*`, 'g');
    
    if (envContent.match(regex)) {
      // If the variable exists, update it
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      // If the variable doesn't exist, add it under the appropriate section
      if (key.includes('VRF')) {
        // Add to VRF Configuration section
        envContent = envContent.replace('# VRF Configuration', `# VRF Configuration\n${key}=${value}`);
      } else if (key.includes('DRAGON')) {
        // Add to Token Addresses section
        envContent = envContent.replace('# Token Addresses', `# Token Addresses\n${key}=${value}`);
      } else if (key.includes('JACKPOT')) {
        // Add to Lottery Configuration section
        envContent = envContent.replace('# Lottery Configuration', `# Lottery Configuration\n${key}=${value}`);
      }
    }
  });
  
  // Write back to deployment.env
  fs.writeFileSync(envPath, envContent);
  console.log("Updated deployment.env with mock values");
  
  // Update contract-addresses.json and arbitrum-contract-addresses.json
  const deploymentsDir = path.join(__dirname, '../../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  // Update Sonic contract addresses
  const sonicAddressesPath = path.join(deploymentsDir, 'contract-addresses.json');
  let sonicAddresses = {};
  
  if (fs.existsSync(sonicAddressesPath)) {
    sonicAddresses = JSON.parse(fs.readFileSync(sonicAddressesPath, 'utf8'));
  }
  
  sonicAddresses.enhancedSonicVRFConsumer = mockAddresses.VRF_CONSUMER_SONIC;
  sonicAddresses.dragon = mockAddresses.DRAGON_ADDRESS;
  sonicAddresses.jackpotVault = mockAddresses.JACKPOT_VAULT_ADDRESS;
  
  fs.writeFileSync(sonicAddressesPath, JSON.stringify(sonicAddresses, null, 2));
  console.log("Updated contract-addresses.json with mock values");
  
  // Update Arbitrum contract addresses
  const arbitrumAddressesPath = path.join(deploymentsDir, 'arbitrum-contract-addresses.json');
  let arbitrumAddresses = {};
  
  if (fs.existsSync(arbitrumAddressesPath)) {
    arbitrumAddresses = JSON.parse(fs.readFileSync(arbitrumAddressesPath, 'utf8'));
  }
  
  arbitrumAddresses.arbitrumVRFRequester = mockAddresses.VRF_REQUESTER_ARBITRUM;
  
  fs.writeFileSync(arbitrumAddressesPath, JSON.stringify(arbitrumAddresses, null, 2));
  console.log("Updated arbitrum-contract-addresses.json with mock values");
  
  console.log("\nMock values have been set. You can now proceed with testing the LayerZero Read setup.");
  
  // Print the updated mock values for reference
  console.log("\nMock VRF Consumer (Sonic):", mockAddresses.VRF_CONSUMER_SONIC);
  console.log("Mock VRF Requester (Arbitrum):", mockAddresses.VRF_REQUESTER_ARBITRUM);
  console.log("Mock Dragon Token:", mockAddresses.DRAGON_ADDRESS);
  console.log("Mock Jackpot Vault:", mockAddresses.JACKPOT_VAULT_ADDRESS);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 