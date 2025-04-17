#!/usr/bin/env node
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const RPC_URL = process.env.RPC_URL || 'https://rpc.soniclabs.com';
const CHAIN_ID = process.env.CHAIN_ID || 64165;

// ABI paths
const DELAYED_ENTRY_ABI_PATH = path.join(__dirname, '../artifacts/contracts/DelayedEntryCompensation.sol/DelayedEntryCompensation.json');
const WHITELIST_NFT_ABI_PATH = path.join(__dirname, '../artifacts/contracts/WhitelistDragon.sol/WhitelistDragon.json');

// Load ABIs
const delayedEntryAbi = JSON.parse(fs.readFileSync(DELAYED_ENTRY_ABI_PATH)).abi;
const whitelistNftAbi = JSON.parse(fs.readFileSync(WHITELIST_NFT_ABI_PATH)).abi;

// Get contract addresses from environment or config
const DELAYED_ENTRY_ADDRESS = process.env.DELAYED_ENTRY_ADDRESS;
const WHITELIST_NFT_ADDRESS = process.env.WHITELIST_NFT_ADDRESS;

async function main() {
  // Validate environment
  if (!DELAYED_ENTRY_ADDRESS) {
    console.error('Error: DELAYED_ENTRY_ADDRESS environment variable is required');
    process.exit(1);
  }

  if (!WHITELIST_NFT_ADDRESS) {
    console.error('Error: WHITELIST_NFT_ADDRESS environment variable is required');
    process.exit(1);
  }

  // Initialize provider
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL, CHAIN_ID);
  
  // Initialize contracts
  const delayedEntryContract = new ethers.Contract(DELAYED_ENTRY_ADDRESS, delayedEntryAbi, provider);
  const whitelistNftContract = new ethers.Contract(WHITELIST_NFT_ADDRESS, whitelistNftAbi, provider);

  // Get address to check from command line arguments or prompt user
  let addressToCheck = process.argv[2];
  
  if (!addressToCheck) {
    addressToCheck = await promptAddress();
  }

  try {
    // Validate address format
    addressToCheck = ethers.utils.getAddress(addressToCheck);
  } catch (error) {
    console.error(`Error: Invalid Ethereum address format: ${addressToCheck}`);
    process.exit(1);
  }

  console.log(`\nChecking whitelist status for: ${addressToCheck}\n`);

  try {
    // Check if address is whitelisted
    const isWhitelisted = await delayedEntryContract.isWhitelisted(addressToCheck);
    
    console.log(`Whitelist Status: ${isWhitelisted ? 'WHITELISTED ✅' : 'NOT WHITELISTED ❌'}`);
    
    if (isWhitelisted) {
      // Get whitelisted amount and swap details
      const whitelistedInfo = await delayedEntryContract.getWhitelistedInfo(addressToCheck);
      const formattedAmount = ethers.utils.formatEther(whitelistedInfo.amount);
      
      console.log(`Whitelisted Amount: ${formattedAmount} WSONIC`);
      console.log(`Whitelist Timestamp: ${new Date(whitelistedInfo.timestamp.toNumber() * 1000).toLocaleString()}`);
      
      // Check if user has associated NFT
      const nftBalance = await whitelistNftContract.balanceOf(addressToCheck);
      console.log(`\nAssociated NFTs: ${nftBalance.toString()}`);
      
      if (nftBalance.gt(0)) {
        // Get NFT token IDs owned by this address
        console.log('\nNFT Details:');
        for (let i = 0; i < nftBalance.toNumber(); i++) {
          const tokenId = await whitelistNftContract.tokenOfOwnerByIndex(addressToCheck, i);
          const tokenURI = await whitelistNftContract.tokenURI(tokenId);
          const mintTimestamp = await whitelistNftContract.mintTimestampOf(tokenId);
          const redeemed = await whitelistNftContract.isRedeemed(tokenId);

          console.log(`\nNFT #${tokenId.toString()}`);
          console.log(`  Token URI: ${tokenURI}`);
          console.log(`  Minted: ${new Date(mintTimestamp.toNumber() * 1000).toLocaleString()}`);
          console.log(`  Redemption Status: ${redeemed ? 'REDEEMED ✅' : 'NOT REDEEMED ❌'}`);
          
          // Try to get whitelist data from NFT
          try {
            const originalUser = await whitelistNftContract.originalUserOf(tokenId);
            const swapAmount = await whitelistNftContract.swapAmountOf(tokenId);
            const formattedSwapAmount = ethers.utils.formatEther(swapAmount);
            
            console.log(`  Original User: ${originalUser}`);
            console.log(`  Swap Amount: ${formattedSwapAmount} WSONIC`);
          } catch (error) {
            console.log(`  Error retrieving additional NFT data: ${error.message}`);
          }
        }
      } else {
        console.log('\nNo Dragon Whitelist NFTs found for this address.');
      }
      
      // Check redemption eligibility
      try {
        const canRedeem = await delayedEntryContract.canRedeem(addressToCheck);
        console.log(`\nRedemption Eligibility: ${canRedeem ? 'ELIGIBLE TO REDEEM ✅' : 'NOT ELIGIBLE TO REDEEM ❌'}`);
      } catch (error) {
        console.log(`\nError checking redemption eligibility: ${error.message}`);
      }
    } else {
      // Check if the address was ever whitelisted
      try {
        const historicalEvents = await delayedEntryContract.queryFilter(
          delayedEntryContract.filters.UserWhitelisted(addressToCheck)
        );
        
        if (historicalEvents.length > 0) {
          console.log('\nThis address was previously whitelisted but may have already redeemed.');
          
          // Check NFT history for this address
          const transferEvents = await whitelistNftContract.queryFilter(
            whitelistNftContract.filters.Transfer(null, addressToCheck)
          );
          
          if (transferEvents.length > 0) {
            console.log(`This address has received ${transferEvents.length} NFTs in the past.`);
            console.log('These NFTs may have been redeemed or transferred to another address.');
          }
        } else {
          console.log('\nThis address has never been whitelisted.');
        }
      } catch (error) {
        console.log(`\nError checking historical whitelist status: ${error.message}`);
      }
    }
  } catch (error) {
    console.error(`\nError checking whitelist status: ${error.message}`);
    process.exit(1);
  }
}

// Function to prompt user for address input
function promptAddress() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('Enter Ethereum address to check: ', (address) => {
      rl.close();
      resolve(address);
    });
  });
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`\nUnexpected error: ${error.message}`);
    process.exit(1);
  }); 