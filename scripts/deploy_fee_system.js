const { ethers } = require("hardhat");

async function main() {
  console.log("Starting DragonAdaptiveFeeManager deployment...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  
  // Get deployed OmniDragon token address
  // Update this with your actual deployed contract address
  const DRAGON_TOKEN_ADDRESS = "0xYourOmniDragonAddress";
  console.log(`Using OmniDragon at: ${DRAGON_TOKEN_ADDRESS}`);
  
  // Get OmniDragon contract instance
  const dragonToken = await ethers.getContractAt("OmniDragon", DRAGON_TOKEN_ADDRESS);
  console.log("Connected to OmniDragon contract");
  
  // Get jackpot vault address from OmniDragon
  const jackpotVault = await dragonToken.jackpotVault();
  console.log(`Jackpot vault address: ${jackpotVault}`);
  
  // Deploy DragonAdaptiveFeeManager with initial parameters:
  // - 10% total fee (1000 basis points)
  // - 0.69% burn fee (69 basis points)
  // - 6.9% initial jackpot fee (690 basis points)
  console.log("Deploying DragonAdaptiveFeeManager...");
  const DragonAdaptiveFeeManager = await ethers.getContractFactory("DragonAdaptiveFeeManager");
  const feeManager = await DragonAdaptiveFeeManager.deploy(1000, 69, 690);
  await feeManager.deployed();
  console.log(`DragonAdaptiveFeeManager deployed to: ${feeManager.address}`);
  
  // Set up connections between contracts
  console.log("Setting up contract connections...");
  
  // 1. Set fee manager in OmniDragon
  console.log("Setting fee manager in OmniDragon...");
  let tx = await dragonToken.setFeeManager(feeManager.address);
  await tx.wait();
  console.log("Fee manager set in OmniDragon");
  
  // 2. Set OmniDragon reference in fee manager
  console.log("Setting OmniDragon reference in fee manager...");
  tx = await feeManager.setDragonToken(dragonToken.address);
  await tx.wait();
  console.log("OmniDragon reference set in fee manager");
  
  // 3. Set jackpot vault reference in fee manager
  console.log("Setting jackpot vault reference in fee manager...");
  tx = await feeManager.setJackpotVault(jackpotVault);
  await tx.wait();
  console.log("Jackpot vault reference set in fee manager");
  
  // 4. Get current jackpot size from vault and initialize in fee manager
  console.log("Initializing jackpot size...");
  const jackpotVaultContract = await ethers.getContractAt("IDragonJackpotVault", jackpotVault);
  const currentJackpotSize = await jackpotVaultContract.getJackpotSize();
  tx = await feeManager.updateJackpotSize(currentJackpotSize);
  await tx.wait();
  console.log(`Jackpot size initialized: ${ethers.utils.formatEther(currentJackpotSize)} tokens`);
  
  // 5. Enable adaptive fees in OmniDragon
  console.log("Enabling adaptive fees...");
  tx = await dragonToken.setAdaptiveFeesEnabled(true);
  await tx.wait();
  console.log("Adaptive fees enabled in OmniDragon");
  
  // 6. Set fee update interval (optional, defaults to 1 day)
  // Uncomment to customize the update interval
  /*
  console.log("Setting custom fee update interval...");
  const updateInterval = 12 * 60 * 60; // 12 hours in seconds
  tx = await feeManager.setFeeUpdateInterval(updateInterval);
  await tx.wait();
  console.log(`Fee update interval set to ${updateInterval} seconds`);
  */
  
  // 7. Perform initial fee update
  console.log("Performing initial fee update...");
  tx = await feeManager.executeFeeUpdate();
  await tx.wait();
  console.log("Initial fee update executed");
  
  // 8. Verify the fee settings
  const buyFees = await dragonToken.getBuyFees();
  const sellFees = await dragonToken.getSellFees();
  console.log("Current fee configuration:");
  console.log(`Buy fees - Jackpot: ${buyFees.jackpotFee}, ve69LP: ${buyFees.ve69LPFee}, Burn: ${buyFees.burnFee}, Total: ${buyFees.totalFee}`);
  console.log(`Sell fees - Jackpot: ${sellFees.jackpotFee}, ve69LP: ${sellFees.ve69LPFee}, Burn: ${sellFees.burnFee}, Total: ${sellFees.totalFee}`);
  
  console.log("\nDragonAdaptiveFeeManager integration completed successfully!");
  console.log("\nNext steps:");
  console.log("1. Set up Chainlink Automation to call checkAndUpdateFees() periodically");
  console.log("2. Monitor fee adjustments as market conditions change");
  console.log("3. Consider fine-tuning Hermès parameters for optimal fee allocation");
}

// Execute the deployment script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 