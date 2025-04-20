const express = require('express');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { ethers } = require('ethers');

const secretClient = new SecretManagerServiceClient();
const app = express();
const PORT = process.env.PORT || 8080;

// Function to get contract addresses from Secret Manager
async function getContractAddresses() {
  try {
    const name = `projects/${process.env.GOOGLE_CLOUD_PROJECT}/secrets/dragon-contracts/versions/latest`;
    const [version] = await secretClient.accessSecretVersion({ name });
    return JSON.parse(version.payload.data.toString());
  } catch (error) {
    console.error('Error accessing secret:', error);
    throw error;
  }
}

// Metadata endpoint for Whitelist Dragon NFTs
app.get('/white/:tokenId', async (req, res) => {
  try {
    const tokenId = req.params.tokenId;
    const addresses = await getContractAddresses();
    
    // Placeholder for actual contract interaction
    // In a real implementation, we would fetch token data from the blockchain
    
    const metadata = {
      name: `Whitelist Dragon #${tokenId}`,
      description: 'A Whitelist Dragon NFT from the Dragon ecosystem.',
      image: `https://storage.googleapis.com/dragon-nft-assets-${process.env.GOOGLE_CLOUD_PROJECT}/whitelist/${tokenId}.png`,
      attributes: [
        { trait_type: 'Token ID', value: tokenId },
        { trait_type: 'Type', value: 'Whitelist Dragon' }
      ]
    };
    
    res.status(200).json(metadata);
  } catch (error) {
    console.error(`Error serving metadata for token ${req.params.tokenId}:`, error);
    res.status(500).json({ error: 'Failed to retrieve token metadata' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`Metadata service listening on port ${PORT}`);
});
