const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Alternative verification for Balancer/Beethoven pool tokens
 */
async function main() {
  console.log("🔍 Verifying Balancer V2 80/20 pool (alternative approach)...");
  
  const POOL_ADDRESS = "0xc59944C9AFe9eA9c87b21dBb3D753c5D1ccCF978";

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);

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

    // Try with alternative Balancer V2 ABIs
    // WeightedPool
    const weightedPoolAbi = [
      // Basic ERC20 functions
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)",
      "function totalSupply() view returns (uint256)",
      "function balanceOf(address) view returns (uint256)",
      
      // Weighted Pool specific functions
      "function getPoolId() view returns (bytes32)",
      "function getNormalizedWeights() view returns (uint256[])",
      "function getSwapFeePercentage() view returns (uint256)",
      "function getOwner() view returns (address)",
      "function getVault() view returns (address)"
    ];
    
    const pool = new hre.ethers.Contract(
      POOL_ADDRESS,
      weightedPoolAbi,
      deployer
    );

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

    // Try connecting to the Balancer Vault to get pool tokens
    try {
      const poolId = await pool.getPoolId();
      console.log("\n📊 Balancer Pool Details:");
      console.log("Pool ID:", poolId);
      
      // Get the vault address
      const vaultAddress = await pool.getVault();
      console.log("Vault Address:", vaultAddress);
      
      // Get pool tokens from the vault
      const vaultAbi = [
        "function getPoolTokens(bytes32 poolId) view returns (address[] tokens, uint256[] balances, uint256 lastChangeBlock)"
      ];
      
      const vault = new hre.ethers.Contract(
        vaultAddress,
        vaultAbi,
        deployer
      );
      
      const poolTokens = await vault.getPoolTokens(poolId);
      console.log("\n🔄 Pool Tokens:");
      
      // Get token info
      const erc20Abi = [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)"
      ];
      
      for (let i = 0; i < poolTokens.tokens.length; i++) {
        const tokenContract = new hre.ethers.Contract(
          poolTokens.tokens[i],
          erc20Abi,
          deployer
        );
        
        try {
          const name = await tokenContract.name();
          const symbol = await tokenContract.symbol();
          const decimals = await tokenContract.decimals();
          const balance = hre.ethers.formatUnits(poolTokens.balances[i], decimals);
          
          console.log(`Token ${i}: ${name} (${symbol})`);
          console.log(`  Address: ${poolTokens.tokens[i]}`);
          console.log(`  Balance in pool: ${balance}`);
        } catch (error) {
          console.log(`Token ${i}: ${poolTokens.tokens[i]}`);
          console.log(`  Error getting token info: ${error.message}`);
        }
      }
      
      // Get normalized weights
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
      
      // Get swap fee
      try {
        const swapFee = await pool.getSwapFeePercentage();
        console.log("\n💸 Swap Fee: ", Number(hre.ethers.formatUnits(swapFee, 16)).toFixed(2), "%");
      } catch (error) {
        console.log("❌ Error getting swap fee:", error.message);
      }
      
    } catch (error) {
      console.log("❌ Error getting pool details from vault:", error.message);
    }
    
    // Check pool type using patterns
    if (code.length > 100) {
      console.log("\n🔍 Checking pool type based on bytecode...");
      if (code.includes("WeightedPool2Tokens")) {
        console.log("Pattern match: Likely a WeightedPool2Tokens (80/20 or similar)");
      } else if (code.includes("WeightedPool")) {
        console.log("Pattern match: Likely a WeightedPool");
      } else if (code.includes("StablePool")) {
        console.log("Pattern match: Likely a StablePool");
      } else {
        console.log("No specific pool pattern detected in bytecode");
      }
    }
    
    // Check DEAD address balance
    try {
      const burnAddress = "0x000000000000000000000000000000000000dEaD";
      const burnBalance = await pool.balanceOf(burnAddress);
      
      console.log("\n📈 LP Token Burn Information:");
      console.log("DEAD Address Balance:", hre.ethers.formatUnits(burnBalance, 18));
      
      const totalSupply = await pool.totalSupply();
      if (totalSupply > 0 && burnBalance > 0) {
        const burnPercentage = (burnBalance * BigInt(10000)) / totalSupply;
        console.log(`Burned percentage: ${(Number(burnPercentage) / 100).toFixed(2)}%`);
      }
    } catch (error) {
      console.log("❌ Error getting burn balance:", error.message);
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