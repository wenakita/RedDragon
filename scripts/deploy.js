/**
 * RedDragon Core Deployment Script
 * 
 * This script deploys the core contracts for the RedDragon ecosystem:
 * 1. RedDragon token (or uses a mock for testing)
 * 2. ve8020 voting escrow token
 * 3. Ve8020FeeDistributor for reward distribution
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  let rewardToken;
  
  // Check if we're in development or production mode
  const networkName = process.env.HARDHAT_NETWORK || "hardhat";
  const isDevelopment = networkName === "hardhat" || networkName === "localhost";
  
  // For development, we deploy a mock token. In production, we'd use the actual RedDragon address
  if (isDevelopment) {
    console.log("🔨 Development mode: Deploying mock RedDragon token");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    rewardToken = await MockERC20.deploy("RedDragon", "RD", 18);
    await rewardToken.deployed();
    console.log("📝 RedDragon token (mock) deployed to:", rewardToken.address);
    
    // Mint some tokens to the deployer for testing
    await rewardToken.mint(deployer.address, ethers.utils.parseEther("1000000"));
    console.log("💰 Minted 1,000,000 tokens to deployer for testing");
  } else {
    // In production, use existing RedDragon token address
    console.log("🚀 Production mode: Using existing RedDragon token");
    const tokenAddress = process.env.REDDRAGON_TOKEN_ADDRESS;
    if (!tokenAddress) {
      throw new Error("Please set REDDRAGON_TOKEN_ADDRESS in your environment variables");
    }
    rewardToken = await ethers.getContractAt("IERC20", tokenAddress);
    console.log("📝 Using RedDragon token at:", rewardToken.address);
  }

  // Deploy the ve8020 token
  console.log("🔄 Deploying ve8020 token...");
  const Ve8020 = await ethers.getContractFactory("ve8020");
  const ve8020 = await Ve8020.deploy(rewardToken.address);
  await ve8020.deployed();
  console.log("📝 ve8020 token deployed to:", ve8020.address);

  // Deploy the fee distributor
  console.log("🔄 Deploying Ve8020FeeDistributor...");
  const Ve8020FeeDistributor = await ethers.getContractFactory("Ve8020FeeDistributor");
  const feeDistributor = await Ve8020FeeDistributor.deploy(
    ve8020.address,
    rewardToken.address
  );
  await feeDistributor.deployed();
  console.log("📝 Ve8020FeeDistributor deployed to:", feeDistributor.address);

  // Log a deployment summary
  console.log("\n✅ Deployment complete!");
  console.log("======================");
  console.log("RedDragon Token:", rewardToken.address);
  console.log("ve8020 Token:", ve8020.address);
  console.log("Ve8020FeeDistributor:", feeDistributor.address);
  
  // Save deployment info to a file
  const deploymentInfo = {
    network: networkName,
    timestamp: new Date().toISOString(),
    contracts: {
      RedDragon: rewardToken.address,
      ve8020: ve8020.address,
      Ve8020FeeDistributor: feeDistributor.address
    }
  };
  
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  fs.writeFileSync(
    path.join(deploymentsDir, `deployment-${networkName}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`📄 Deployment info saved to deployments/deployment-${networkName}.json`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed!");
    console.error(error);
    process.exit(1);
  }); 