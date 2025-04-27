const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("Deploying DelayedEntryCompensation contract...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  
  // Deploy the DelayedEntryCompensation contract
  const DelayedEntryCompensation = await ethers.getContractFactory("DelayedEntryCompensation");
  const compensation = await DelayedEntryCompensation.deploy();
  
  await compensation.deployed();
  console.log(`DelayedEntryCompensation deployed to: ${compensation.address}`);
  
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
  
  console.log("Deployment completed successfully.");
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