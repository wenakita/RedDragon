const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("Deploying DragonJackpotVault contract...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  
  // Get the Wrapped Sonic address from .env file
  const wrappedSonicAddress = process.env.WRAPPED_SONIC_ADDRESS;
  if (!wrappedSonicAddress) {
    throw new Error("Wrapped Sonic address not found. Please set WRAPPED_SONIC_ADDRESS in .env file");
  }
  
  console.log(`Using Wrapped Sonic address: ${wrappedSonicAddress}`);
  console.log(`Using owner address: ${deployer.address}`);
  
  // Deploy the DragonJackpotVault contract
  const DragonJackpotVault = await ethers.getContractFactory("DragonJackpotVault");
  const jackpotVault = await DragonJackpotVault.deploy(wrappedSonicAddress, deployer.address);
  
  await jackpotVault.deployed();
  console.log(`DragonJackpotVault deployed to: ${jackpotVault.address}`);
  
  // Set the Dragon token address
  const dragonTokenAddress = process.env.DRAGON_ADDRESS || "0x10eeEA6C868Ef069e3571933ea6AF2b91922b637";
  if (dragonTokenAddress) {
    console.log(`Setting Dragon token address: ${dragonTokenAddress}`);
    const tx = await jackpotVault.setTokenAddress(dragonTokenAddress);
    await tx.wait();
    console.log(`Transaction hash: ${tx.hash}`);
  }
  
  // Store the address in deployment log
  try {
    const fs = require("fs");
    const deployments = JSON.parse(fs.readFileSync("deployments.json", "utf8"));
    deployments.jackpotVault = jackpotVault.address;
    fs.writeFileSync("deployments.json", JSON.stringify(deployments, null, 2));
    console.log("Deployment address saved to deployments.json");
  } catch (error) {
    console.log("Note: could not save to deployments.json, create file manually");
  }
  
  console.log("Deployment completed successfully.");
  return jackpotVault.address;
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