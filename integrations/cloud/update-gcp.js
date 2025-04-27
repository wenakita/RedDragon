#!/usr/bin/env node
/**
 * Dragon Project - GCP Update Helper
 * This script simplifies the process of updating Google Cloud Platform resources
 * with contract addresses and other configuration.
 */

require('dotenv').config();
const { execSync } = require('child_process');

// Configuration
const UPDATE_GCP_CONTRACTS_SCRIPT = './deployment/update-gcp-contracts.js';

// Color formatting for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

// Helper functions
function printHeader(text) {
  const line = '='.repeat(text.length + 4);
  console.log(`\n${colors.cyan}${line}`);
  console.log(`  ${text}  `);
  console.log(`${line}${colors.reset}\n`);
}

function printStep(step) {
  console.log(`${colors.blue}[STEP]${colors.reset} ${step}`);
}

function printSuccess(message) {
  console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`);
}

function printInfo(message) {
  console.log(`${colors.cyan}[INFO]${colors.reset} ${message}`);
}

function executeCommand(command) {
  try {
    printInfo(`Executing: ${command}`);
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    return output.trim();
  } catch (error) {
    console.error(`${colors.red}[ERROR]${colors.reset} Command failed: ${command}`);
    console.error(`${colors.red}${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Main function
function main() {
  printHeader('Dragon Project - GCP Update');
  
  // Check environment
  printStep('Checking environment...');
  const nodeVersion = process.version;
  printInfo(`Node.js version: ${nodeVersion}`);
  
  // Display project info
  const gcpProject = process.env.GCP_PROJECT || 'dragon-project';
  printInfo(`GCP Project: ${gcpProject}`);
  
  // Verify credentials
  printStep('Verifying GCP credentials...');
  try {
    const account = executeCommand('gcloud auth list --filter=status:ACTIVE --format="value(account)"');
    printSuccess(`Authenticated as: ${account}`);
  } catch (error) {
    printInfo('No active GCP account found. Please authenticate first:');
    printInfo('  gcloud auth login');
    process.exit(1);
  }
  
  // Update contracts
  printStep('Updating contract addresses in GCP...');
  executeCommand(`node ${UPDATE_GCP_CONTRACTS_SCRIPT}`);
  
  // Success message
  printHeader('GCP Update Completed Successfully');
  printInfo('Your Google Cloud Platform resources have been updated with the latest contract addresses.');
  printInfo('Services may need to be restarted for changes to take effect.');
}

// Execute
main(); 