const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

// Pinata credentials from environment variables
const PINATA_JWT = process.env.PINATA_JWT || '';
const PINATA_API_KEY = process.env.PINATA_API_KEY || '';
const PINATA_API_SECRET = process.env.PINATA_API_SECRET || '';

async function uploadToPinata(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error('File not found: ' + filePath);
  }
  const data = new FormData();
  data.append('file', fs.createReadStream(filePath));

  const url = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
  const headers = data.getHeaders();
  if (PINATA_JWT) {
    headers['Authorization'] = `Bearer ${PINATA_JWT}`;
  } else if (PINATA_API_KEY && PINATA_API_SECRET) {
    headers['pinata_api_key'] = PINATA_API_KEY;
    headers['pinata_secret_api_key'] = PINATA_API_SECRET;
  } else {
    throw new Error('Provide either PINATA_JWT or both PINATA_API_KEY and PINATA_API_SECRET as environment variables.');
  }

  try {
    const res = await axios.post(url, data, { headers });
    const cid = res.data.IpfsHash;
    return {
      cid,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
      publicUrl: `https://ipfs.io/ipfs/${cid}`
    };
  } catch (err) {
    throw new Error('Upload failed: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
  }
}

module.exports = { uploadToPinata };
