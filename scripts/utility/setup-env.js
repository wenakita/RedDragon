// SCRIPT: setup-env.js
// PURPOSE: Set up the .env file with values needed for balance checks
// USAGE: node scripts/utility/setup-env.js

const fs = require('fs');
const readline = require('readline');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Default RPC URL for Sonic network
const DEFAULT_RPC_URL = 'https://rpc.sonic.fantom.network/';

// Function to prompt for input with a default value
function prompt(question, defaultValue) {
  return new Promise((resolve) => {
    rl.question(`${question} (default: ${defaultValue}): `, (answer) => {
      resolve(answer || defaultValue);
    });
  });
}

// Main function
async function main() {
  console.log('🔧 Setting up environment for balance checker');
  console.log('============================================');
  
  // Get the current directory
  const currentDir = process.cwd();
  const envPath = path.join(currentDir, '.env');
  
  // Check if .env file already exists
  let envVars = {};
  if (fs.existsSync(envPath)) {
    console.log('📄 Found existing .env file, will update it');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // Parse existing env vars
    envContent.split('\n').forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        const [key, value] = line.split('=');
        if (key && value) {
          envVars[key.trim()] = value.trim();
        }
      }
    });
  } else {
    console.log('📄 Creating new .env file');
  }
  
  // Ask for RPC URL
  const rpcUrl = await prompt('Enter the Sonic RPC URL', 
    envVars.SONIC_RPC_URL || DEFAULT_RPC_URL);
  
  // Ask for private key
  const privateKey = await prompt('Enter your private key (will be stored in .env file)',
    envVars.PRIVATE_KEY || '');
  
  if (!privateKey) {
    console.error('❌ No private key provided. Cannot proceed.');
    rl.close();
    return;
  }
  
  // Update env vars
  envVars.SONIC_RPC_URL = rpcUrl;
  envVars.PRIVATE_KEY = privateKey;
  
  // Write to .env file
  let envContent = '';
  Object.entries(envVars).forEach(([key, value]) => {
    envContent += `${key}=${value}\n`;
  });
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file updated with required variables');
  
  console.log('\n🔍 To check your token balances, run:');
  console.log('node scripts/utility/check-balance.js');
  
  rl.close();
}

// Run the script
main().catch(error => {
  console.error('Error:', error);
  rl.close();
}); 