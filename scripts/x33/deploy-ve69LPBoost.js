const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying ve69LPBoost...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  // Get contract addresses needed for deployment
  const ve69LPAddress = process.env.VE69LP_ADDRESS;
  const jackpotAddress = process.env.JACKPOT_ADDRESS;
  
  if (!ve69LPAddress || !jackpotAddress) {
    console.error("ERROR: Missing required environment variables.");
    console.error("Please set VE69LP_ADDRESS and JACKPOT_ADDRESS in your .env file");
    process.exit(1);
  }
  
  // Deploy ve69LPBoost contract
  console.log("Deploying ve69LPBoost contract...");
  const ve69LPBoost = await ethers.getContractFactory("ve69LPBoost");
  const booster = await ve69LPBoost.deploy(ve69LPAddress, jackpotAddress);
  await booster.deployed();
  
  console.log("ve69LPBoost deployed to:", booster.address);
  console.log("Constructor arguments:", [ve69LPAddress, jackpotAddress]);
  
  console.log("\nVerify with:");
  console.log(`npx hardhat verify --network sonic ${booster.address} ${ve69LPAddress} ${jackpotAddress}`);
  
  return { booster };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 