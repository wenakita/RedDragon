const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  // Get the envelope ID from command line arguments
  const args = process.argv.slice(2);
  const idFlag = args.findIndex(arg => arg === '--id');
  
  if (idFlag === -1 || !args[idFlag + 1]) {
    console.log("Usage: npx hardhat run scripts/check-red-envelope.js --network sonic --id ENVELOPE_ID");
    process.exit(1);
  }
  
  const envelopeId = args[idFlag + 1];
  console.log(`Checking Red Envelope with ID: ${envelopeId}`);
  
  // Get the Red Envelopes contract address
  let redEnvelopesAddress;
  
  try {
    // Try to load from deployments.json
    const fs = require("fs");
    const deployments = JSON.parse(fs.readFileSync("deployments.json", "utf8"));
    redEnvelopesAddress = deployments.redEnvelopes;
  } catch (error) {
    // Fall back to .env
    redEnvelopesAddress = process.env.RED_ENVELOPES_ADDRESS;
  }
  
  if (!redEnvelopesAddress) {
    throw new Error("RedEnvelopes address not found. Please set RED_ENVELOPES_ADDRESS in .env or add to deployments.json");
  }
  
  // Connect to the RedEnvelopes contract
  const RedEnvelopes = await ethers.getContractFactory("RedEnvelopes");
  const redEnvelopes = await RedEnvelopes.attach(redEnvelopesAddress);
  
  console.log(`Connected to Red Envelopes contract at: ${redEnvelopesAddress}`);
  
  // Get envelope details
  console.log("Fetching envelope details...");
  try {
    const envelope = await redEnvelopes.getEnvelope(envelopeId);
    
    // Format values
    const totalAmount = ethers.utils.formatEther(envelope.totalAmount);
    const amountPerClaimer = ethers.utils.formatEther(envelope.amountPerClaimer);
    const remainingAmount = ethers.utils.formatEther(envelope.remainingAmount);
    const creationTime = new Date(envelope.creationTime.toNumber() * 1000).toISOString();
    const expiryTime = new Date(envelope.expiryTime.toNumber() * 1000).toISOString();
    const isActive = envelope.isActive;
    const creatorAddress = envelope.creator;
    const maxClaimers = envelope.maxClaimers.toString();
    const claimedCount = envelope.claimedCount.toString();
    
    // Calculate status
    const now = Math.floor(Date.now() / 1000);
    const isExpired = envelope.expiryTime.toNumber() < now;
    const isFull = envelope.claimedCount.eq(envelope.maxClaimers);
    const hasRemaining = envelope.remainingAmount.gt(0);
    
    let status = "Unknown";
    if (!isActive) {
      status = "Inactive";
    } else if (isFull) {
      status = "Fully Claimed";
    } else if (isExpired) {
      status = "Expired";
    } else {
      status = "Active";
    }
    
    // Print envelope details
    console.log("\n========== RED ENVELOPE DETAILS ==========");
    console.log(`Envelope ID: ${envelopeId}`);
    console.log(`Status: ${status}`);
    console.log(`Creator: ${creatorAddress}`);
    console.log(`Total Amount: ${totalAmount} DRAGON`);
    console.log(`Amount Per Claimer: ${amountPerClaimer} DRAGON`);
    console.log(`Remaining Amount: ${remainingAmount} DRAGON`);
    console.log(`Max Claimers: ${maxClaimers}`);
    console.log(`Claimed Count: ${claimedCount}`);
    console.log(`Creation Time: ${creationTime}`);
    console.log(`Expiry Time: ${expiryTime}`);
    console.log("=========================================");
    
    // Get claimers if any
    if (envelope.claimedCount.gt(0)) {
      console.log("\nFetching claimers...");
      const claimers = await redEnvelopes.getEnvelopeClaimers(envelopeId);
      
      console.log("\n========== CLAIMERS ==========");
      for (let i = 0; i < claimers.length; i++) {
        const claimer = claimers[i];
        console.log(`${i+1}. ${claimer}`);
      }
      console.log("==============================");
    }
    
    // Print helpful actions
    console.log("\nPossible Actions:");
    if (status === "Active") {
      console.log("- Claim from envelope: Call redEnvelopes.claimFromEnvelope(envelopeId)");
    }
    if (status === "Expired" && hasRemaining) {
      console.log("- Reclaim remaining funds: Call redEnvelopes.reclaimExpiredEnvelope(envelopeId)");
    }
    if (!isFull && !isExpired && isActive) {
      console.log("- Share with friends: Anyone can claim until expiry or max claimers reached");
    }
  } catch (error) {
    console.error(`Error fetching envelope details: ${error.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 