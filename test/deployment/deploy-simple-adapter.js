// SPDX-License-Identifier: MIT
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n🐉 DEPLOYING SIMPLE SHADOW ADAPTER 🐉\n");
  
  // Get the contract factory and signers
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  
  // Setup config directory and paths
  const configDir = path.join(__dirname, "config");
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  const contractAddressesPath = path.join(configDir, "contract-addresses.json");
  
  // Initialize contract addresses with provided values
  let contractAddresses = {};
  if (fs.existsSync(contractAddressesPath)) {
    contractAddresses = JSON.parse(fs.readFileSync(contractAddressesPath, "utf8"));
  }
  
  // Get required contract addresses from the config
  const x33Token = contractAddresses.dragon; // Dragon token (x33)
  const beetsLpToken = contractAddresses.lpToken; // BeetsLP token
  const wsToken = "0x6fa354d5aa8cba24622ab6ec0f23198a1263c147"; // Wrapped Sonic address
  const jackpot = contractAddresses.jackpot; // Jackpot address
  const ve69LP = contractAddresses.ve69LP; // ve69LP address
  
  console.log("Using the following addresses:");
  console.log(`x33Token (Dragon): ${x33Token}`);
  console.log(`BeetsLP Token: ${beetsLpToken}`);
  console.log(`Wrapped Sonic Token: ${wsToken}`);
  console.log(`Jackpot: ${jackpot}`);
  console.log(`ve69LP: ${ve69LP}`);
  
  // Verify all addresses are valid
  const addresses = [x33Token, beetsLpToken, wsToken, jackpot, ve69LP];
  for (const addr of addresses) {
    if (!addr || !ethers.utils.isAddress(addr)) {
      console.error(`Invalid address: ${addr}`);
      process.exit(1);
    }
  }
  
  // Deploy SimpleShadowAdapter
  console.log("\n=== DEPLOYING SIMPLE SHADOW ADAPTER ===\n");
  
  const SimpleShadowAdapter = await hre.ethers.getContractFactory("SimpleShadowAdapter");
  
  // Use explicit transaction overrides with gas limit
  const deployTx = {
    gasLimit: 4000000, // Gas limit
    gasPrice: ethers.utils.parseUnits("150", "gwei") // 150 gwei
  };
  
  console.log("Deploying with transaction overrides:", deployTx);
  
  try {
    const adapter = await SimpleShadowAdapter.deploy(
      x33Token,
      beetsLpToken,
      wsToken,
      jackpot,
      ve69LP,
      deployTx
    );
    
    console.log("Deployment transaction sent, waiting for confirmation...");
    await adapter.deployed();
    
    console.log(`SimpleShadowAdapter deployed to: ${adapter.address}`);
    
    // Update address in config
    contractAddresses.simpleShadowAdapter = adapter.address;
    fs.writeFileSync(contractAddressesPath, JSON.stringify(contractAddresses, null, 2));
    
    // Verify contract on Etherscan
    console.log("\n=== VERIFYING SIMPLE SHADOW ADAPTER ===\n");
    console.log("Waiting for 30 seconds before verification...");
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    try {
      await hre.run("verify:verify", {
        address: adapter.address,
        constructorArguments: [
          x33Token,
          beetsLpToken,
          wsToken,
          jackpot,
          ve69LP
        ]
      });
      console.log("SimpleShadowAdapter verified on Etherscan");
    } catch (error) {
      console.error("Error verifying SimpleShadowAdapter:", error.message);
    }
    
    console.log("\n🐉 DEPLOYMENT COMPLETED! 🐉");
    console.log(`SimpleShadowAdapter: ${adapter.address}`);
    console.log("\nYou can find all contract addresses in config/contract-addresses.json");
  } catch (error) {
    console.error("Error deploying SimpleShadowAdapter:");
    console.error(error);
    process.exit(1);
  }
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 