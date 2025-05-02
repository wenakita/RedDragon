// Script to fund VRF contracts with native tokens for cross-chain fees
const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: "./deployment.env" });

/**
 * @notice Fund VRF contracts with native tokens for cross-chain fees
 * This script sends native tokens to the ArbitrumVRFRequester and SonicVRFConsumer
 * contracts to cover the cost of cross-chain messages
 */
async function main() {
  console.log("\n=================================================");
  console.log("      🐉 FUNDING SONIC VRF CONTRACTS 🐉");
  console.log("=================================================");
  console.log("Providing native tokens for cross-chain messaging");
  console.log("=================================================\n");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Funding from account: ${deployer.address}`);
  console.log(`Account balance: ${ethers.utils.formatEther(await deployer.getBalance())} ETH\n`);

  // Get network name
  const network = hre.network.name;
  console.log(`Network: ${network}`);

  // Set default fund amounts (in native token units)
  const defaultAmounts = {
    arbitrum: "0.5", // 0.5 ETH for Arbitrum contract
    sonic: "10"      // 10 SONIC for Sonic contract
  };

  // Set current network type
  let currentNetwork = "unknown";
  if (network.includes("arbitrum")) {
    currentNetwork = "arbitrum";
  } else if (network.includes("sonic")) {
    currentNetwork = "sonic";
  } else {
    console.log("⚠️ Unknown network. Please specify whether this is Arbitrum or Sonic.");
    process.exit(1);
  }

  // Load deployed contract addresses
  const deployedAddresses = loadDeployedAddresses(network);
  if (!deployedAddresses) {
    console.error("❌ Could not load deployed contract addresses. Please run deploy-vrf-basic.js first.");
    process.exit(1);
  }

  // Parse command line arguments for amount
  let fundAmount = defaultAmounts[currentNetwork];
  if (process.argv.length > 2) {
    fundAmount = process.argv[2];
  }

  // Convert to wei/smallest unit
  const amountToSend = ethers.utils.parseEther(fundAmount);
  
  try {
    // Select the contract to fund based on the current network
    let contractAddress;
    if (currentNetwork === "arbitrum") {
      contractAddress = deployedAddresses.arbitrumVRFRequester;
      console.log(`🎯 Funding ArbitrumVRFRequester at ${contractAddress} with ${fundAmount} ETH`);
    } else {
      contractAddress = deployedAddresses.sonicVRFConsumer;
      console.log(`🎯 Funding SonicVRFConsumer at ${contractAddress} with ${fundAmount} SONIC`);
    }

    // Send native tokens to the contract
    const tx = await deployer.sendTransaction({
      to: contractAddress,
      value: amountToSend
    });

    console.log(`⏳ Transaction sent: ${tx.hash}`);
    await tx.wait();
    console.log(`✅ ${fundAmount} native tokens successfully sent to ${contractAddress}`);
    
    // Get contract's balance after funding
    const balance = await ethers.provider.getBalance(contractAddress);
    console.log(`📊 Contract balance now: ${ethers.utils.formatEther(balance)} native tokens\n`);

    console.log("\n✅ FUNDING COMPLETED SUCCESSFULLY!");
    if (currentNetwork === "arbitrum") {
      console.log("\n⚠️ NEXT STEPS:");
      console.log("1. Run this script on the Sonic network to fund the SonicVRFConsumer");
      console.log("2. Ensure the Chainlink VRF subscription is properly funded with LINK");
    }
  } catch (error) {
    console.error("❌ FUNDING FAILED:", error);
    process.exit(1);
  }
}

/**
 * @notice Load deployed contract addresses from the deployment file
 * @param network The network name
 * @return The deployed contract addresses or null if not found
 */
function loadDeployedAddresses(network) {
  try {
    // Try to load the latest deployment file
    const deploymentPath = path.join(__dirname, '../deployments', `vrf-deployment-${network}-latest.json`);
    if (fs.existsSync(deploymentPath)) {
      const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
      return {
        arbitrumVRFRequester: deploymentData.arbitrumVRFRequester,
        sonicVRFConsumer: deploymentData.sonicVRFConsumer
      };
    }
    
    // If latest file doesn't exist, try to find any deployment file for this network
    const deploymentDir = path.join(__dirname, '../deployments');
    if (fs.existsSync(deploymentDir)) {
      const files = fs.readdirSync(deploymentDir);
      for (const file of files) {
        if (file.startsWith(`vrf-deployment-${network}`) && file.endsWith('.json')) {
          const deploymentData = JSON.parse(fs.readFileSync(path.join(deploymentDir, file), 'utf8'));
          return {
            arbitrumVRFRequester: deploymentData.arbitrumVRFRequester,
            sonicVRFConsumer: deploymentData.sonicVRFConsumer
          };
        }
      }
    }
    
    // Try to load from environment variables as a fallback
    if (process.env.ARBITRUM_VRF_REQUESTER && process.env.SONIC_VRF_CONSUMER) {
      return {
        arbitrumVRFRequester: process.env.ARBITRUM_VRF_REQUESTER,
        sonicVRFConsumer: process.env.SONIC_VRF_CONSUMER
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error loading deployment addresses:", error);
    return null;
  }
}

// Execute the funding script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Funding failed:", error);
    process.exit(1);
  }); 