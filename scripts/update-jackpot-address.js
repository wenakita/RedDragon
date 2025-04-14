const hre = require("hardhat");

async function main() {
  console.log("Deploying and using OneTimeJackpotUpdater...");
  
  // Get the signer
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);
  
  // Define addresses
  const redDragonAddress = "0x1e21f027614e37cD87dE9a69C7c73e62c05E1bED";
  const lotteryAddress = "0xFd93683568DFE488FE0319eFf93B740097c3C552";
  
  // Configure higher gas price and gas limit for all transactions
  const overrides = {
    gasPrice: hre.ethers.utils.parseUnits('100', 'gwei'), // 100 gwei
    gasLimit: 5000000
  };
  
  // First, deploy the OneTimeJackpotUpdater contract
  console.log("Deploying OneTimeJackpotUpdater...");
  const OneTimeJackpotUpdater = await hre.ethers.getContractFactory("OneTimeJackpotUpdater");
  const updater = await OneTimeJackpotUpdater.deploy(overrides);
  await updater.deployed();
  console.log(`OneTimeJackpotUpdater deployed to: ${updater.address}`);
  
  // Now, we need to transfer ownership of RedDragon to the updater
  // Note: This is a critical step - you must be the owner of RedDragon
  try {
    console.log("Transferring ownership of RedDragon to the updater...");
    const redDragon = await hre.ethers.getContractAt("RedDragon", redDragonAddress, deployer);
    
    // Store the original owner for reference
    const originalOwner = await redDragon.owner();
    console.log(`Original owner of RedDragon: ${originalOwner}`);
    
    // Make sure the caller is the owner
    if (originalOwner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.error(`You (${deployer.address}) are not the owner of RedDragon contract!`);
      console.error("Ownership transfer aborted for safety.");
      return;
    }
    
    // Transfer ownership to updater
    const transferTx = await redDragon.transferOwnership(updater.address, overrides);
    await transferTx.wait();
    console.log(`Ownership transferred to updater: ${updater.address}`);
    
    // Use the updater to update the jackpot address
    console.log(`Updating jackpot address to: ${lotteryAddress}`);
    const updateTx = await updater.updateJackpotAddressOnce(
      redDragonAddress,
      lotteryAddress,
      originalOwner,
      overrides
    );
    await updateTx.wait();
    console.log("Jackpot address updated and ownership returned to original owner");
    
    // Verify the change
    const newJackpotAddress = await redDragon.jackpotAddress();
    console.log(`New jackpot address: ${newJackpotAddress}`);
    
    if (newJackpotAddress.toLowerCase() === lotteryAddress.toLowerCase()) {
      console.log("✅ Jackpot address successfully updated!");
    } else {
      console.log("❌ Jackpot address update failed!");
    }
    
  } catch (error) {
    console.error(`Error updating jackpot address: ${error.message}`);
    console.error("Please check the contract ownership and try again.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 