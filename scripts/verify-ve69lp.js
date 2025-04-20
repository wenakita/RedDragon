const { run } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("Verifying ve69LP Contract on SonicScan...");
  
  // Get ve69LP address from deployments.json
  let ve69LPAddress, lpTokenAddress;
  try {
    const fs = require("fs");
    const deployments = JSON.parse(fs.readFileSync("deployments.json", "utf8"));
    ve69LPAddress = deployments.ve69lp;
    
    // Get the LP token address
    if (deployments.lpTokens && deployments.lpTokens.beetsLP) {
      lpTokenAddress = deployments.lpTokens.beetsLP;
    }
    
    if (!ve69LPAddress) {
      throw new Error("ve69LP address not found in deployments.json");
    }
    
    if (!lpTokenAddress) {
      console.warn("Warning: LP token address not found in deployments.json. Will try to verify without it.");
    }
  } catch (error) {
    console.error("Error reading deployments.json:", error.message);
    process.exit(1);
  }
  
  console.log(`ve69LP address: ${ve69LPAddress}`);
  if (lpTokenAddress) {
    console.log(`LP token address: ${lpTokenAddress}`);
  }
  
  try {
    // Verify contract with constructor arguments
    await run("verify:verify", {
      address: ve69LPAddress,
      constructorArguments: [lpTokenAddress],
    });
    console.log("✅ ve69LP contract verified successfully on SonicScan!");
  } catch (error) {
    console.error("❌ Error verifying ve69LP contract:", error.message);
    
    if (error.message.includes("already verified")) {
      console.log("Contract is already verified.");
    } else {
      console.error("Please verify manually using:");
      console.error(`npx hardhat verify --network sonic ${ve69LPAddress} ${lpTokenAddress}`);
    }
  }
}

main()
  .then(() => {
    console.log("Verification process completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 