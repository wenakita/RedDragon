import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("\n🐉 DRAGON ECOSYSTEM POST-DEPLOYMENT SETUP 🐉\n");
  
  // Get the signer
  const [deployer] = await ethers.getSigners();
  console.log(`Setting up with account: ${deployer.address}`);
  console.log(`Account balance: ${ethers.utils.formatEther(await deployer.getBalance())} ETH`);
  
  // Load deployed contract addresses
  const configDir = path.join(__dirname, "..", "deployments");
  const contractAddressesPath = path.join(configDir, "contract-addresses.json");
  
  if (!fs.existsSync(contractAddressesPath)) {
    throw new Error("Contract addresses file not found. Deploy contracts first.");
  }
  
  const contractAddresses = JSON.parse(fs.readFileSync(contractAddressesPath, "utf8"));
  
  // Get addresses of deployed contracts
  const dragonAddress = contractAddresses.dragon;
  const jackpotVaultAddress = contractAddresses.jackpotVault;
  const ve69LPFeeDistributorAddress = contractAddresses.ve69LPFeeDistributor;
  
  if (!dragonAddress || !jackpotVaultAddress || !ve69LPFeeDistributorAddress) {
    throw new Error("Missing contract addresses. Deploy all contracts first.");
  }
  
  console.log(`Dragon: ${dragonAddress}`);
  console.log(`JackpotVault: ${jackpotVaultAddress}`);
  console.log(`ve69LPFeeDistributor: ${ve69LPFeeDistributorAddress}`);
  
  // Get contract instances
  const dragon = await ethers.getContractAt("Dragon", dragonAddress);
  const jackpotVault = await ethers.getContractAt("DragonJackpotVault", jackpotVaultAddress);
  const ve69LPFeeDistributor = await ethers.getContractAt("ve69LPFeeDistributor", ve69LPFeeDistributorAddress);
  
  // Set up fees
  console.log("\n=== SETTING UP FEES ===\n");
  
  // Set buy fees: 6.9% to jackpot, 2.41% to ve69LP, 0.69% burn
  console.log("Setting buy fees...");
  const setBuyFeesTx = await dragon.setBuyFees(690, 241, 69, {
    gasLimit: 500000,
    gasPrice: ethers.utils.parseUnits("150", "gwei")
  });
  await setBuyFeesTx.wait();
  console.log("Buy fees set");
  
  // Set sell fees: 6.9% to jackpot, 2.41% to ve69LP, 0.69% burn
  console.log("Setting sell fees...");
  const setSellFeesTx = await dragon.setSellFees(690, 241, 69, {
    gasLimit: 500000,
    gasPrice: ethers.utils.parseUnits("150", "gwei")
  });
  await setSellFeesTx.wait();
  console.log("Sell fees set");
  
  // Set BeetsLP fees: 4.76% to jackpot, 2.14% to ve69LP
  console.log("Setting BeetsLP fees...");
  const setBeetsLPFeesTx = await dragon.setBeetsLPFees(476, 214, {
    gasLimit: 500000,
    gasPrice: ethers.utils.parseUnits("150", "gwei")
  });
  await setBeetsLPFeesTx.wait();
  console.log("BeetsLP fees set");
  
  // Get the fee settings to verify
  const buyFees = await dragon.getBuyFees();
  const sellFees = await dragon.getSellFees();
  const beetsLPFees = await dragon.getBeetsLPFees();
  
  console.log("\n=== FEE VERIFICATION ===\n");
  console.log(`Buy Fees: ${buyFees[0]}bp jackpot, ${buyFees[1]}bp ve69LP, ${buyFees[2]}bp burn, ${buyFees[3]}bp total`);
  console.log(`Sell Fees: ${sellFees[0]}bp jackpot, ${sellFees[1]}bp ve69LP, ${sellFees[2]}bp burn, ${sellFees[3]}bp total`);
  console.log(`BeetsLP Fees: ${beetsLPFees[0]}bp jackpot, ${beetsLPFees[1]}bp ve69LP, ${beetsLPFees[2]}bp total`);
  
  console.log("\n✅ POST-DEPLOYMENT SETUP COMPLETED! ✅\n");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 