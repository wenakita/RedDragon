const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  // Get the address to check from command line arguments
  const args = process.argv.slice(2);
  const addressFlag = args.findIndex(arg => arg === '--address');
  
  if (addressFlag === -1 || !args[addressFlag + 1]) {
    console.log("Usage: npx hardhat run scripts/check-whitelist.js --network sonic --address USER_ADDRESS");
    process.exit(1);
  }
  
  const addressToCheck = args[addressFlag + 1];
  console.log(`Checking whitelist status for address: ${addressToCheck}`);
  
  // Get the compensation contract address
  let compensationAddress;
  
  try {
    // Try to load from deployments.json
    const fs = require("fs");
    const deployments = JSON.parse(fs.readFileSync("deployments.json", "utf8"));
    compensationAddress = deployments.compensation;
  } catch (error) {
    // Fall back to .env
    compensationAddress = process.env.COMPENSATION_ADDRESS;
  }
  
  if (!compensationAddress) {
    throw new Error("DelayedEntryCompensation address not found. Please set COMPENSATION_ADDRESS in .env or add to deployments.json");
  }
  
  // Connect to the DelayedEntryCompensation contract
  const DelayedEntryCompensation = await ethers.getContractFactory("DelayedEntryCompensation");
  const compensation = await DelayedEntryCompensation.attach(compensationAddress);
  
  // Get whitelist status
  console.log("Querying whitelist status...");
  const [isWhitelisted, amount] = await compensation.checkWhitelist(addressToCheck);
  
  console.log("========== WHITELIST STATUS ==========");
  console.log(`Address: ${addressToCheck}`);
  console.log(`Whitelisted: ${isWhitelisted ? 'YES' : 'NO'}`);
  console.log(`Total Amount: ${ethers.utils.formatEther(amount)} WSONIC`);
  console.log("======================================");
  
  // Get NFT balances and details
  const nftBalance = await compensation.balanceOf(addressToCheck);
  console.log(`\nNFT Balance: ${nftBalance.toString()} Whitelist Dragon(s)`);
  
  if (nftBalance.gt(0)) {
    console.log("\n========== OWNED NFTs ==========");
    
    // Get all NFTs and their details
    for (let i = 0; i < nftBalance; i++) {
      const tokenId = await compensation.tokenOfOwnerByIndex(addressToCheck, i);
      const entryIndex = tokenId.sub(1); // Token IDs start at 1, entry indices at 0
      
      try {
        const details = await compensation.getEntryDetails(entryIndex);
        const isRedeemed = await compensation.redemptionStatus(tokenId);
        
        console.log(`\nToken ID: ${tokenId}`);
        console.log(`Original User: ${details.user}`);
        console.log(`Swap Amount: ${ethers.utils.formatEther(details.swapAmount)} WSONIC`);
        console.log(`Timestamp: ${new Date(details.timestamp.toNumber() * 1000).toISOString()}`);
        console.log(`Redeemed: ${isRedeemed ? 'YES' : 'NO'}`);
        console.log(`Metadata URI: ${await compensation.tokenURI(tokenId)}`);
      } catch (error) {
        console.log(`Error getting details for token ${tokenId}: ${error.message}`);
      }
    }
    console.log("===============================");
  }
  
  // Get user entries
  try {
    const entries = await compensation.getUserEntries(addressToCheck);
    
    if (entries.length > 0) {
      console.log("\n========== ORIGINAL ENTRIES ==========");
      console.log(`This address has ${entries.length} original entries`);
      
      for (let i = 0; i < entries.length; i++) {
        const entryIndex = entries[i];
        const details = await compensation.getEntryDetails(entryIndex);
        const tokenId = entryIndex.add(1); // Token IDs are entry index + 1
        
        console.log(`\nEntry Index: ${entryIndex}`);
        console.log(`Token ID: ${tokenId}`);
        console.log(`Current Owner: ${await compensation.ownerOf(tokenId)}`);
        console.log(`Swap Amount: ${ethers.utils.formatEther(details.swapAmount)} WSONIC`);
        console.log(`Timestamp: ${new Date(details.timestamp.toNumber() * 1000).toISOString()}`);
        console.log(`Redeemed: ${details.redeemed ? 'YES' : 'NO'}`);
      }
      console.log("=====================================");
    }
  } catch (error) {
    console.log(`Error getting user entries: ${error.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 