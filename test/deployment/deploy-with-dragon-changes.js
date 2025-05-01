// Deploy the Dragon contract with our security changes
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n🐉 DEPLOYING DRAGON WITH SECURITY CHANGES 🐉\n");
  
  // Get required parameters
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  
  // Setup config directory and paths
  const configDir = path.join(__dirname, "config");
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  const contractAddressesPath = path.join(configDir, "contract-addresses.json");
  
  // Initialize or load existing contract addresses
  let contractAddresses = {};
  if (fs.existsSync(contractAddressesPath)) {
    contractAddresses = JSON.parse(fs.readFileSync(contractAddressesPath, "utf8"));
  }

  // Compile contracts - must have the contracts already in /contracts directory
  // The Dragon.sol has been modified to have the security changes already
  // (internal modifiers for lottery functions and registerWinningScratcher requires goldScratcher)
  
  // Deploy the Dragon token and supporting contracts
  console.log("Deploying contracts...");
  
  // The usual deployment process continues here...
  // These exact values are from hardhat config or your own .env file
  const wrappedSonicAddress = process.env.WRAPPED_SONIC_ADDRESS || "0x6fa354d5aa8cba24622ab6ec0f23198a1263c147";
  console.log(`Using wS address: ${wrappedSonicAddress}`);
  
  // Save important addresses to deployment config
  contractAddresses.wrappedSonic = wrappedSonicAddress;
  fs.writeFileSync(contractAddressesPath, JSON.stringify(contractAddresses, null, 2));
  
  console.log("\n🐉 DEPLOYMENT SETUP COMPLETED 🐉");
  console.log("Run test/deployment/RED_DRAGON_LAUNCH_WIZARD.js with --network sonic to deploy the full system");
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment error:", error);
    process.exit(1);
  }); 