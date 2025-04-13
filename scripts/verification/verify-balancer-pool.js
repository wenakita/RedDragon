const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Verify Balancer/Beethoven pool token details
 */
async function main() {
  console.log("🔍 Verifying Balancer/Beethoven 80/20 pool...");
  
  const POOL_ADDRESS = "0xc59944C9AFe9eA9c87b21dBb3D753c5D1ccCF978";

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);

    // Connect to pool with Balancer-specific interface
    const poolAbi = [
      // Basic ERC20 functions
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)",
      "function totalSupply() view returns (uint256)",
      "function balanceOf(address) view returns (uint256)",
      
      // Balancer-specific functions
      "function getPoolId() view returns (bytes32)",
      "function getNormalizedWeights() view returns (uint256[])",
      "function getVault() view returns (address)",
      "function getSwapFeePercentage() view returns (uint256)",
      "function getOwner() view returns (address)",
      "function getTokens() view returns (address[])"
    ];
    
    const pool = new hre.ethers.Contract(
      POOL_ADDRESS,
      poolAbi,
      deployer
    );

    // Check contract code existence
    console.log("\n📜 Checking contract code...");
    const code = await deployer.provider.getCode(POOL_ADDRESS);
    if (code === "0x") {
      console.log("❌ No contract exists at this address!");
      return;
    } else {
      console.log("✅ Contract exists at this address");
      console.log("Code size:", Math.floor((code.length - 2) / 2), "bytes");
    }

    // Get basic token info
    console.log("\n📊 Pool Token Information:");
    console.log("Address:", POOL_ADDRESS);
    
    try {
      const name = await pool.name();
      console.log("Name:", name);
    } catch (error) {
      console.log("❌ Error getting name:", error.message);
    }
    
    try {
      const symbol = await pool.symbol();
      console.log("Symbol:", symbol);
    } catch (error) {
      console.log("❌ Error getting symbol:", error.message);
    }
    
    try {
      const decimals = await pool.decimals();
      console.log("Decimals:", decimals);
    } catch (error) {
      console.log("❌ Error getting decimals:", error.message);
    }
    
    try {
      const totalSupply = await pool.totalSupply();
      console.log("Total Supply:", hre.ethers.formatUnits(totalSupply, 18));
    } catch (error) {
      console.log("❌ Error getting total supply:", error.message);
    }

    // Try Balancer-specific functions
    try {
      const poolId = await pool.getPoolId();
      console.log("\n📊 Balancer Pool Details:");
      console.log("Pool ID:", poolId);
    } catch (error) {
      console.log("❌ Error getting pool ID:", error.message);
    }
    
    try {
      const tokens = await pool.getTokens();
      console.log("Pool Tokens:", tokens);
      
      // Get token info
      const erc20Abi = ["function name() view returns (string)", "function symbol() view returns (string)"];
      
      console.log("\n🔄 Token Details:");
      for (let i = 0; i < tokens.length; i++) {
        try {
          const tokenContract = new hre.ethers.Contract(tokens[i], erc20Abi, deployer);
          const tokenName = await tokenContract.name();
          const tokenSymbol = await tokenContract.symbol();
          console.log(`Token ${i}: ${tokenName} (${tokenSymbol}) - ${tokens[i]}`);
        } catch (error) {
          console.log(`Token ${i}: ${tokens[i]} - Error: ${error.message}`);
        }
      }
    } catch (error) {
      console.log("❌ Error getting tokens:", error.message);
    }
    
    try {
      const weights = await pool.getNormalizedWeights();
      console.log("\n⚖️ Token Weights:");
      for (let i = 0; i < weights.length; i++) {
        const percentage = Number(hre.ethers.formatUnits(weights[i], 18)) * 100;
        console.log(`Token ${i} Weight: ${percentage.toFixed(2)}%`);
      }
    } catch (error) {
      console.log("❌ Error getting normalized weights:", error.message);
    }
    
    try {
      const swapFee = await pool.getSwapFeePercentage();
      console.log("\n💸 Swap Fee: ", Number(hre.ethers.formatUnits(swapFee, 16)).toFixed(2), "%");
    } catch (error) {
      console.log("❌ Error getting swap fee:", error.message);
    }
    
    try {
      const vault = await pool.getVault();
      console.log("\n🏦 Vault Address:", vault);
    } catch (error) {
      console.log("❌ Error getting vault:", error.message);
    }
    
    try {
      const owner = await pool.getOwner();
      console.log("\n👤 Pool Owner:", owner);
    } catch (error) {
      console.log("❌ Error getting owner:", error.message);
    }
    
    // Check DEAD address balance and deployer balance
    try {
      const burnAddress = "0x000000000000000000000000000000000000dEaD";
      const burnBalance = await pool.balanceOf(burnAddress);
      console.log("\n📈 Balance Information:");
      console.log("DEAD Address Balance:", hre.ethers.formatUnits(burnBalance, 18));
      
      const deployerBalance = await pool.balanceOf(deployer.address);
      console.log("Your Balance:", hre.ethers.formatUnits(deployerBalance, 18));
      
      // Check token balance and percentage
      const totalSupply = await pool.totalSupply();
      if (totalSupply > 0 && burnBalance > 0) {
        const burnPercentage = (burnBalance * BigInt(10000)) / totalSupply;
        console.log(`Burned percentage: ${(Number(burnPercentage) / 100).toFixed(2)}%`);
      }
    } catch (error) {
      console.log("❌ Error getting balances:", error.message);
    }

    console.log("\n✅ Balancer pool verification complete!");
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