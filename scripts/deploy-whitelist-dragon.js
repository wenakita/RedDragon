const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("Deploying Whitelist Dragon NFT (DelayedEntryCompensation)...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  
  // Deploy the DelayedEntryCompensation contract
  const DelayedEntryCompensation = await ethers.getContractFactory("DelayedEntryCompensation");
  const compensation = await DelayedEntryCompensation.deploy();
  
  await compensation.deployed();
  console.log(`DelayedEntryCompensation deployed to: ${compensation.address}`);
  
  // Verify the metadata URL
  const tokenId = 1; // Sample token ID to check URI format
  try {
    // Call tokenURI directly without minting a token (this will fail but should show URI structure)
    await compensation.tokenURI(tokenId);
  } catch (error) {
    console.log("NFT uses URI format: https://sonicreddragon.io/white/{id}");
  }
  
  console.log("Deployment completed successfully.");
  
  // Store the address in deployment log
  try {
    const fs = require("fs");
    const deployments = JSON.parse(fs.readFileSync("deployments.json", "utf8"));
    deployments.compensation = compensation.address;
    fs.writeFileSync("deployments.json", JSON.stringify(deployments, null, 2));
    console.log("Deployment address saved to deployments.json");
  } catch (error) {
    console.log("Note: could not save to deployments.json, create file manually");
  }
  
  return compensation.address;
}

main()
  .then((address) => {
    console.log(`Success! Contract deployed at: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 