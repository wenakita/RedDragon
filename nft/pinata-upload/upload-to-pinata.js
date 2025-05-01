// Usage: node upload-to-pinata.js /path/to/image.png
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

// TODO: Replace with your Pinata JWT or API Key/Secret
const PINATA_JWT = process.env.PINATA_JWT || '';
const PINATA_API_KEY = process.env.PINATA_API_KEY || '';
const PINATA_API_SECRET = process.env.PINATA_API_SECRET || '';

async function uploadToPinata(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    process.exit(1);
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
    console.error('Provide either PINATA_JWT or both PINATA_API_KEY and PINATA_API_SECRET as environment variables.');
    process.exit(1);
  }

  try {
    const res = await axios.post(url, data, { headers });
    const cid = res.data.IpfsHash;
    console.log('Upload successful!');
    console.log('IPFS CID:', cid);
    console.log('Gateway URL: https://gateway.pinata.cloud/ipfs/' + cid);
    console.log('Public IPFS URL: https://ipfs.io/ipfs/' + cid);
  } catch (err) {
    console.error('Upload failed:', err.response ? err.response.data : err.message);
  }
}

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node upload-to-pinata.js /path/to/image.png');
  process.exit(1);
}
uploadToPinata(filePath);
