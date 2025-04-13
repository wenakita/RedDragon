const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Verify basic ERC20 token details
 */
async function main() {
  console.log("🔍 Verifying basic token details...");
  
  const TOKEN_ADDRESS = "0xc59944C9AFe9eA9c87b21dBb3D753c5D1ccCF978";

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);

    // Connect to token with minimal ERC20 interface
    const tokenAbi = [
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)",
      "function totalSupply() view returns (uint256)",
      "function balanceOf(address) view returns (uint256)"
    ];
    
    const token = new hre.ethers.Contract(
      TOKEN_ADDRESS,
      tokenAbi,
      deployer
    );

    // Get basic token info
    console.log("\n📊 Token Information:");
    console.log("Address:", TOKEN_ADDRESS);
    
    // Try each function separately to identify which ones work
    try {
      const name = await token.name();
      console.log("Name:", name);
    } catch (error) {
      console.log("❌ Error getting name:", error.message);
    }
    
    try {
      const symbol = await token.symbol();
      console.log("Symbol:", symbol);
    } catch (error) {
      console.log("❌ Error getting symbol:", error.message);
    }
    
    try {
      const decimals = await token.decimals();
      console.log("Decimals:", decimals);
    } catch (error) {
      console.log("❌ Error getting decimals:", error.message);
    }
    
    try {
      const totalSupply = await token.totalSupply();
      console.log("Total Supply:", hre.ethers.formatUnits(totalSupply, 18)); // Assuming 18 decimals
    } catch (error) {
      console.log("❌ Error getting total supply:", error.message);
    }
    
    try {
      const deployerBalance = await token.balanceOf(deployer.address);
      console.log("Your Balance:", hre.ethers.formatUnits(deployerBalance, 18)); // Assuming 18 decimals
    } catch (error) {
      console.log("❌ Error getting balance:", error.message);
    }
    
    try {
      // Check DEAD address balance
      const burnAddress = "0x000000000000000000000000000000000000dEaD";
      const burnBalance = await token.balanceOf(burnAddress);
      console.log("DEAD Address Balance:", hre.ethers.formatUnits(burnBalance, 18)); // Assuming 18 decimals
    } catch (error) {
      console.log("❌ Error getting DEAD address balance:", error.message);
    }

    console.log("\n✅ Basic token verification complete!");
    
    // Check contract code
    console.log("\n📜 Checking contract code...");
    const code = await deployer.provider.getCode(TOKEN_ADDRESS);
    if (code === "0x") {
      console.log("❌ No contract exists at this address!");
    } else {
      console.log("✅ Contract exists at this address");
      console.log("Code size:", Math.floor((code.length - 2) / 2), "bytes");
    }
    
  } catch (error) {
    console.error("❌ Verification failed:", error);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 