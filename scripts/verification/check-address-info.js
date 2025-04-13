const hre = require("hardhat");
require("dotenv").config();

/**
 * Verify minimal address information
 */
async function main() {
  console.log("🔍 Checking minimal address information...");
  
  const ADDRESS = "0xc59944C9AFe9eA9c87b21dBb3D753c5D1ccCF978";

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);

    // Check contract code existence
    console.log("\n📜 Checking contract code...");
    const code = await deployer.provider.getCode(ADDRESS);
    if (code === "0x") {
      console.log("❌ No contract exists at this address!");
      return;
    } else {
      console.log("✅ Contract exists at this address");
      console.log("Code size:", Math.floor((code.length - 2) / 2), "bytes");
    }

    // Try known interfaces
    console.log("\n🧪 Testing various interfaces...");

    // Basic contract info
    const interfaces = [
      // Standard ERC20
      { name: "ERC20 name", signature: "0x06fdde03" },
      { name: "ERC20 symbol", signature: "0x95d89b41" },
      { name: "ERC20 decimals", signature: "0x313ce567" },
      { name: "ERC20 totalSupply", signature: "0x18160ddd" },
      { name: "ERC20 balanceOf", signature: "0x70a08231" },
      { name: "ERC20 transfer", signature: "0xa9059cbb" },
      
      // LP Token specific
      { name: "LP token0", signature: "0x0dfe1681" },
      { name: "LP token1", signature: "0xd21220a7" },
      { name: "LP getReserves", signature: "0x0902f1ac" },
      
      // Balancer/Beethoven
      { name: "Balancer getPoolId", signature: "0x38fff2d0" },
      { name: "Balancer getNormalizedWeights", signature: "0xf89f27f1" },
      { name: "Balancer getVault", signature: "0x8d928af8" },
      
      // ve8020 related
      { name: "ve balanceOfAt", signature: "0x4ee2cd7e" },
      { name: "ve totalSupplyAt", signature: "0x981b24d0" },
      { name: "ve epoch", signature: "0x900cf0cf" },
      { name: "ve locked", signature: "0xcbf9fe5c" },
      
      // Custom Sonic/Shadow functions (if known)
      { name: "isShadowLpToken", signature: "0xb9e795d7" },
      { name: "isSonicLpToken", signature: "0xe5c9f014" }
    ];
    
    console.log("Checking function selectors in contract code:");
    let supportedInterfaces = [];
    
    for (const iface of interfaces) {
      if (code.includes(iface.signature.substring(2))) {
        console.log(`✅ ${iface.name}: Supported (${iface.signature})`);
        supportedInterfaces.push(iface.name);
      } else {
        console.log(`❌ ${iface.name}: Not supported (${iface.signature})`);
      }
    }
    
    if (supportedInterfaces.length > 0) {
      console.log("\n🔍 Contract appears to support these interfaces:");
      supportedInterfaces.forEach(iface => console.log(`- ${iface}`));
    } else {
      console.log("\n❓ Contract doesn't appear to support any of the tested interfaces");
      console.log("This might be a custom contract or a proxy contract");
    }
    
    // Check for block explorer URL
    if (hre.network.config.explorer) {
      console.log(`\n🔎 Check the contract on the block explorer: ${hre.network.config.explorer}/address/${ADDRESS}`);
    } else {
      console.log(`\n🔎 Check the contract on a Sonic blockchain explorer for more details: address/${ADDRESS}`);
    }
    
    console.log("\n✅ Basic address check complete!");
  } catch (error) {
    console.error("❌ Check failed:", error);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 