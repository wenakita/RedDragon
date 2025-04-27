#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Configuration
const CONTRACT_ADDRESSES_FILE = path.join(__dirname, 'config', 'contract-addresses.json');
const GCP_CONTRACT_ADDRESSES_FILE = path.join(__dirname, 'gcp-contract-addresses.json');
const GCP_PROJECT = process.env.GCP_PROJECT || 'dragon-project';
const SERVICE_ACCOUNT = process.env.GCP_SERVICE_ACCOUNT;

// Utility functions
const log = {
  info: (msg) => console.log(`\x1b[34m[INFO]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
  error: (msg) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
  warning: (msg) => console.log(`\x1b[33m[WARNING]\x1b[0m ${msg}`),
};

async function run() {
  try {
    // Check if contract-addresses.json exists
    if (!fs.existsSync(CONTRACT_ADDRESSES_FILE)) {
      log.error('contract-addresses.json not found. Please run deployments first.');
      process.exit(1);
    }

    // Load contract addresses
    const contractAddresses = JSON.parse(fs.readFileSync(CONTRACT_ADDRESSES_FILE, 'utf8'));
    log.info('Loaded contract addresses from contract-addresses.json');

    // Update GCP contract addresses file
    try {
      let gcpContractAddresses = {};
      
      // If GCP file exists, load it to maintain structure
      if (fs.existsSync(GCP_CONTRACT_ADDRESSES_FILE)) {
        gcpContractAddresses = JSON.parse(fs.readFileSync(GCP_CONTRACT_ADDRESSES_FILE, 'utf8'));
      } else {
        // Create new structure if file doesn't exist
        gcpContractAddresses = {
          network: {
            rpcUrl: contractAddresses.constants?.rpcUrl || "https://rpc.soniclabs.com",
            chainId: contractAddresses.constants?.chainId || 146
          },
          contracts: {},
          services: {
            "dragon-api": true,
            "dragon-dashboard": true,
            "dragon-bot": true
          }
        };
      }

      // Update network information if exists in contract addresses
      if (contractAddresses.constants) {
        gcpContractAddresses.network = {
          rpcUrl: contractAddresses.constants.rpcUrl,
          chainId: contractAddresses.constants.chainId
        };
      }

      // Update all contract addresses
      for (const [key, value] of Object.entries(contractAddresses)) {
        if (key !== 'constants') {
          gcpContractAddresses.contracts[key] = value;
        }
      }

      // Write updated GCP contract addresses back to file
      fs.writeFileSync(GCP_CONTRACT_ADDRESSES_FILE, JSON.stringify(gcpContractAddresses, null, 2));
      log.success('Updated GCP contract addresses file');
    } catch (error) {
      log.error(`Failed to update GCP contract addresses file: ${error.message}`);
      process.exit(1);
    }

    // Check if gcloud CLI is installed
    try {
      await execAsync('gcloud --version');
      log.info('gcloud CLI found');
    } catch (error) {
      log.error('gcloud CLI not found. Please install Google Cloud SDK first.');
      process.exit(1);
    }

    // Authenticate with GCP if service account is provided
    if (SERVICE_ACCOUNT) {
      try {
        log.info(`Authenticating with service account: ${SERVICE_ACCOUNT}`);
        await execAsync(`gcloud auth activate-service-account ${SERVICE_ACCOUNT} --project=${GCP_PROJECT}`);
        log.success('Authentication successful');
      } catch (error) {
        log.error(`Authentication failed: ${error.message}`);
        process.exit(1);
      }
    } else {
      log.warning('No service account provided, assuming you are already authenticated');
    }

    // Update Secret Manager secrets with contract addresses
    log.info('Updating Secret Manager secrets with contract addresses...');
    
    const gcpContractAddresses = JSON.parse(fs.readFileSync(GCP_CONTRACT_ADDRESSES_FILE, 'utf8'));
    const allAddresses = {...gcpContractAddresses.contracts};
    
    // Add network info as additional secrets
    allAddresses.network_rpcUrl = gcpContractAddresses.network.rpcUrl;
    allAddresses.network_chainId = gcpContractAddresses.network.chainId;
    
    for (const [contractName, address] of Object.entries(allAddresses)) {
      const secretName = `CONTRACT_${contractName.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
      const secretValue = typeof address === 'object' ? JSON.stringify(address) : String(address);
      
      try {
        // Check if secret exists
        const { stdout } = await execAsync(
          `gcloud secrets describe ${secretName} --project=${GCP_PROJECT} 2>/dev/null || echo "Secret not found"`
        );
        
        if (stdout.includes('Secret not found')) {
          // Create new secret
          log.info(`Creating new secret: ${secretName}`);
          await execAsync(`echo -n "${secretValue}" | gcloud secrets create ${secretName} --data-file=- --project=${GCP_PROJECT}`);
        } else {
          // Update existing secret
          log.info(`Updating existing secret: ${secretName}`);
          await execAsync(`echo -n "${secretValue}" | gcloud secrets versions add ${secretName} --data-file=- --project=${GCP_PROJECT}`);
        }
        
        log.success(`Updated ${secretName} with value: ${secretValue}`);
      } catch (error) {
        log.error(`Failed to update secret ${secretName}: ${error.message}`);
      }
    }
    
    // Update environment variables in Cloud Run services
    const services = Object.keys(gcpContractAddresses.services).filter(
      service => gcpContractAddresses.services[service] === true
    );
    
    for (const service of services) {
      try {
        log.info(`Checking if Cloud Run service ${service} exists...`);
        const { stdout } = await execAsync(
          `gcloud run services describe ${service} --project=${GCP_PROJECT} --platform=managed 2>/dev/null || echo "Service not found"`
        );
        
        if (!stdout.includes('Service not found')) {
          // Generate environment variables string from contracts
          let envVarsArray = Object.entries(gcpContractAddresses.contracts).map(([key, value]) => {
            const formattedValue = typeof value === 'object' ? JSON.stringify(value) : value;
            return `CONTRACT_${key.toUpperCase().replace(/[^A-Z0-9]/g, '_')}=${formattedValue}`;
          });
          
          // Add network variables
          envVarsArray.push(`CONTRACT_NETWORK_RPCURL=${gcpContractAddresses.network.rpcUrl}`);
          envVarsArray.push(`CONTRACT_NETWORK_CHAINID=${gcpContractAddresses.network.chainId}`);
          
          const envVars = envVarsArray.join(',');
          
          // Update service environment variables
          log.info(`Updating environment variables for service: ${service}`);
          await execAsync(
            `gcloud run services update ${service} --update-env-vars=${envVars} --project=${GCP_PROJECT} --platform=managed`
          );
          
          log.success(`Updated environment variables for ${service}`);
        } else {
          log.warning(`Service ${service} not found, skipping`);
        }
      } catch (error) {
        log.error(`Failed to update service ${service}: ${error.message}`);
      }
    }
    
    log.success('GCP resources have been updated with the latest contract addresses');
    log.info('You may need to restart your services for changes to take effect');
    
  } catch (error) {
    log.error(`Script failed: ${error.message}`);
    process.exit(1);
  }
}

run(); 