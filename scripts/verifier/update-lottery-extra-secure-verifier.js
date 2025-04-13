// Update Lottery with Extra Secure RedDragonVerifier (with EOA security checks)
const { ethers } = require("hardhat");

async function main() {
  console.log("Updating Lottery with Extra Secure RedDragonVerifier (with EOA checks)...");
  
  // Get contract addresses from config
  const configPath = require('path').resolve(__dirname, '../config/deployment-addresses-sonic.json');
  const config = require(configPath);
  
  if (!config.extraSecureRedDragonVerifier) {
    console.error("Extra secure verifier address not found in config. Please deploy it first using deploy-extra-secure-verifier.js");
    process.exit(1);
  }
  
  console.log("Using addresses:");
  console.log("  RedDragonSwapLottery:", config.lottery);
  console.log("  Extra Secure RedDragonVerifier:", config.extraSecureRedDragonVerifier);
  
  // Connect to lottery contract
  const lottery = await ethers.getContractAt("RedDragonSwapLottery", config.lottery);
  
  // Get current verifier
  const currentVerifier = await lottery.verifier();
  console.log("Current verifier address:", currentVerifier);
  
  // Update lottery to use the new secure verifier
  console.log("Updating lottery to use the extra secure verifier with EOA checks...");
  const tx = await lottery.setVerifier(config.extraSecureRedDragonVerifier);
  console.log("Transaction sent:", tx.hash);
  console.log("Waiting for transaction to be mined...");
  await tx.wait();
  console.log("Transaction confirmed in block:", (await tx.wait()).blockNumber);
  
  // Verify the update
  const newVerifier = await lottery.verifier();
  if (newVerifier.toLowerCase() === config.extraSecureRedDragonVerifier.toLowerCase()) {
    console.log("✅ Lottery successfully updated to use the extra secure verifier with EOA checks!");
  } else {
    console.log("❌ Something went wrong. The verifier was not updated correctly.");
    console.log("Expected:", config.extraSecureRedDragonVerifier);
    console.log("Actual:", newVerifier);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 