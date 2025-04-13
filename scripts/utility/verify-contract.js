const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

async function verifyContract() {
  try {
    console.log('Loading flattened contract source...');
    const sourceCode = fs.readFileSync('./RedDragonPaintSwapVerifier.flat.sol', 'utf8');
    
    const apiKey = process.env.SONICSCAN_API_KEY;
    if (!apiKey) {
      console.error('SONICSCAN_API_KEY not found in .env file');
      process.exit(1);
    }
    
    console.log('Preparing verification data...');
    
    const apiUrl = 'https://api.sonicscan.org/api';
    const contractAddress = '0x171B882FBB125B14a09F9f9DA11CD1E7440A42ef';
    
    // Compiler settings used during deployment
    const verificationData = {
      apikey: apiKey,
      module: 'contract',
      action: 'verifysourcecode',
      contractaddress: contractAddress,
      sourceCode: sourceCode,
      codeformat: 'solidity-single-file',
      contractname: 'RedDragonPaintSwapVerifier',
      compilerversion: 'v0.8.20+commit.a1b79de6', // Use the exact compiler version
      optimizationUsed: 1,
      runs: 200,
      constructorArguments: '', // Empty for no constructor args
      evmversion: 'paris',
      licenseType: 3 // MIT License
    };
    
    console.log('Submitting verification request...');
    const response = await axios.post(apiUrl, verificationData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    console.log('Verification response:', response.data);
    
    if (response.data.status === '1') {
      console.log('Verification submitted successfully!');
      console.log('GUID:', response.data.result);
      console.log('Check verification status with this GUID');
    } else {
      console.error('Verification submission failed:', response.data.message);
    }
  } catch (error) {
    console.error('Error during verification:', error.message);
    if (error.response) {
      console.error('API response:', error.response.data);
    }
  }
}

verifyContract(); 