const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("Deploying Red Envelope contract...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  
  // Deploy the RedEnvelope contract
  const RedEnvelope = await ethers.getContractFactory("RedEnvelope");
  
  // Define NFT parameters
  const nftName = "Dragon Red Envelope";
  const nftSymbol = "DRAGRED";
  const baseTokenURI = `https://storage.googleapis.com/dragon-nft-assets-${process.env.PROJECT_ID || "dragon-ecosystem-202504172039"}/red-envelopes/`;
  
  console.log(`NFT Name: ${nftName}`);
  console.log(`NFT Symbol: ${nftSymbol}`);
  console.log(`Base Token URI: ${baseTokenURI}`);
  
  // Deploy with NFT parameters
  const redEnvelope = await RedEnvelope.deploy(nftName, nftSymbol, baseTokenURI);
  
  await redEnvelope.deployed();
  console.log(`RedEnvelope deployed to: ${redEnvelope.address}`);
  
  // Store the address in deployment log
  try {
    const fs = require("fs");
    const deployments = JSON.parse(fs.readFileSync("deployments.json", "utf8"));
    deployments.redEnvelopes = redEnvelope.address;
    fs.writeFileSync("deployments.json", JSON.stringify(deployments, null, 2));
    console.log("Deployment address saved to deployments.json");
  } catch (error) {
    console.log("Note: could not save to deployments.json, create file manually");
  }
  
  console.log("Deployment completed successfully.");
  return redEnvelope.address;
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