// Verify EOA Security Features
const { ethers } = require("hardhat");

async function main() {
  console.log("Verifying EOA Security Features in RedDragonVerifier...");
  
  // Get contract addresses from config
  const configPath = require('path').resolve(__dirname, '../config/deployment-addresses-sonic.json');
  const config = require(configPath);
  
  if (!config.verifier) {
    console.error("❌ Extra secure verifier address not found in config!");
    process.exit(1);
  }
  
  console.log("Using addresses:");
  console.log("  RedDragonVerifier:", config.verifier);
  console.log("  RedDragon Token:", config.redDragon);
  console.log("  RedDragonSwapLottery:", config.lottery);
  
  // Connect to verifier contract
  const verifier = await ethers.getContractAt("RedDragonVerifier", config.verifier);
  const [deployer] = await ethers.getSigners();
  
  console.log("\n🔍 Checking EOA Secure Functions...");
  console.log("Account:", deployer.address);
  
  // Test lottery verification function
  try {
    console.log("\n🔍 Checking getLotteryVerification() function...");
    const lotteryInfo = await verifier.getLotteryVerification();
    console.log("✅ getLotteryVerification() successful!");
    console.log("  - Lottery exists:", lotteryInfo[0]);
    console.log("  - Current jackpot:", ethers.formatUnits(lotteryInfo[1], 18), "wS");
    console.log("  - Total winners:", lotteryInfo[2].toString());
    console.log("  - Total payouts:", ethers.formatUnits(lotteryInfo[3], 18), "wS");
    console.log("  - Last winner:", lotteryInfo[4]);
    console.log("  - Last win amount:", ethers.formatUnits(lotteryInfo[5], 18), "wS");
    console.log("  - VRF enabled:", lotteryInfo[6]);
    console.log("  - VRF coordinator:", lotteryInfo[7]);
  } catch (error) {
    console.log("❌ Error calling getLotteryVerification():", error.message);
  }
  
  // Test randomness security function
  try {
    console.log("\n🔍 Checking checkRandomnessSecurity() function...");
    const randomnessInfo = await verifier.checkRandomnessSecurity();
    console.log("✅ checkRandomnessSecurity() successful!");
    console.log("  - Randomness secure:", randomnessInfo[0]);
    console.log("  - VRF enabled:", randomnessInfo[1]);
    console.log("  - VRF coordinator:", randomnessInfo[2]);
    console.log("  - VRF contract setup:", randomnessInfo[3]);
  } catch (error) {
    console.log("❌ Error calling checkRandomnessSecurity():", error.message);
  }
  
  // Check the owner status
  const owner = await verifier.owner();
  console.log("\nContract owner:", owner);
  console.log("Your address:", deployer.address);
  console.log("Are you the owner?", owner.toLowerCase() === deployer.address.toLowerCase());
  
  // Test pausing functionality ONLY if you're the owner
  if (owner.toLowerCase() === deployer.address.toLowerCase()) {
    try {
      console.log("\n🔍 Testing pause functionality...");
      const isPaused = await verifier.isPaused();
      console.log("  Current paused state:", isPaused);
      
      // Pause the contract
      console.log("  Pausing contract...");
      const pauseTx = await verifier.setPaused(true);
      await pauseTx.wait();
      const newPausedState = await verifier.isPaused();
      console.log("  New paused state:", newPausedState);
      
      if (newPausedState) {
        // Try calling a function while paused
        console.log("  Trying to call getLiquidityBurnVerification() while paused...");
        try {
          await verifier.getLiquidityBurnVerification();
          console.log("  ❌ Function call succeeded when it should have failed!");
        } catch (error) {
          if (error.message.includes("Contract is paused")) {
            console.log("  ✅ Function correctly rejected with 'Contract is paused'");
          } else {
            console.log("  ❌ Function failed with unexpected error:", error.message);
          }
        }
        
        // Unpause the contract
        console.log("  Unpausing contract...");
        const unpauseTx = await verifier.setPaused(false);
        await unpauseTx.wait();
        console.log("  New paused state:", await verifier.isPaused());
      } else {
        console.log("  ❌ Failed to pause the contract. Transaction might have succeeded but state didn't change.");
      }
    } catch (error) {
      console.log("❌ Error testing pause functionality:", error.message);
    }
  } else {
    console.log("\n⚠️ Skipping pause functionality test (not owner)");
  }
  
  console.log("\n✅ Verification complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 