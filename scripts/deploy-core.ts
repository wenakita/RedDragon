import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("\n🐉 DEPLOYING CORE DRAGON CONTRACTS 🐉\n");
  
  // Get the signer
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  console.log(`Account balance: ${ethers.utils.formatEther(await deployer.getBalance())} ETH`);
  
  // Setup config directory and paths
  const configDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  const contractAddressesPath = path.join(configDir, "contract-addresses.json");
  
  // Initialize contract addresses or load existing
  let contractAddresses: Record<string, string> = {};
  if (fs.existsSync(contractAddressesPath)) {
    contractAddresses = JSON.parse(fs.readFileSync(contractAddressesPath, "utf8"));
  }

  // Get Wrapped Sonic address from environment variables
  const wrappedSonicAddress = process.env.WRAPPED_SONIC_ADDRESS;
  if (!wrappedSonicAddress) {
    throw new Error("WRAPPED_SONIC_ADDRESS not set in environment variables");
  }
  console.log(`Using Wrapped Sonic address: ${wrappedSonicAddress}`);
  
  console.log("\n✅ TYPESCRIPT DEPLOYMENT SETUP READY! ✅");
  console.log(`\nWhen ready to deploy the full ecosystem:`);
  console.log(`1. Restore all original contract files`);
  console.log(`2. Fix any dependency issues`);
  console.log(`3. Run this script on the Sonic network`);
  console.log(`\nCommand: npx hardhat run scripts/deploy-dragon.ts --network sonic`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 