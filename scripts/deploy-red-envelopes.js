const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("Deploying Red Envelopes contract...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  
  // Deploy the RedEnvelopes contract
  const RedEnvelopes = await ethers.getContractFactory("RedEnvelopes");
  
  // Get the Dragon token address from deployments or env
  let dragonTokenAddress;
  try {
    const fs = require("fs");
    const deployments = JSON.parse(fs.readFileSync("deployments.json", "utf8"));
    dragonTokenAddress = deployments.dragon;
  } catch (error) {
    // Fall back to environment variable
    dragonTokenAddress = process.env.DRAGON_TOKEN_ADDRESS;
  }
  
  if (!dragonTokenAddress) {
    throw new Error("Dragon token address not found. Please set DRAGON_TOKEN_ADDRESS in .env or add to deployments.json");
  }
  
  console.log(`Using Dragon token address: ${dragonTokenAddress}`);
  
  // Deploy with Dragon token address as parameter
  const redEnvelopes = await RedEnvelopes.deploy(dragonTokenAddress);
  
  await redEnvelopes.deployed();
  console.log(`RedEnvelopes deployed to: ${redEnvelopes.address}`);
  
  // Initialize with default settings
  console.log("Initializing Red Envelopes with default settings...");
  const minAmount = ethers.utils.parseEther("10"); // 10 Dragon tokens
  const maxClaimers = 100;
  const feePercentage = 1; // 1% fee
  
  const tx = await redEnvelopes.initialize(minAmount, maxClaimers, feePercentage);
  await tx.wait();
  console.log(`Initialization transaction hash: ${tx.hash}`);
  
  // Verify settings
  const settings = await redEnvelopes.getSettings();
  console.log("Red Envelopes settings:");
  console.log(` - Minimum amount: ${ethers.utils.formatEther(settings.minAmount)} DRAGON`);
  console.log(` - Maximum claimers: ${settings.maxClaimers}`);
  console.log(` - Fee percentage: ${settings.feePercentage}%`);
  
  // Store the address in deployment log
  try {
    const fs = require("fs");
    const deployments = JSON.parse(fs.readFileSync("deployments.json", "utf8"));
    deployments.redEnvelopes = redEnvelopes.address;
    fs.writeFileSync("deployments.json", JSON.stringify(deployments, null, 2));
    console.log("Deployment address saved to deployments.json");
  } catch (error) {
    console.log("Note: could not save to deployments.json, create file manually");
  }
  
  console.log("Deployment completed successfully.");
  return redEnvelopes.address;
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