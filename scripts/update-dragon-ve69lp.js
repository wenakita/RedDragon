const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("Updating Dragon Token with new ve69LP address...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Executing with account: ${deployer.address}`);
  
  // Get Dragon token address from deployments.json
  let dragonAddress;
  try {
    const fs = require("fs");
    const deployments = JSON.parse(fs.readFileSync("deployments.json", "utf8"));
    dragonAddress = deployments.dragon;
    
    if (!dragonAddress) {
      throw new Error("Dragon address not found in deployments.json");
    }
  } catch (error) {
    console.error("Error reading deployments.json:", error.message);
    process.exit(1);
  }
  
  // Get ve69LP address from command line argument
  let ve69LPAddress;
  const args = process.argv.slice(2);
  if (args.length > 0 && args[0].startsWith("0x")) {
    ve69LPAddress = args[0];
  }
  
  if (!ve69LPAddress || !ethers.utils.isAddress(ve69LPAddress)) {
    console.error("Error: Valid ve69LP address not provided!");
    console.error("Usage: npx hardhat run scripts/update-dragon-ve69lp.js --network sonic 0xNewVe69LPAddress");
    process.exit(1);
  }
  
  console.log(`Dragon address: ${dragonAddress}`);
  console.log(`New ve69LP address: ${ve69LPAddress}`);
  
  // Connect to Dragon contract
  const Dragon = await ethers.getContractFactory("Dragon");
  const dragon = Dragon.attach(dragonAddress);
  
  // Get current ve69LP address
  const currentVe69LPAddress = await dragon.ve69LPAddress();
  console.log(`Current ve69LP address: ${currentVe69LPAddress}`);
  
  // Update Dragon with new ve69LP address
  console.log("Updating Dragon with new ve69LP address...");
  const tx = await dragon.setVe69LPAddress(ve69LPAddress);
  
  // Wait for transaction to be mined
  console.log(`Transaction sent: ${tx.hash}`);
  await tx.wait();
  
  // Verify the update
  const newVe69LPAddress = await dragon.ve69LPAddress();
  console.log(`Updated ve69LP address: ${newVe69LPAddress}`);
  
  if (newVe69LPAddress === ve69LPAddress) {
    console.log("✅ Dragon token successfully updated with new ve69LP address!");
  } else {
    console.error("❌ Failed to update Dragon token with new ve69LP address!");
  }
  
  // Update contract-addresses.json if it exists
  try {
    const fs = require("fs");
    if (fs.existsSync("contract-addresses.json")) {
      const contractAddresses = JSON.parse(fs.readFileSync("contract-addresses.json", "utf8"));
      
      // Update ve69LP address
      if (contractAddresses.tokens && contractAddresses.tokens.ve69LP) {
        contractAddresses.tokens.ve69LP = ve69LPAddress;
        fs.writeFileSync("contract-addresses.json", JSON.stringify(contractAddresses, null, 2));
        console.log("Updated ve69LP address in contract-addresses.json");
      }
    }
  } catch (error) {
    console.error("Warning: Could not update contract-addresses.json:", error.message);
  }
  
  return ve69LPAddress;
}

main()
  .then((address) => {
    console.log(`Success! Dragon now using ve69LP at: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 