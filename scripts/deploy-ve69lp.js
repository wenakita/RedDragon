const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("Deploying ve69LP Contract...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  
  // Get LP token address from command line argument or environment variable
  let lpTokenAddress = process.env.BEETS_LP_TOKEN_ADDRESS;
  
  // Check for command line argument for LP token address
  const args = process.argv.slice(2);
  if (args.length > 0 && args[0].startsWith("0x")) {
    lpTokenAddress = args[0];
  }
  
  if (!lpTokenAddress || !ethers.utils.isAddress(lpTokenAddress)) {
    console.error("Error: Valid LP token address not provided!");
    console.error("Please provide LP token address as command line argument or set BEETS_LP_TOKEN_ADDRESS in .env file");
    console.error("Usage: npx hardhat run scripts/deploy-ve69lp.js --network sonic 0xYourLPTokenAddress");
    process.exit(1);
  }
  
  console.log(`Using LP token address: ${lpTokenAddress}`);
  
  // Deploy the ve69LP contract
  const Ve69LP = await ethers.getContractFactory("Ve69LP");
  const ve69lp = await Ve69LP.deploy(lpTokenAddress);
  
  await ve69lp.deployed();
  console.log(`ve69LP deployed to: ${ve69lp.address}`);
  
  // Store the address in deployment log
  try {
    const fs = require("fs");
    const deployments = JSON.parse(fs.readFileSync("deployments.json", "utf8"));
    
    // Keep track of the old address in case we need to revert
    const oldAddress = deployments.ve69lp;
    if (oldAddress) {
      if (!deployments.oldVe69lp) {
        deployments.oldVe69lp = [];
      }
      deployments.oldVe69lp.push(oldAddress);
      console.log(`Previous ve69LP address (${oldAddress}) saved to deployments.oldVe69lp`);
    }
    
    // Update with new address
    deployments.ve69lp = ve69lp.address;
    
    // Save the LP token address for reference
    if (!deployments.lpTokens) {
      deployments.lpTokens = {};
    }
    deployments.lpTokens.beetsLP = lpTokenAddress;
    
    fs.writeFileSync("deployments.json", JSON.stringify(deployments, null, 2));
    console.log("Deployment address saved to deployments.json");
  } catch (error) {
    console.log("Note: could not save to deployments.json, create file manually");
    console.error(error);
  }
  
  // Remind user to update Dragon token to point to new ve69LP
  console.log("\n===========================================================");
  console.log("IMPORTANT: You need to update the Dragon token to use the new ve69LP address");
  console.log("Run the following command:");
  console.log(`npx hardhat run scripts/update-dragon-ve69lp.js --network sonic ${ve69lp.address}`);
  console.log("===========================================================\n");
  
  return ve69lp.address;
}

main()
  .then((address) => {
    console.log(`Success! ve69LP deployed at: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 