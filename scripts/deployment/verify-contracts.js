const { run, ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Starting contract verification...");

  try {
    // Get network info
    const network = await ethers.provider.getNetwork();
    console.log("\n🌐 Network:", network.name, "(Chain ID:", network.chainId, ")");

    // Load deployment addresses based on network
    const networkName = network.name === "unknown" ? "sonic" : network.name;
    const addressesFile = `deployment-addresses-${networkName}.json`;
    
    if (!fs.existsSync(addressesFile)) {
      throw new Error(`Deployment addresses file not found for ${networkName}`);
    }

    const addresses = JSON.parse(fs.readFileSync(addressesFile));

    // Verify RedDragon contract
    console.log("\nVerifying RedDragon contract...");
    try {
      await run("verify:verify", {
        address: addresses.redDragon,
        constructorArguments: [
          addresses.wrappedSonic,
          addresses.router,
          addresses.factory
        ],
      });
      console.log("✅ RedDragon contract verified successfully");
    } catch (error) {
      console.error("❌ Error verifying RedDragon contract:", error.message);
    }

    // Verify JackpotVault contract
    console.log("\nVerifying JackpotVault contract...");
    try {
      await run("verify:verify", {
        address: addresses.jackpotVault,
        constructorArguments: [
          addresses.redDragon,
          addresses.wrappedSonic
        ],
      });
      console.log("✅ JackpotVault contract verified successfully");
    } catch (error) {
      console.error("❌ Error verifying JackpotVault contract:", error.message);
    }

    // Verify PaintSwapVerifier contract
    console.log("\nVerifying PaintSwapVerifier contract...");
    try {
      await run("verify:verify", {
        address: addresses.verifier,
        constructorArguments: [
          addresses.redDragon,
          addresses.wrappedSonic,
          addresses.router
        ],
      });
      console.log("✅ PaintSwapVerifier contract verified successfully");
    } catch (error) {
      console.error("❌ Error verifying PaintSwapVerifier contract:", error.message);
    }

    // Verify PaintSwap contract
    console.log("\nVerifying PaintSwap contract...");
    try {
      await run("verify:verify", {
        address: addresses.lottery,
        constructorArguments: [
          addresses.redDragon,
          addresses.wrappedSonic,
          addresses.jackpotVault,
          addresses.verifier
        ],
      });
      console.log("✅ PaintSwap contract verified successfully");
    } catch (error) {
      console.error("❌ Error verifying PaintSwap contract:", error.message);
    }

    console.log("\n✅ Contract verification process completed!");
  } catch (error) {
    console.error("❌ Fatal error during verification:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 