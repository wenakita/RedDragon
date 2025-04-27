// SPDX-License-Identifier: MIT
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n🐉 DEPLOYING SHADOW DEX ADAPTER 🐉\n");
  
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

  // Shadow DEX contract addresses from the provided list
  const SHADOW_ROUTER = "0x5543c6176feb9b4b179078205d7c29eea2e2d695"; // SwapRouter
  const SHADOW_QUOTER = "0x3003B4FeAFF95e09683FEB7fc5d11b330cd79Dc7"; // QuoterV1
  
  // Shadow tokens
  const SHADOW_TOKEN = "0x3333b97138D4b086720b5aE8A7844b1345a33333"; // Shadow Token
  const X_SHADOW_TOKEN = "0x5050bc082FF4A74Fb6B0B04385dEfdDB114b2424"; // xShadow Token
  
  // Get other required contract addresses from the config
  const x33Token = contractAddresses.dragon; // Dragon token (x33)
  const beetsLpToken = contractAddresses.lpToken; // BeetsLP token
  const wsToken = "0x6fa354d5aa8cba24622ab6ec0f23198a1263c147"; // Wrapped Sonic address
  const jackpot = contractAddresses.jackpot; // Jackpot address
  const ve69LP = contractAddresses.ve69LP; // ve69LP address
  
  console.log("Using the following addresses:");
  console.log(`Shadow Router: ${SHADOW_ROUTER}`);
  console.log(`Shadow Quoter: ${SHADOW_QUOTER}`);
  console.log(`Shadow Token: ${SHADOW_TOKEN}`);
  console.log(`xShadow Token: ${X_SHADOW_TOKEN}`);
  console.log(`x33Token (Dragon): ${x33Token}`);
  console.log(`BeetsLP Token: ${beetsLpToken}`);
  console.log(`Wrapped Sonic Token: ${wsToken}`);
  console.log(`Jackpot: ${jackpot}`);
  console.log(`ve69LP: ${ve69LP}`);
  
  // Verify all addresses are valid
  const addresses = [SHADOW_ROUTER, SHADOW_QUOTER, x33Token, beetsLpToken, wsToken, jackpot, ve69LP];
  for (const addr of addresses) {
    if (!addr || !ethers.utils.isAddress(addr)) {
      console.error(`Invalid address: ${addr}`);
      process.exit(1);
    }
  }
  
  // Deploy ShadowDEXAdapter
  console.log("\n=== DEPLOYING SHADOW DEX ADAPTER ===\n");
  
  const ShadowDEXAdapter = await hre.ethers.getContractFactory("ShadowDEXAdapter");
  
  // Use explicit transaction overrides with gas limit
  const deployTx = {
    gasLimit: 6000000, // Increased gas limit
    gasPrice: ethers.utils.parseUnits("150", "gwei") // 150 gwei
  };
  
  console.log("Deploying with transaction overrides:", deployTx);
  
  try {
    const adapter = await ShadowDEXAdapter.deploy(
      SHADOW_ROUTER,
      SHADOW_QUOTER,
      x33Token,
      beetsLpToken,
      wsToken,
      jackpot,
      ve69LP,
      deployTx
    );
    
    console.log("Deployment transaction sent, waiting for confirmation...");
    await adapter.deployed();
    
    console.log(`ShadowDEXAdapter deployed to: ${adapter.address}`);
    
    // Update address in config
    contractAddresses.shadowDEXAdapter = adapter.address;
    fs.writeFileSync(contractAddressesPath, JSON.stringify(contractAddresses, null, 2));
    
    // Set the price method (optional, depends on preferences)
    console.log("\n=== CONFIGURING SHADOW DEX ADAPTER ===\n");
    
    // Set to CONTRACT_RATIOS method (1)
    await adapter.setPriceMethod(1);
    console.log("Set price method to CONTRACT_RATIOS");
    
    // Verify contract on Etherscan
    console.log("\n=== VERIFYING SHADOW DEX ADAPTER ===\n");
    console.log("Waiting for 30 seconds before verification...");
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    try {
      await hre.run("verify:verify", {
        address: adapter.address,
        constructorArguments: [
          SHADOW_ROUTER,
          SHADOW_QUOTER,
          x33Token,
          beetsLpToken,
          wsToken,
          jackpot,
          ve69LP
        ]
      });
      console.log("ShadowDEXAdapter verified on Etherscan");
    } catch (error) {
      console.error("Error verifying ShadowDEXAdapter:", error.message);
    }
    
    console.log("\n🐉 DEPLOYMENT COMPLETED! 🐉");
    console.log(`ShadowDEXAdapter: ${adapter.address}`);
    console.log("\nYou can find all contract addresses in config/contract-addresses.json");
  } catch (error) {
    console.error("Error deploying ShadowDEXAdapter:");
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