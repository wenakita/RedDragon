const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("Deploying VRFValidator with configurable coordinator...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  
  // Load VRF coordinator from .env file or use default
  const VRF_COORDINATOR = process.env.VRF_COORDINATOR || "0x3Ba925fdeAe6B46d0BB4d424D829982Cb2F7309e";
  console.log(`Using VRF Coordinator: ${VRF_COORDINATOR}`);
  
  // Deploy the VRFValidator contract
  const VRFValidator = await ethers.getContractFactory("VRFValidator");
  const validator = await VRFValidator.deploy(VRF_COORDINATOR);
  
  await validator.deployed();
  console.log(`VRFValidator deployed to: ${validator.address}`);
  
  // Verify that the coordinator was set correctly
  const officialCoordinator = await validator.officialVRFCoordinator();
  console.log(`Configured coordinator: ${officialCoordinator}`);
  
  if (officialCoordinator !== VRF_COORDINATOR) {
    console.warn("WARNING: Configured coordinator does not match expected value!");
  } else {
    console.log("Coordinator configured correctly.");
  }
  
  console.log("Deployment completed successfully.");
  
  // Store the address in deployment log
  try {
    const fs = require("fs");
    const deployments = JSON.parse(fs.readFileSync("deployments.json", "utf8"));
    deployments.vrfValidator = validator.address;
    deployments.vrfCoordinator = VRF_COORDINATOR;
    fs.writeFileSync("deployments.json", JSON.stringify(deployments, null, 2));
    console.log("Deployment address saved to deployments.json");
  } catch (error) {
    console.log("Note: could not save to deployments.json, create file manually");
  }
  
  return validator.address;
}

main()
  .then((address) => {
    console.log(`Success! Contract deployed at: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 