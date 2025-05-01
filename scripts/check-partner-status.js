const { ethers } = require("hardhat");

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Checking partner status from account:", signer.address);

  // Get the ve69LPPoolVoting contract
  const ve69LPPoolVotingAddress = "0xB8094a7B421c58fa30e8EdF2a46d6E56B00648be";
  const ve69LPPoolVoting = await ethers.getContractAt("ve69LPPoolVoting", ve69LPPoolVotingAddress);

  // Get the partner registry contract address
  const partnerRegistryAddress = await ve69LPPoolVoting.partnerRegistry();
  console.log("Partner registry address:", partnerRegistryAddress);
  
  // Get the partner registry contract
  const partnerRegistry = await ethers.getContractAt("DragonPartnerRegistry", partnerRegistryAddress);
  
  // Check partner with ID 1
  const partnerId = 1;
  
  // Get partner address
  const partnerAddress = await partnerRegistry.partnerList(partnerId);
  console.log(`Partner ${partnerId} address:`, partnerAddress);
  
  if (partnerAddress === ethers.constants.AddressZero) {
    console.log(`Partner with ID ${partnerId} does not exist`);
    return;
  }
  
  // Check if partner is active
  const isActive = await partnerRegistry.isPartnerActive(partnerAddress);
  console.log(`Partner ${partnerId} is active:`, isActive);
  
  if (!isActive) {
    console.log(`Partner with ID ${partnerId} is not active, which is why you can't vote for them.`);
  } else {
    console.log(`Partner with ID ${partnerId} is active. You can vote for them if you have enough voting power.`);
    
    // Check your voting power
    const ve69LPAddress = await ve69LPPoolVoting.ve69LP();
    const ve69LP = await ethers.getContractAt("Ive69LP", ve69LPAddress);
    
    const votingPower = await ve69LP.votingPowerOf(signer.address);
    console.log("Your voting power:", ethers.utils.formatEther(votingPower));
    
    const minVotingPower = await ve69LPPoolVoting.minVotingPower();
    console.log("Minimum required voting power:", ethers.utils.formatEther(minVotingPower));
    
    if (votingPower.lt(minVotingPower)) {
      console.log(`You need at least ${ethers.utils.formatEther(minVotingPower)} voting power to vote.`);
    }
  }
  
  // Get total partner count
  const partnerCount = await partnerRegistry.getPartnerCount();
  console.log("Total number of partners:", partnerCount.toString());
  
  // List all active partners
  console.log("\nAll active partners:");
  for (let i = 0; i < partnerCount; i++) {
    const partnerAddress = await partnerRegistry.partnerList(i);
    const isActive = await partnerRegistry.isPartnerActive(partnerAddress);
    if (isActive) {
      console.log(`Partner ID ${i}: ${partnerAddress} (active)`);
    } else {
      console.log(`Partner ID ${i}: ${partnerAddress} (inactive)`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 