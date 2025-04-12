// Deploy Extra Secure RedDragonVerifier (with EOA security checks)
const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying Extra Secure RedDragonVerifier with EOA security checks...");
  
  // Get contract addresses from config
  const configPath = require('path').resolve(__dirname, '../config/deployment-addresses-sonic.json');
  const config = require(configPath);
  
  // Deploy RedDragonVerifier
  const RedDragonVerifier = await ethers.getContractFactory("RedDragonVerifier");
  
  console.log("Using existing contract addresses:");
  console.log("  RedDragon Token:", config.redDragon);
  console.log("  RedDragonSwapLottery:", config.lottery);
  console.log("  LP Token:", config.lpToken);
  
  const verifier = await RedDragonVerifier.deploy(
    config.redDragon,
    config.lottery,
    ethers.ZeroAddress, // LP Burner address (not used anymore)
    config.lpToken
  );
  
  await verifier.waitForDeployment();
  
  const verifierAddress = await verifier.getAddress();
  console.log("Extra Secure RedDragonVerifier deployed to:", verifierAddress);
  
  // Save the new address in the config
  config.extraSecureRedDragonVerifier = verifierAddress;
  
  // Update the config file
  const fs = require('fs');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log("Configuration updated with new verifier address");
  
  console.log("\nTo update the lottery to use this new verifier, run:");
  console.log("npx hardhat run scripts/update-lottery-extra-secure-verifier.js --network sonic");
  
  console.log("\nTo verify the contract on SonicScan:");
  console.log(`npx hardhat verify --network sonic ${verifierAddress} ${config.redDragon} ${config.lottery} ${ethers.ZeroAddress} ${config.lpToken}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 