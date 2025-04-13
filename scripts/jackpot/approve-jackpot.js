const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Approve the RedDragonSwapLottery contract to spend wrappedSonic tokens
 */
async function main() {
  // Check for amount argument
  const args = process.argv.slice(2);
  let amount = "100";
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--amount" && i + 1 < args.length) {
      amount = args[i + 1];
      break;
    }
  }
  
  console.log(`🔑 Approving lottery to spend ${amount} wS tokens...`);

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);

    // Load deployment addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    let addresses = {};
    
    try {
      if (fs.existsSync(deploymentFile)) {
        addresses = JSON.parse(fs.readFileSync(deploymentFile));
        console.log("📝 Loaded deployment addresses");
      } else {
        console.error("❌ No deployment addresses file found");
        return;
      }
    } catch (error) {
      console.error("❌ Error loading deployment addresses:", error);
      return;
    }

    // Check if required addresses exist
    if (!addresses.lottery) {
      console.error("❌ Lottery address not found!");
      return;
    }
    
    if (!addresses.wrappedSonic) {
      console.error("❌ WrappedSonic token address not found!");
      return;
    }

    // Connect to wrapped Sonic token
    const tokenAbi = [
      "function approve(address spender, uint256 amount) external returns (bool)",
      "function allowance(address owner, address spender) view returns (uint256)",
      "function balanceOf(address account) view returns (uint256)",
      "function decimals() view returns (uint8)"
    ];
    
    const wrappedSonic = new hre.ethers.Contract(
      addresses.wrappedSonic,
      tokenAbi,
      deployer
    );

    // Check user's wS balance
    const balance = await wrappedSonic.balanceOf(deployer.address);
    const decimals = await wrappedSonic.decimals();
    console.log("💰 Your wS balance:", hre.ethers.formatUnits(balance, decimals), "wS");
    
    // Check current allowance
    const currentAllowance = await wrappedSonic.allowance(deployer.address, addresses.lottery);
    console.log("🔍 Current allowance:", hre.ethers.formatUnits(currentAllowance, decimals), "wS");
    
    // Approve the lottery to spend tokens
    const amountToApprove = hre.ethers.parseUnits(amount, decimals);
    
    if (balance < amountToApprove) {
      console.error("❌ Insufficient wS balance for the requested approval amount!");
      console.log(`You have ${hre.ethers.formatUnits(balance, decimals)} wS but are trying to approve ${amount} wS`);
      return;
    }
    
    console.log(`⚙️ Approving lottery (${addresses.lottery}) to spend ${amount} wS...`);
    const tx = await wrappedSonic.approve(addresses.lottery, amountToApprove);
    console.log("⏳ Transaction sent:", tx.hash);
    await tx.wait();
    console.log("✅ Approval successful!");
    
    // Verify the new allowance
    const newAllowance = await wrappedSonic.allowance(deployer.address, addresses.lottery);
    console.log("🔍 New allowance:", hre.ethers.formatUnits(newAllowance, decimals), "wS");
    
    console.log("\n📝 Next steps:");
    console.log(`Run: npx hardhat --network sonic run scripts/add-to-jackpot.js --amount ${amount}`);

  } catch (error) {
    console.error("❌ Approval failed:", error);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 