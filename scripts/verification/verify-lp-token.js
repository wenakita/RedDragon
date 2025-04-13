const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Verify the LP token details
 */
async function main() {
  console.log("🔍 Verifying LP token details...");
  
  const LP_TOKEN_ADDRESS = "0xc59944C9AFe9eA9c87b21dBb3D753c5D1ccCF978";

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);

    // Connect to LP token
    const lpTokenAbi = [
      "function token0() view returns (address)",
      "function token1() view returns (address)",
      "function totalSupply() view returns (uint256)",
      "function balanceOf(address) view returns (uint256)",
      "function getReserves() view returns (uint112, uint112, uint32)",
      "function factory() view returns (address)",
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)"
    ];
    
    const lpToken = new hre.ethers.Contract(
      LP_TOKEN_ADDRESS,
      lpTokenAbi,
      deployer
    );

    // Get basic token info
    console.log("\n📊 LP Token Information:");
    console.log("Address:", LP_TOKEN_ADDRESS);
    
    try {
      const name = await lpToken.name();
      const symbol = await lpToken.symbol();
      const decimals = await lpToken.decimals();
      
      console.log("Name:", name);
      console.log("Symbol:", symbol);
      console.log("Decimals:", decimals);
    } catch (error) {
      console.log("❌ Error getting token info:", error.message);
    }

    // Get token pair
    try {
      const token0 = await lpToken.token0();
      const token1 = await lpToken.token1();
      
      console.log("\n🔄 Token Pair:");
      console.log("Token0:", token0);
      console.log("Token1:", token1);
      
      // Get token names
      const erc20Abi = ["function name() view returns (string)", "function symbol() view returns (string)"];
      
      const token0Contract = new hre.ethers.Contract(token0, erc20Abi, deployer);
      const token1Contract = new hre.ethers.Contract(token1, erc20Abi, deployer);
      
      const token0Name = await token0Contract.name();
      const token0Symbol = await token0Contract.symbol();
      const token1Name = await token1Contract.name();
      const token1Symbol = await token1Contract.symbol();
      
      console.log(`Token0: ${token0Name} (${token0Symbol})`);
      console.log(`Token1: ${token1Name} (${token1Symbol})`);
    } catch (error) {
      console.log("❌ Error getting token pair:", error.message);
    }

    // Get reserves
    try {
      const reserves = await lpToken.getReserves();
      console.log("\n💰 Reserves:");
      console.log("Reserve0:", hre.ethers.formatUnits(reserves[0], 18));
      console.log("Reserve1:", hre.ethers.formatUnits(reserves[1], 18));
      console.log("Last update timestamp:", reserves[2]);
    } catch (error) {
      console.log("❌ Error getting reserves:", error.message);
    }

    // Get total supply
    try {
      const totalSupply = await lpToken.totalSupply();
      console.log("\n📈 Supply Information:");
      console.log("Total Supply:", hre.ethers.formatUnits(totalSupply, 18));
      
      // Check if there's a balance in the burn address
      const burnAddress = "0x000000000000000000000000000000000000dEaD";
      const burnBalance = await lpToken.balanceOf(burnAddress);
      
      console.log("Burned LP tokens:", hre.ethers.formatUnits(burnBalance, 18));
      
      if (totalSupply > 0) {
        const burnPercentage = (burnBalance * BigInt(10000)) / totalSupply;
        console.log(`Burned percentage: ${(Number(burnPercentage) / 100).toFixed(2)}%`);
      }
      
      // Check if RedDragon token has been specified
      if (fs.existsSync("deployment-addresses-sonic.json")) {
        const addresses = JSON.parse(fs.readFileSync("deployment-addresses-sonic.json"));
        
        if (addresses.redDragon) {
          const tokenBalance = await lpToken.balanceOf(addresses.redDragon);
          console.log("RedDragon token balance:", hre.ethers.formatUnits(tokenBalance, 18));
        }
      }
    } catch (error) {
      console.log("❌ Error getting supply info:", error.message);
    }

    // Get factory
    try {
      const factory = await lpToken.factory();
      console.log("\n🏭 Factory Address:", factory);
      
      // Check if it matches the expected factory
      const expectedFactory = process.env.SHADOW_DEX_FACTORY;
      if (expectedFactory && factory.toLowerCase() === expectedFactory.toLowerCase()) {
        console.log("✅ Factory matches the expected Shadow DEX factory");
      } else if (expectedFactory) {
        console.log("⚠️ Factory does not match the expected Shadow DEX factory:");
        console.log("  Expected:", expectedFactory);
        console.log("  Actual:", factory);
      }
    } catch (error) {
      console.log("❌ Error getting factory:", error.message);
    }

    console.log("\n✅ LP token verification complete!");
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