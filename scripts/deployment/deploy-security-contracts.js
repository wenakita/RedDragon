// Deployment script for $DRAGON token security contracts
const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying $DRAGON token security contracts...");
  
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);

  // Get current deployed token contract address
  let redDragonTokenAddress;
  try {
    const deploymentAddresses = require("../deployment-addresses-sonic.json");
    redDragonTokenAddress = deploymentAddresses.RedDragon;
    console.log(`Using existing RedDragon token address: ${redDragonTokenAddress}`);
  } catch (error) {
    console.error("Warning: Could not find existing token address, please update manually");
    redDragonTokenAddress = "0x0000000000000000000000000000000000000000"; // Placeholder
  }

  // Deploy Timelock contract
  console.log("Deploying RedDragonTimelock...");
  const RedDragonTimelock = await ethers.getContractFactory("RedDragonTimelock");
  const timelock = await RedDragonTimelock.deploy();
  await timelock.deployed();
  console.log(`RedDragonTimelock deployed to: ${timelock.address}`);

  // Use existing MultiSig wallet as fee collector
  const existingMultiSigAddress = "0x7F9634C927890F8675b1CA7f35C485EAb772A113";
  console.log(`Using existing MultiSig wallet at: ${existingMultiSigAddress} (also as fee collector)`);

  // Deploy LP Burner contract with MultiSig as fee collector
  console.log("Deploying RedDragonLPBurner...");
  const RedDragonLPBurner = await ethers.getContractFactory("RedDragonLPBurner");
  const lpBurner = await RedDragonLPBurner.deploy(existingMultiSigAddress); // Set MultiSig as fee collector
  await lpBurner.deployed();
  console.log(`RedDragonLPBurner deployed to: ${lpBurner.address}`);

  // Placeholder for LP token address - update this after pair is created
  const lpTokenAddress = "0x0000000000000000000000000000000000000000"; // Placeholder

  // Deploy Verifier contract
  console.log("Deploying RedDragonVerifier...");
  const RedDragonVerifier = await ethers.getContractFactory("RedDragonVerifier");
  const verifier = await RedDragonVerifier.deploy(
    redDragonTokenAddress,
    "0x0000000000000000000000000000000000000000", // Placeholder for lottery address
    lpBurner.address,
    lpTokenAddress
  );
  await verifier.deployed();
  console.log(`RedDragonVerifier deployed to: ${verifier.address}`);

  // Beethoven X / Balancer addresses for Sonic network
  // Using actual addresses from Sonic network
  const balancerVaultAddress = "0xBA12222222228d8Ba445958a75a0704d566BF2C8"; // Vault V2
  const weightedPoolFactoryAddress = "0x22f5b7FDD99076f1f20f8118854ce3984544D56d"; // WeightedPoolFactory
  const pairedTokenAddress = "0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38"; // wSONC (Wrapped Sonic)

  // Deploy Balancer Integration contract
  console.log("Deploying RedDragonBalancerIntegration...");
  const RedDragonBalancerIntegration = await ethers.getContractFactory("RedDragonBalancerIntegration");
  const balancerIntegration = await RedDragonBalancerIntegration.deploy(
    balancerVaultAddress,
    weightedPoolFactoryAddress,
    redDragonTokenAddress,
    pairedTokenAddress,
    lpBurner.address
  );
  await balancerIntegration.deployed();
  console.log(`RedDragonBalancerIntegration deployed to: ${balancerIntegration.address}`);

  // Save deployment addresses
  const deploymentAddresses = {
    RedDragon: redDragonTokenAddress,
    RedDragonTimelock: timelock.address,
    RedDragonLPBurner: lpBurner.address,
    RedDragonVerifier: verifier.address,
    RedDragonMultiSig: existingMultiSigAddress,
    RedDragonBalancerIntegration: balancerIntegration.address,
    LPToken: lpTokenAddress,
    BalancerVault: balancerVaultAddress,
    WeightedPoolFactory: weightedPoolFactoryAddress,
    PairedToken: pairedTokenAddress
  };
  
  // Display deployment summary
  console.log("\n=== Deployment Summary ===");
  console.log(JSON.stringify(deploymentAddresses, null, 2));
  console.log("\n");

  console.log("Security contracts deployed successfully!");
  console.log("IMPORTANT NEXT STEPS:");
  console.log("1. Set a custom pool name using balancerIntegration.setPoolNameAndSymbol() if desired");
  console.log("2. Create an 80/20 Balancer/Beets pool using the RedDragonBalancerIntegration contract");
  console.log("3. Use splitAndBurnLPTokens to burn 20% of LP and allocate 80% for fee collection");
  console.log("4. Transfer token ownership to the MultiSig wallet or Timelock contract");
  console.log("5. Ensure your MultiSig wallet has appropriate owners and threshold set");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 