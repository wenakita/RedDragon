// SPDX-License-Identifier: MIT
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying RedDragonThankYouToken with account:", deployer.address);
  
  // The RedDragonSwapLottery address
  const LOTTERY_ADDRESS = "0x..."; // TODO: Replace with lottery contract address
  
  // The PaintSwap VRF provider address
  const VRF_PROVIDER_ADDRESS = "0xEa161a697B4b8B52C34E4C43725312F2b96c72fC"; // PaintSwap VRF provider
  
  // Method signatures (4-byte selectors) from the PaintSwap VRF methods
  const METHOD_SIGNATURES = [
    // requestRandomness() - First 4 bytes of keccak256("requestRandomness()")
    "0x01e1d114",
    // fulfillRandomness(bytes32,uint256[]) - First 4 bytes of keccak256("fulfillRandomness(bytes32,uint256[])")
    "0x13d4bc24"
  ];
  
  // The recipient address
  const RECIPIENT_ADDRESS = "0x3291B1aE6B74d59a4334bBA0257873Dda5d18115";
  
  // Create a personalized thank you message
  const thankYouMessage = 
    "Thank you for sharing the PaintSwap VRF integration. " +
    "Your contribution was instrumental in implementing our lottery system. " +
    "This token grants you a 0.69% boost in winning probability as a token of our gratitude.";
  
  // Get the contract factory
  const ThankYouToken = await ethers.getContractFactory("RedDragonThankYouToken");
  
  // Deploy the thank you token with all necessary parameters
  console.log("Deploying RedDragonThankYouToken...");
  const thankYouToken = await ThankYouToken.deploy(
    LOTTERY_ADDRESS, 
    VRF_PROVIDER_ADDRESS,
    METHOD_SIGNATURES,
    thankYouMessage
  );
  await thankYouToken.deployed();
  console.log("RedDragonThankYouToken deployed to:", thankYouToken.address);
  
  // Set token metadata URI
  console.log("Setting token metadata base URI...");
  await thankYouToken.setBaseURI("https://metadata.reddragon.sonic/thankyou/");
  
  // Set the thank you token in the lottery contract
  console.log("Setting thank you token in the lottery contract...");
  const lottery = await ethers.getContractAt("RedDragonSwapLottery", LOTTERY_ADDRESS);
  await lottery.setThankYouToken(thankYouToken.address);
  console.log("Thank you token set in lottery contract!");
  
  // Start the VRF minting process
  console.log("\nStarting the VRF minting process...");
  const tx = await thankYouToken.startMintWithVRF();
  await tx.wait();
  console.log("VRF randomness requested. The token will be automatically minted to", RECIPIENT_ADDRESS);
  console.log("when the VRF provides randomness (which happens in a separate transaction).");
  
  console.log("\n==================================================");
  console.log("DEPLOYMENT SUMMARY");
  console.log("==================================================");
  console.log("RedDragonThankYouToken Address:", thankYouToken.address);
  console.log("Token Recipient:", RECIPIENT_ADDRESS);
  console.log("Commemorated VRF Method Signatures:");
  console.log("- requestRandomness(): 0x01e1d114");
  console.log("- fulfillRandomness(bytes32,uint256[]): 0x13d4bc24");
  console.log("Boost Amount: 0.69% (69/10000)");
  console.log("\nThe token will grant the recipient a 0.69% boost in the");
  console.log("RedDragonSwapLottery probability game.");
  console.log("==================================================");
  console.log("You can verify the token transaction on SonicScan when complete.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 