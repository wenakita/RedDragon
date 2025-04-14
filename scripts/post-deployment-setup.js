const hre = require("hardhat");

async function main() {
  console.log("Running post-deployment setup...");
  
  // Get the signer
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);
  
  // Define contract addresses from the deployment
  const redDragonAddress = "0x1e21f027614e37cD87dE9a69C7c73e62c05E1bED";
  const lotteryAddress = "0xFd93683568DFE488FE0319eFf93B740097c3C552";
  const integratorAddress = "0x850dC62ed8C10131e45666df9b5813f49AA6E884";
  const vrfCoordinatorAddress = "0x3ba925fdeae6b46d0bb4d424d829982cb2f7309e";

  // Configure higher gas price and gas limit for all transactions
  const overrides = {
    gasPrice: hre.ethers.utils.parseUnits('100', 'gwei'), // 100 gwei
    gasLimit: 5000000
  };

  // 1. Set ve8020 integrator in the lottery
  try {
    console.log("Setting ve8020 integrator in the lottery...");
    
    // Connect to the lottery contract
    const lottery = await hre.ethers.getContractAt(
      "RedDragonSwapLotteryWithScratcher", 
      lotteryAddress,
      deployer
    );
    
    // Try to get the setVe8020Integrator function
    if (typeof lottery.setVe8020Integrator === 'function') {
      const tx = await lottery.setVe8020Integrator(integratorAddress, overrides);
      await tx.wait();
      console.log("Successfully set ve8020 integrator in the lottery");
    } else {
      // If the function doesn't exist, try setVotingToken instead
      console.log("setVe8020Integrator not found, trying setVotingToken...");
      const tx = await lottery.setVotingToken(integratorAddress, overrides);
      await tx.wait();
      console.log("Successfully set voting token in the lottery");
    }
  } catch (error) {
    console.error(`Failed to set ve8020 integrator: ${error.message}`);
  }
  
  // 2. Set jackpot address directly (if possible)
  try {
    console.log("Attempting to directly set jackpot address...");
    
    // Connect to the RedDragon contract
    const redDragon = await hre.ethers.getContractAt(
      "RedDragon", 
      redDragonAddress,
      deployer
    );
    
    // Check if setJackpotAddress is available (without timelock)
    if (typeof redDragon.setJackpotAddress === 'function') {
      const tx = await redDragon.setJackpotAddress(lotteryAddress, overrides);
      await tx.wait();
      console.log("Successfully set jackpot address directly");
    } else {
      // If not available, schedule the update as before
      console.log("setJackpotAddress not available, scheduling update...");
      const tx = await redDragon.scheduleJackpotAddressUpdate(lotteryAddress, overrides);
      await tx.wait();
      console.log(`Scheduled jackpot address update to: ${lotteryAddress} (needs timelock)`);
      console.log("Note: You will need to execute this update after 24 hours by calling executeJackpotAddressUpdate");
    }
  } catch (error) {
    console.error(`Failed to set jackpot address: ${error.message}`);
  }
  
  // 3. Fund VRF subscription
  try {
    console.log("Funding VRF subscription...");
    
    // Connect to the VRF Coordinator
    const vrfCoordinator = await hre.ethers.getContractAt(
      "IVRFCoordinator", 
      vrfCoordinatorAddress,
      deployer
    );
    
    // Fund the subscription with 0.1 SONIC
    const fundAmount = hre.ethers.utils.parseEther("0.1");
    const fundTx = await vrfCoordinator.fundSubscription(1, fundAmount, {
      ...overrides,
      value: fundAmount
    });
    await fundTx.wait();
    console.log(`Successfully funded VRF subscription with ${hre.ethers.utils.formatEther(fundAmount)} SONIC`);
  } catch (error) {
    console.error(`Failed to fund VRF subscription: ${error.message}`);
  }
  
  console.log("Post-deployment setup complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 