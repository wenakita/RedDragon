// Test script for SonicVRFConsumerRead
const { ethers } = require("hardhat");
require('dotenv').config({ path: "./deployment.env" });

async function main() {
  console.log("=".repeat(80));
  console.log("TESTING SONICVRFCONSUMERREAD CONTRACT");
  console.log("=".repeat(80));
  
  // Get the contract address from environment or deployment file
  const fs = require('fs');
  const path = require('path');
  
  const contractAddressesPath = path.join(__dirname, "../../../deployments/contract-addresses.json");
  let vrfConsumerReadAddress;
  
  try {
    if (fs.existsSync(contractAddressesPath)) {
      const contractAddresses = JSON.parse(fs.readFileSync(contractAddressesPath, 'utf8'));
      vrfConsumerReadAddress = contractAddresses.sonicVRFConsumerRead;
    }
  } catch (error) {
    console.log("Error reading contract addresses file:", error);
  }
  
  vrfConsumerReadAddress = vrfConsumerReadAddress || process.env.VRF_CONSUMER_READ;
  
  if (!vrfConsumerReadAddress) {
    console.error("Error: SonicVRFConsumerRead address not found");
    console.error("Please set VRF_CONSUMER_READ in deployment.env or deploy the contract first");
    process.exit(1);
  }
  
  // Get signer
  const [signer] = await ethers.getSigners();
  console.log(`Using signer: ${signer.address}`);
  console.log(`Testing contract at: ${vrfConsumerReadAddress}`);
  
  // Connect to the contract
  const vrfConsumerRead = await ethers.getContractAt("SonicVRFConsumerRead", vrfConsumerReadAddress, signer);
  
  // Get current configuration
  console.log("\n--- Current Configuration ---");
  const arbitrumChainId = await vrfConsumerRead.arbitrumChainId();
  const arbitrumVRFRequester = await vrfConsumerRead.arbitrumVRFRequester();
  const readChannel = await vrfConsumerRead.READ_CHANNEL();
  
  console.log(`Arbitrum Chain ID: ${arbitrumChainId}`);
  console.log(`Arbitrum VRF Requester: ${arbitrumVRFRequester}`);
  console.log(`Read Channel: ${readChannel}`);
  
  // Check current VRF state values
  console.log("\n--- Current VRF State Values ---");
  
  const subscriptionId = await vrfConsumerRead.lastQueriedSubscriptionId();
  const keyHash = await vrfConsumerRead.lastQueriedKeyHash();
  const confirmations = await vrfConsumerRead.lastQueriedConfirmations();
  const callbackGasLimit = await vrfConsumerRead.lastQueriedCallbackGasLimit();
  
  console.log(`Subscription ID: ${subscriptionId}`);
  console.log(`Key Hash: ${keyHash}`);
  console.log(`Confirmations: ${confirmations}`);
  console.log(`Callback Gas Limit: ${callbackGasLimit}`);
  
  // Check contract ETH balance for fees
  const balance = await ethers.provider.getBalance(vrfConsumerReadAddress);
  console.log(`\nContract ETH Balance: ${ethers.utils.formatEther(balance)} ETH`);
  
  // If balance is low, send ETH for fees
  if (balance.lt(ethers.utils.parseEther("0.01"))) {
    console.log("Contract balance is low, sending 0.05 ETH for fees...");
    
    const tx = await signer.sendTransaction({
      to: vrfConsumerReadAddress,
      value: ethers.utils.parseEther("0.05")
    });
    
    await tx.wait();
    console.log(`Transaction hash: ${tx.hash}`);
    
    const newBalance = await ethers.provider.getBalance(vrfConsumerReadAddress);
    console.log(`New contract balance: ${ethers.utils.formatEther(newBalance)} ETH`);
  }
  
  // Query Arbitrum VRF state
  console.log("\n--- Querying Arbitrum VRF State ---");
  console.log("Sending query transaction...");
  
  try {
    const tx = await vrfConsumerRead.queryArbitrumVRFState("0x", {
      value: ethers.utils.parseEther("0.01")
    });
    
    console.log(`Transaction hash: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    
    console.log("\nQuery sent successfully!");
    console.log("Note: It may take a few seconds to minutes for the response to be received.");
    console.log("Run this script again after a short wait to see the updated values.");
  } catch (error) {
    console.error("Error sending query:", error.message);
  }
  
  console.log("\n=".repeat(80));
  console.log("TEST COMPLETE - Check chain explorer for transaction status");
  console.log("=".repeat(80));
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 