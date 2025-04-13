const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Update RedDragon token fee structure to redirect fees to ve8020
 */
async function main() {
  console.log("⚙️ Updating RedDragon fee structure...");
  
  const TOKEN_ADDRESS = "0x45237fD4F00FB2160005dB659D4dD5B36b77c265";
  const VE_ADDRESS = process.env.VE_ADDRESS;

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);
    console.log("💰 Account balance:", hre.ethers.formatUnits(await deployer.provider.getBalance(deployer.address), 18), "wSONIC");

    // Connect to RedDragon token with owner interface
    const tokenAbi = [
      // Read functions
      "function getDetailedFeeInfo() view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256)",
      "function getContractConfiguration() view returns (address, address, address, address, address, address, address, bool, bool)",
      "function owner() view returns (address)",
      
      // Write functions to update fees/addresses
      "function setFeePercent(uint256 _liquidityFeeBuy, uint256 _jackpotFeeBuy, uint256 _burnFeeBuy, uint256 _developmentFeeBuy, uint256 _liquidityFeeSell, uint256 _jackpotFeeSell, uint256 _burnFeeSell, uint256 _developmentFeeSell) external",
      "function updateFeeAddresses(address _jackpotAddress, address _liquidityAddress, address _developmentAddress) external"
    ];
    
    const token = new hre.ethers.Contract(
      TOKEN_ADDRESS,
      tokenAbi,
      deployer
    );

    // Check if the contract exists
    const code = await deployer.provider.getCode(TOKEN_ADDRESS);
    if (code === "0x") {
      console.error("❌ No contract exists at this address!");
      return;
    }
    console.log("✅ Valid contract at address", TOKEN_ADDRESS);

    // Check if deployer is owner
    const owner = await token.owner();
    console.log("📝 Token owner:", owner);
    
    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.error("❌ You are not the owner of the token!");
      console.log("Current owner:", owner);
      console.log("Your address:", deployer.address);
      return;
    }
    console.log("✅ You are the token owner");

    // Get current fee structure
    const currentFees = await token.getDetailedFeeInfo();
    console.log("\n📊 Current Fee Structure:");
    
    console.log("Buy fees:");
    console.log("- Liquidity:", currentFees[0].toString(), "basis points");
    console.log("- Jackpot:", currentFees[1].toString(), "basis points");
    console.log("- Burn:", currentFees[2].toString(), "basis points");
    console.log("- Development:", currentFees[3].toString(), "basis points");
    console.log("- Total Buy Fee:", currentFees[4].toString(), "basis points");
    
    console.log("\nSell fees:");
    console.log("- Liquidity:", currentFees[5].toString(), "basis points");
    console.log("- Jackpot:", currentFees[6].toString(), "basis points");
    console.log("- Burn:", currentFees[7].toString(), "basis points");
    console.log("- Development:", currentFees[8].toString(), "basis points");
    console.log("- Total Sell Fee:", currentFees[9].toString(), "basis points");

    // Get current fee recipients
    const config = await token.getContractConfiguration();
    console.log("\n📝 Current Fee Recipients:");
    console.log("Jackpot Address:", config[0]);
    console.log("Liquidity Address:", config[1]);
    console.log("Burn Address:", config[2]);
    console.log("Development Address:", config[3]);

    // Get ve8020 FeeDistributor
    let veAddress = VE_ADDRESS;
    
    // If not provided in env, try to get it from deployment file
    if (!veAddress) {
      try {
        if (fs.existsSync("ve8020-deployment.json")) {
          const ve8020Deployment = JSON.parse(fs.readFileSync("ve8020-deployment.json"));
          if (ve8020Deployment.ve8020FeeDistributor) {
            veAddress = ve8020Deployment.ve8020FeeDistributor;
            console.log("📝 Found ve8020FeeDistributor address in deployment file:", veAddress);
          } else if (ve8020Deployment.ve8020) {
            veAddress = ve8020Deployment.ve8020;
            console.log("📝 Found ve8020 address in deployment file:", veAddress);
          }
        }
      } catch (error) {
        console.log("❌ Error loading ve8020 address from file:", error.message);
      }
    }
    
    if (!veAddress) {
      console.log("⚠️ ve8020 address not found! Please enter the address to use for veRDP fees:");
      veAddress = await new Promise(resolve => {
        process.stdin.once('data', data => {
          const input = data.toString().trim();
          resolve(input);
        });
      });
    }
    
    console.log("📝 Using ve address:", veAddress);

    // Calculate new fee structure - redirect liquidity and development fees to ve
    // Keep the same total buy/sell fees but reallocate Liquidity + Development to ve (Liquidity address)
    const newLiquidityFeeBuy = parseInt(currentFees[0]) + parseInt(currentFees[3]); // Liquidity + Development
    const newDevelopmentFeeBuy = 0;
    
    const newLiquidityFeeSell = parseInt(currentFees[5]) + parseInt(currentFees[8]); // Liquidity + Development
    const newDevelopmentFeeSell = 0;
    
    console.log("\n📊 New Fee Structure:");
    console.log("Buy fees:");
    console.log("- Liquidity (ve):", newLiquidityFeeBuy, "basis points");
    console.log("- Jackpot:", currentFees[1].toString(), "basis points");
    console.log("- Burn:", currentFees[2].toString(), "basis points");
    console.log("- Development:", newDevelopmentFeeBuy, "basis points");
    console.log("- Total Buy Fee:", parseInt(newLiquidityFeeBuy) + parseInt(currentFees[1]) + parseInt(currentFees[2]) + parseInt(newDevelopmentFeeBuy), "basis points");
    
    console.log("\nSell fees:");
    console.log("- Liquidity (ve):", newLiquidityFeeSell, "basis points");
    console.log("- Jackpot:", currentFees[6].toString(), "basis points");
    console.log("- Burn:", currentFees[7].toString(), "basis points");
    console.log("- Development:", newDevelopmentFeeSell, "basis points");
    console.log("- Total Sell Fee:", parseInt(newLiquidityFeeSell) + parseInt(currentFees[6]) + parseInt(currentFees[7]) + parseInt(newDevelopmentFeeSell), "basis points");

    // Ask for confirmation
    console.log("\n⚠️ This will update the token's fee structure. Continue? (y/n)");
    const confirmation = await new Promise(resolve => {
      process.stdin.once('data', data => {
        const input = data.toString().trim().toLowerCase();
        resolve(input === 'y' || input === 'yes');
      });
    });
    
    if (!confirmation) {
      console.log("❌ Operation canceled");
      return;
    }

    // Update fee structure
    console.log("\n⚙️ Updating fee structure...");
    const setFeeTx = await token.setFeePercent(
      newLiquidityFeeBuy,
      currentFees[1], // jackpot buy
      currentFees[2], // burn buy
      newDevelopmentFeeBuy,
      newLiquidityFeeSell,
      currentFees[6], // jackpot sell
      currentFees[7], // burn sell
      newDevelopmentFeeSell
    );
    
    console.log("📝 Transaction hash:", setFeeTx.hash);
    console.log("⏳ Waiting for transaction confirmation...");
    await setFeeTx.wait();
    console.log("✅ Fee structure updated successfully");

    // Update fee addresses
    console.log("\n⚙️ Updating fee addresses...");
    const updateAddressesTx = await token.updateFeeAddresses(
      config[0], // Keep jackpot address
      veAddress, // New liquidity address = ve address
      config[3]  // Keep development address
    );
    
    console.log("📝 Transaction hash:", updateAddressesTx.hash);
    console.log("⏳ Waiting for transaction confirmation...");
    await updateAddressesTx.wait();
    console.log("✅ Fee addresses updated successfully");

    // Verify changes
    console.log("\n🔍 Verifying changes...");
    
    const newFees = await token.getDetailedFeeInfo();
    console.log("\n📊 Updated Fee Structure:");
    
    console.log("Buy fees:");
    console.log("- Liquidity (ve):", newFees[0].toString(), "basis points");
    console.log("- Jackpot:", newFees[1].toString(), "basis points");
    console.log("- Burn:", newFees[2].toString(), "basis points");
    console.log("- Development:", newFees[3].toString(), "basis points");
    console.log("- Total Buy Fee:", newFees[4].toString(), "basis points");
    
    console.log("\nSell fees:");
    console.log("- Liquidity (ve):", newFees[5].toString(), "basis points");
    console.log("- Jackpot:", newFees[6].toString(), "basis points");
    console.log("- Burn:", newFees[7].toString(), "basis points");
    console.log("- Development:", newFees[8].toString(), "basis points");
    console.log("- Total Sell Fee:", newFees[9].toString(), "basis points");
    
    const newConfig = await token.getContractConfiguration();
    console.log("\n📝 Updated Fee Recipients:");
    console.log("Jackpot Address:", newConfig[0]);
    console.log("Liquidity (ve) Address:", newConfig[1]);
    console.log("Burn Address:", newConfig[2]);
    console.log("Development Address:", newConfig[3]);

    console.log("\n🎉 Fee structure update complete!");
  } catch (error) {
    console.error("❌ Update failed:", error);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 