const hre = require("hardhat");
const fs = require("fs");
const { execSync } = require("child_process");

/**
 * Deploy the RedDragonThankYouToken contract
 * This special NFT grants holders a boost in the lottery
 */
async function main() {
  console.log("🚀 Deploying RedDragonThankYouToken contract...");
  console.log("==============================================");
  
  try {
    // Load deployment addresses
    let addresses = {};
    const deploymentFile = "deployment-addresses-sonic.json";
    
    if (fs.existsSync(deploymentFile)) {
      addresses = JSON.parse(fs.readFileSync(deploymentFile));
      console.log("📝 Loaded deployment addresses from file");
    } else {
      console.error("❌ Deployment addresses file not found");
      process.exit(1);
    }
    
    // Check required addresses exist
    if (!addresses.lottery) {
      console.error("❌ Lottery address not found in deployment file");
      process.exit(1);
    }
    
    if (!addresses.paintSwapVerifier) {
      console.error("❌ PaintSwap verifier address not found in deployment file");
      process.exit(1);
    }
    
    const lotteryAddress = addresses.lottery;
    const vrfAddress = addresses.paintSwapVerifier;
    
    // For a new deployment with multiple recipients
    // We need to modify the RedDragonThankYouToken contract to support multiple recipients
    console.log("\n⚠️ The RedDragonThankYouToken contract currently has a hardcoded recipient:");
    console.log("   RECIPIENT = 0x3291B1aE6B74d59a4334bBA0257873Dda5d18115");
    console.log("\n   To add 0xD2AfB6Acb56f35AFB861114c74703c53Fe6217bd as a recipient,");
    console.log("   we need to modify the contract first.");
    
    console.log("\n📝 Creating updated ThankYouToken contract with multiple recipients...");
    
    // Create the updated contract file with multiple recipients
    const updatedContractPath = "contracts/RedDragonThankYouTokenMulti.sol";
    const originalContract = fs.readFileSync("contracts/RedDragonThankYouToken.sol", "utf8");
    
    // Replace hardcoded recipient with array of recipients
    const updatedContract = originalContract
      // Update contract name
      .replace(
        "contract RedDragonThankYouToken is ERC721, Ownable {",
        "contract RedDragonThankYouTokenMulti is ERC721, Ownable {"
      )
      // Remove single recipient constant
      .replace(
        "address public constant RECIPIENT = 0x3291B1aE6B74d59a4334bBA0257873Dda5d18115;",
        "// List of recipients who will receive thank you tokens\n" +
        "    address[] public recipients = [\n" +
        "        0x3291B1aE6B74d59a4334bBA0257873Dda5d18115,\n" +
        "        0xD2AfB6Acb56f35AFB861114c74703c53Fe6217bd\n" +
        "    ];"
      )
      // Update minting functionality
      .replace(
        "_safeMint(RECIPIENT, tokenId);",
        "// Mint tokens to all recipients\n" +
        "        for (uint256 i = 0; i < recipients.length; i++) {\n" +
        "            _safeMint(recipients[i], tokenId + i);\n" +
        "        }\n" +
        "        _nextTokenId += recipients.length;"
      )
      // Update the event emission
      .replace(
        "emit ThankYouTokenMinted(RECIPIENT, tokenId, commemoratedMethodSignatures);",
        "for (uint256 i = 0; i < recipients.length; i++) {\n" +
        "            emit ThankYouTokenMinted(recipients[i], tokenId + i, commemoratedMethodSignatures);\n" +
        "        }"
      )
      // Fix the token ID increment
      .replace(
        "uint256 tokenId = _nextTokenId++;",
        "uint256 tokenId = _nextTokenId;"
      );
    
    fs.writeFileSync(updatedContractPath, updatedContract);
    console.log(`✅ Created modified contract at ${updatedContractPath}`);
    
    // Compile the contracts
    console.log("\n🔨 Compiling contracts...");
    try {
      execSync("npx hardhat compile", { stdio: 'inherit' });
      console.log("✅ Contracts compiled successfully");
    } catch (error) {
      console.error("❌ Failed to compile contracts:", error.message);
      process.exit(1);
    }
    
    // Define method signatures to commemorate (VRF-related functions)
    const methodSignatures = [
      "0xdc6cfe10", // requestRandomness()
      "0x9d6d05eb"  // fulfillRandomWords(bytes32,uint256[])
    ];
    
    const thankYouMessage = "Thank you for your contributions to the RedDragon ecosystem. Your work on the VRF integration has been invaluable.";
    
    // Deploy the updated contract
    console.log("\n📦 Deploying RedDragonThankYouTokenMulti contract...");
    console.log(`   Using lottery address: ${lotteryAddress}`);
    console.log(`   Using VRF provider: ${vrfAddress}`);
    
    const ThankYouToken = await hre.ethers.getContractFactory("RedDragonThankYouTokenMulti");
    const thankYouToken = await ThankYouToken.deploy(
      lotteryAddress,
      vrfAddress,
      methodSignatures,
      thankYouMessage
    );
    
    await thankYouToken.waitForDeployment();
    const thankYouTokenAddress = await thankYouToken.getAddress();
    console.log("✅ RedDragonThankYouTokenMulti deployed to:", thankYouTokenAddress);
    
    // Save the address to deployment file
    addresses.thankYouToken = thankYouTokenAddress;
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    console.log(`📝 Saved ThankYouToken address to ${deploymentFile}`);
    
    // Set up the token in the lottery
    console.log("\n🔄 Setting thank you token in lottery contract...");
    const lottery = await hre.ethers.getContractAt("RedDragonSwapLottery", lotteryAddress);
    
    // Get the owner of the lottery
    const [signer] = await hre.ethers.getSigners();
    const lotteryOwner = await lottery.owner();
    
    if (lotteryOwner.toLowerCase() !== signer.address.toLowerCase()) {
      console.error("❌ Signer does not have owner access to Lottery");
      console.log(`   Owner: ${lotteryOwner}`);
      console.log(`   Signer: ${signer.address}`);
      console.log("   Please run this part of the script with the owner's private key");
    } else {
      // Set the thank you token in the lottery
      const tx = await lottery.setThankYouToken(thankYouTokenAddress);
      console.log(`   Transaction sent: ${tx.hash}`);
      
      await tx.wait();
      console.log("✅ ThankYouToken set in lottery contract");
    }
    
    console.log("\n🎮 To mint thank you tokens for recipients, run:");
    console.log(`npx hardhat run scripts/mint-thank-you-tokens.js --network sonic`);
    
    console.log("\n🎉 RedDragonThankYouToken deployment complete!");
    
  } catch (error) {
    console.error("❌ Error during deployment:", error.message);
    if (error.message.includes("Contract source file not found")) {
      console.error("Make sure the original RedDragonThankYouToken.sol file exists in the contracts directory");
    }
    process.exit(1);
  }
}

// Run the deployment function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 