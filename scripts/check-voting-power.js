const { ethers } = require("hardhat");

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Checking voting power for account:", signer.address);

  // Get the ve69LP contract
  const ve69LPAddress = "0x..."; // Replace with your ve69LP contract address
  const ve69LP = await ethers.getContractAt("Ive69LP", ve69LPAddress);

  // Get the ve69LPPoolVoting contract
  const ve69LPPoolVotingAddress = "0xB8094a7B421c58fa30e8EdF2a46d6E56B00648be";
  const ve69LPPoolVoting = await ethers.getContractAt("ve69LPPoolVoting", ve69LPPoolVotingAddress);

  // Check current voting power
  const votingPower = await ve69LP.votingPowerOf(signer.address);
  console.log("Current voting power:", ethers.utils.formatEther(votingPower));

  // Check minimum required voting power
  const minVotingPower = await ve69LPPoolVoting.minVotingPower();
  console.log("Minimum required voting power:", ethers.utils.formatEther(minVotingPower));

  if (votingPower.lt(minVotingPower)) {
    console.log("Insufficient voting power. You need to lock more LP tokens for a longer duration.");
    
    // Get the LP token address
    const lpTokenAddress = await ve69LP.lpToken();
    const lpToken = await ethers.getContractAt("IERC20", lpTokenAddress);
    
    // Check LP token balance
    const lpBalance = await lpToken.balanceOf(signer.address);
    console.log("Current LP token balance:", ethers.utils.formatEther(lpBalance));
    
    if (lpBalance.gt(0)) {
      // Approve LP tokens to be locked
      const amountToLock = lpBalance;
      console.log("Approving", ethers.utils.formatEther(amountToLock), "LP tokens for locking");
      await lpToken.approve(ve69LPAddress, amountToLock);
      
      // Lock tokens for 1 year (adjust lock time as needed)
      const ONE_YEAR = 365 * 24 * 60 * 60;
      const lockTime = Math.floor(Date.now() / 1000) + ONE_YEAR;
      console.log("Locking tokens until:", new Date(lockTime * 1000).toISOString());
      
      // Check if user already has a lock
      try {
        const [lockedAmount, unlockTime] = await ve69LP.getLock(signer.address);
        
        if (lockedAmount.gt(0)) {
          if (unlockTime < lockTime) {
            // Extend lock time if needed
            console.log("Extending existing lock time");
            await ve69LP.extendLockTime(lockTime);
          }
          
          // Increase lock amount
          console.log("Increasing lock amount");
          await ve69LP.increaseLockAmount(amountToLock);
        } else {
          // Create new lock
          console.log("Creating new lock");
          await ve69LP.createLock(amountToLock, lockTime);
        }
      } catch (error) {
        console.log("Creating new lock");
        await ve69LP.lock(amountToLock, ONE_YEAR);
      }
      
      // Check new voting power
      const newVotingPower = await ve69LP.votingPowerOf(signer.address);
      console.log("New voting power:", ethers.utils.formatEther(newVotingPower));
      
      if (newVotingPower.gte(minVotingPower)) {
        console.log("Success! You now have enough voting power to vote.");
      } else {
        console.log("Still not enough voting power. You may need to lock for a longer duration or lock more tokens.");
      }
    } else {
      console.log("You don't have any LP tokens to lock. You need to acquire some LP tokens first.");
    }
  } else {
    console.log("You have enough voting power to vote. Try voting again.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 