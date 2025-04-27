// SPDX-License-Identifier: MIT
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n🐉 DEPLOYING PARTNER REGISTRY AND POOL VOTING 🐉\n");
  
  // Pool configuration - we'll use the same values from the original script
  const userPoolAddress = "0xeA2271DAD89385119A88Ce0BB957DEf053aE560A";
  const userPoolName = "Dragon LP Pool";
  const userPoolFeeShare = 100; // Fee share in basis points (1% = 100)
  
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
  let contractAddresses = {
    "dragon": "0x5a2e7C9f5164368B250Af2c2cdc4709c908fA686",
    "lpToken": "0xeA2271DAD89385119A88Ce0BB957DEf053aE560A",
    "ve69LP": "0x69fA10882A252A79eE57E2a246D552BA630fd955",
    "jackpot": "0x688D59e681BcC50bBA2B0FC6e98bB8bD93761074",
    "ve69lpBoost": "0x1008aDae0ef56415513f65ee5504A9c43399D866",
    "vrf": {
      "coordinator": "0x3Ba925fdeAe6B46d0BB4d424D829982Cb2F7309e"
    },
    "constants": {
      "chainId": 146,
      "rpcUrl": "https://rpc.soniclabs.com"
    },
    "dragonLotterySwap": "0xBb975623D78FA5092A7887A494c49a88e3021349",
    "ve69LPFeeDistributor": "0x028643A8B6bdE3B65f0B5b14b1058e0ff3Eac6cE"
  };
  
  if (fs.existsSync(contractAddressesPath)) {
    // Load existing addresses but don't overwrite the ones we have
    const existingAddresses = JSON.parse(fs.readFileSync(contractAddressesPath, "utf8"));
    contractAddresses = { ...existingAddresses, ...contractAddresses };
  }
  
  // Save updated addresses
  fs.writeFileSync(contractAddressesPath, JSON.stringify(contractAddresses, null, 2));

  // Step 1: Deploy DragonPartnerRegistry
  console.log("\n=== STEP 1: Deploy DragonPartnerRegistry ===\n");
  
  const DragonPartnerRegistry = await hre.ethers.getContractFactory("DragonPartnerRegistry");
  const partnerRegistry = await DragonPartnerRegistry.deploy();
  await partnerRegistry.deployed();
  
  console.log(`DragonPartnerRegistry deployed to: ${partnerRegistry.address}`);
  
  // Update address in config
  contractAddresses.partnerRegistry = partnerRegistry.address;
  fs.writeFileSync(contractAddressesPath, JSON.stringify(contractAddresses, null, 2));
  
  // Add user's pool to partner registry
  console.log(`\nAdding user pool ${userPoolAddress} to partner registry...`);
  
  await partnerRegistry.addPartner(userPoolAddress, userPoolName, userPoolFeeShare);
  console.log("Partner added successfully");
  
  // Step 2: Deploy ve69LPPoolVoting
  console.log("\n=== STEP 2: Deploy ve69LPPoolVoting ===\n");
  
  // Use the ve69LP address from the config
  const ve69LPAddress = contractAddresses.ve69LP;
  console.log(`Using ve69LP address: ${ve69LPAddress}`);
  
  // Deploy ve69LPPoolVoting
  const Ve69LPPoolVoting = await hre.ethers.getContractFactory("ve69LPPoolVoting");
  const poolVoting = await Ve69LPPoolVoting.deploy(ve69LPAddress, partnerRegistry.address);
  await poolVoting.deployed();
  
  console.log(`ve69LPPoolVoting deployed to: ${poolVoting.address}`);
  
  // Update address in config
  contractAddresses.ve69LPPoolVoting = poolVoting.address;
  fs.writeFileSync(contractAddressesPath, JSON.stringify(contractAddresses, null, 2));
  
  // Configure a minimum voting power
  const minVotingPower = ethers.utils.parseEther("0.1"); // 0.1 ve69LP
  await poolVoting.setMinVotingPower(minVotingPower);
  console.log("Minimum voting power set to 0.1 ve69LP");
  
  // Step 3: Deploy DragonPartnerRouter
  console.log("\n=== STEP 3: Deploy DragonPartnerRouter ===\n");
  
  const dragonAddress = contractAddresses.dragon;
  const jackpotAddress = contractAddresses.jackpot;
  const shadowSwapperAddress = contractAddresses.dragonLotterySwap;
  const beetsLpAddress = contractAddresses.lpToken;
  
  console.log(`Using Dragon (x33) address: ${dragonAddress}`);
  console.log(`Using Jackpot address: ${jackpotAddress}`);
  console.log(`Using Shadow Swapper address: ${shadowSwapperAddress}`);
  console.log(`Using BeetsLP address: ${beetsLpAddress}`);
  
  const DragonPartnerRouter = await hre.ethers.getContractFactory("DragonPartnerRouter");
  const partnerRouter = await DragonPartnerRouter.deploy(
    partnerRegistry.address,
    shadowSwapperAddress,
    jackpotAddress,
    beetsLpAddress,
    dragonAddress
  );
  await partnerRouter.deployed();
  
  console.log(`DragonPartnerRouter deployed to: ${partnerRouter.address}`);
  
  // Update address in config
  contractAddresses.partnerRouter = partnerRouter.address;
  fs.writeFileSync(contractAddressesPath, JSON.stringify(contractAddresses, null, 2));
  
  // Set the router as an authorized distributor in the registry
  await partnerRegistry.setDistributorAuthorization(partnerRouter.address, true);
  console.log(`Set ${partnerRouter.address} as authorized distributor in registry`);
  
  // Step 4: Verify contracts on Etherscan
  console.log("\n=== STEP 4: Verify Contracts ===\n");
  console.log("Waiting for 30 seconds before verification...");
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  try {
    await hre.run("verify:verify", {
      address: partnerRegistry.address,
      constructorArguments: []
    });
    console.log("DragonPartnerRegistry verified on Etherscan");
  } catch (error) {
    console.error("Error verifying DragonPartnerRegistry:", error.message);
  }
  
  try {
    await hre.run("verify:verify", {
      address: partnerRouter.address,
      constructorArguments: [
        partnerRegistry.address,
        shadowSwapperAddress,
        jackpotAddress,
        beetsLpAddress,
        dragonAddress
      ]
    });
    console.log("DragonPartnerRouter verified on Etherscan");
  } catch (error) {
    console.error("Error verifying DragonPartnerRouter:", error.message);
  }
  
  try {
    await hre.run("verify:verify", {
      address: poolVoting.address,
      constructorArguments: [ve69LPAddress, partnerRegistry.address]
    });
    console.log("ve69LPPoolVoting verified on Etherscan");
  } catch (error) {
    console.error("Error verifying ve69LPPoolVoting:", error.message);
  }
  
  console.log("\n🐉 DEPLOYMENT COMPLETED! 🐉");
  console.log(`DragonPartnerRegistry: ${partnerRegistry.address}`);
  console.log(`DragonPartnerRouter: ${partnerRouter.address}`);
  console.log(`ve69LPPoolVoting: ${poolVoting.address}`);
  console.log(`Pool added: ${userPoolAddress}`);
  console.log("\nYou can find all contract addresses in config/contract-addresses.json");
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 