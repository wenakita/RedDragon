const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("Deploying Dragon Token...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  
  // Get addresses from .env or use defaults
  const jackpotAddress = process.env.JACKPOT_VAULT_ADDRESS || "0x2e76D5d31B41Edc8Ae71F9dFbB768bdaAcED648e";
  const ve69LPAddress = process.env.VE69LP_ADDRESS || "0xb5C23c1F2BeBA4575F845DEc0E585E404BEE3082";
  const burnAddress = process.env.BURN_ADDRESS || "0x000000000000000000000000000000000000dEaD";
  const wrappedSonicAddress = process.env.WRAPPED_SONIC_ADDRESS || "0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38";
  
  console.log(`Using jackpot address: ${jackpotAddress}`);
  console.log(`Using ve69LP address: ${ve69LPAddress}`);
  console.log(`Using burn address: ${burnAddress}`);
  console.log(`Using wrappedSonic address: ${wrappedSonicAddress}`);
  
  // Deploy the Dragon contract
  const Dragon = await ethers.getContractFactory("Dragon");
  const dragon = await Dragon.deploy(
    jackpotAddress,
    ve69LPAddress,
    burnAddress,
    wrappedSonicAddress
  );
  
  await dragon.deployed();
  console.log(`Dragon token deployed to: ${dragon.address}`);
  
  // Store the address in deployment log
  try {
    const fs = require("fs");
    const deployments = JSON.parse(fs.readFileSync("deployments.json", "utf8"));
    deployments.dragon = dragon.address;
    fs.writeFileSync("deployments.json", JSON.stringify(deployments, null, 2));
    console.log("Deployment address saved to deployments.json");
  } catch (error) {
    console.log("Note: could not save to deployments.json, create file manually");
    console.error(error);
  }
  
  return dragon.address;
}

main()
  .then((address) => {
    console.log(`Success! Dragon token deployed at: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 