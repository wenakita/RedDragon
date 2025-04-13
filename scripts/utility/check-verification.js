const axios = require('axios');
require('dotenv').config();

async function checkVerificationStatus() {
  try {
    const apiKey = process.env.SONICSCAN_API_KEY;
    if (!apiKey) {
      console.error('SONICSCAN_API_KEY not found in .env file');
      process.exit(1);
    }
    
    const apiUrl = 'https://api.sonicscan.org/api';
    const guid = '53aibgbmekkwfirkcxwlsf8h1ziuuhy2lgkjznjf6qujrdmbhb'; // GUID from verification response
    
    const params = {
      apikey: apiKey,
      module: 'contract',
      action: 'checkverifystatus',
      guid: guid
    };
    
    console.log('Checking verification status for GUID:', guid);
    const response = await axios.get(apiUrl, { params });
    
    console.log('Status response:', response.data);
    
    if (response.data.status === '1') {
      console.log('✅ Contract verification successful!');
      console.log('Contract source code is now published on SonicScan');
    } else {
      console.log('⚠️ Verification not yet complete or failed');
      console.log('Message:', response.data.result);
    }
  } catch (error) {
    console.error('Error checking verification status:', error.message);
    if (error.response) {
      console.error('API response:', error.response.data);
    }
  }
}

checkVerificationStatus(); 