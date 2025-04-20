#!/bin/bash
# Deploy all missing contracts in the Dragon ecosystem

echo "==================================================================="
echo "Deploying Missing Dragon Ecosystem Contracts to Sonic Mainnet"
echo "==================================================================="
echo

# Function to deploy a contract and handle status
deploy_contract() {
  local script_name=$1
  local contract_name=$2
  
  echo "Deploying $contract_name..."
  echo "==================================================================="
  
  npx hardhat run scripts/$script_name --network sonic
  
  if [ $? -eq 0 ]; then
    echo "✅ $contract_name deployed successfully!"
  else
    echo "❌ $contract_name deployment failed!"
    exit 1
  fi
  
  echo
}

# Step 1: Deploy the VRF Validator
deploy_contract "deploy-vrf-validator.js" "VRF Validator"

# Step 2: Deploy the Jackpot Vault
deploy_contract "deploy-jackpot-vault.js" "Dragon Jackpot Vault"

# Step 3: Deploy the Red Envelopes contract
deploy_contract "deploy-red-envelopes.js" "Red Envelopes"

# Step 4: Deploy the Delayed Entry Compensation contract
deploy_contract "deploy-compensation.js" "Delayed Entry Compensation"

# Step 5: Connect Compensation to Lottery Swap
deploy_contract "set-compensation-system.js" "Compensation System Integration"

echo "==================================================================="
echo "All missing contracts deployed successfully!"
echo "==================================================================="

# Print the final contract addresses
echo "Deployed contract addresses:"
cat deployments.json

# Update the export-contract-vars.sh file with the new addresses
echo "Updating environment variables file..."
node -e "
const fs = require('fs');
const deployments = JSON.parse(fs.readFileSync('deployments.json', 'utf8'));
const envVarsPath = 'deployment-files/export-contract-vars.sh';
const envVarsContent = fs.readFileSync(envVarsPath, 'utf8');

const updates = {
  'DRAGON_ADDRESS': deployments.dragon || '',
  'VRF_VALIDATOR_ADDRESS': deployments.vrfValidator || '',
  'LOTTERY_SWAP_ADDRESS': deployments.lotterySwap || '',
  'GOLD_SCRATCHER_ADDRESS': deployments.goldScratcher || '',
  'COMPENSATION_ADDRESS': deployments.compensation || '',
  'JACKPOT_VAULT_ADDRESS': deployments.jackpotVault || '',
  'RED_ENVELOPES_ADDRESS': deployments.redEnvelopes || '',
  'VE69LP_ADDRESS': deployments.ve69lp || '',
  'VE69LP_FEE_DISTRIBUTOR': deployments.ve69LPFeeDistributor || '',
  'PROMOTIONAL_ITEM_REGISTRY': deployments.promotionalItemRegistry || '',
  'MOCK_PAINTSWAP_VERIFIER': deployments.mockPaintSwapVerifier || ''
};

let newContent = envVarsContent;
for (const [key, value] of Object.entries(updates)) {
  if (value) {
    const regex = new RegExp(\`export \${key}=\\\"[^\\\"]*\\\"\`);
    newContent = newContent.replace(regex, \`export \${key}=\\\"\${value}\\\"\`);
  }
}

fs.writeFileSync(envVarsPath, newContent);
console.log('Environment variables updated successfully!');
"

# Update contract-addresses.json file
echo "Updating contract-addresses.json file..."
node -e "
const fs = require('fs');
const deployments = JSON.parse(fs.readFileSync('deployments.json', 'utf8'));
const contractAddressesPath = 'contract-addresses.json';
const contractAddresses = JSON.parse(fs.readFileSync(contractAddressesPath, 'utf8'));

// Update contract addresses
contractAddresses.vrf.validator = deployments.vrfValidator || '';
contractAddresses.whitelist.delayedEntryCompensation = deployments.compensation || '';
contractAddresses.utility.jackpotVault = deployments.jackpotVault || '';
contractAddresses.utility.redEnvelopes = deployments.redEnvelopes || '';

fs.writeFileSync(contractAddressesPath, JSON.stringify(contractAddresses, null, 2));
console.log('contract-addresses.json updated successfully!');
"

# Update the secret in Google Cloud Secret Manager
echo "Updating contract addresses in Google Cloud Secret Manager..."
gcloud secrets versions add dragon-contracts --data-file=contract-addresses.json

echo "==================================================================="
echo "Deployment process completed successfully!"
echo "===================================================================" 