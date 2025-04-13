const hre = require("hardhat");
const fs = require("fs");
require("dotenv").config();

/**
 * Deploy RedDragon with the combined ve8020FeeDistributor approach
 */
async function main() {
  console.log("🚀 Deploying RedDragon with combined ve8020FeeDistributor...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Using account:", deployer.address);

    // Load or create deployment addresses
    const deploymentFile = "deployment-addresses-sonic.json";
    let addresses = {};
    
    try {
      if (fs.existsSync(deploymentFile)) {
        addresses = JSON.parse(fs.readFileSync(deploymentFile));
        console.log("📝 Loaded existing deployment addresses");
      } else {
        console.log("📝 Creating new deployment addresses file");
        addresses = {
          wrappedSonic: process.env.WRAPPED_SONIC_ADDRESS || "0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38",
          router: process.env.ROUTER_ADDRESS || "0x1D368773735ee1E678950B7A97bcA2CafB330CDc",
          factory: process.env.FACTORY_ADDRESS || "0x2dA25E7446A70D7be65fd4c053948BEcAA6374c8",
          burnAddress: process.env.BURN_ADDRESS || "0x000000000000000000000000000000000000dEaD"
        };
      }
    } catch (error) {
      console.error("❌ Error loading deployment addresses:", error.message);
      process.exit(1);
    }

    // Step 1: Deploy ve8020 token if needed
    if (!addresses.ve8020) {
      console.log("\n📦 Deploying ve8020 token...");
      const Ve8020 = await hre.ethers.getContractFactory("ve8020");
      const ve8020 = await Ve8020.deploy();
      await ve8020.deployed();
      addresses.ve8020 = ve8020.address;
      console.log("✅ ve8020 token deployed to:", addresses.ve8020);
      fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));
    } else {
      console.log("👉 Using existing ve8020 token at", addresses.ve8020);
    }

    // Step 2: Deploy JackpotVault
    console.log("\n📦 Deploying JackpotVault...");
    const RedDragonJackpotVault = await hre.ethers.getContractFactory("RedDragonJackpotVault");
    const jackpotVault = await RedDragonJackpotVault.deploy(
      addresses.wrappedSonic,
      deployer.address // Owner temporarily
    );
    await jackpotVault.deployed();
    addresses.jackpotVault = jackpotVault.address;
    console.log("✅ JackpotVault deployed to:", addresses.jackpotVault);
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));

    // Step 3: Deploy Verifier
    if (!addresses.verifier) {
      console.log("\n📦 Deploying PaintSwap Verifier...");
      const RedDragonPaintSwapVerifier = await hre.ethers.getContractFactory("RedDragonPaintSwapVerifier");
      const verifier = await RedDragonPaintSwapVerifier.deploy();
      await verifier.deployed();
      addresses.verifier = verifier.address;
      console.log("✅ PaintSwap Verifier deployed to:", addresses.verifier);
      fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));

      // Configure Verifier
      console.log("\n🔧 Configuring PaintSwap Verifier...");
      const vrfCoordinator = process.env.PAINT_SWAP_VRF_COORDINATOR || "0x3ba925fdeae6b46d0bb4d424d829982cb2f7309e";
      const subscriptionId = process.env.PAINT_SWAP_SUBSCRIPTION_ID || "1";
      const gasLane = process.env.PAINT_SWAP_GAS_LANE || "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f";
      const callbackGasLimit = process.env.PAINT_SWAP_CALLBACK_GAS_LIMIT || "100000";
      const requestConfirmations = process.env.PAINT_SWAP_REQUEST_CONFIRMATIONS || "3";
      
      try {
        const initTx = await verifier.initialize(
          vrfCoordinator,
          subscriptionId,
          gasLane,
          callbackGasLimit,
          requestConfirmations
        );
        await initTx.wait();
        console.log("✅ PaintSwap Verifier configured");
      } catch (error) {
        console.error("❌ Failed to configure verifier:", error.message);
      }
    } else {
      console.log("👉 Using existing verifier at", addresses.verifier);
    }

    // Step 4: Deploy Lottery
    console.log("\n📦 Deploying PaintSwap Lottery...");
    const RedDragonSwapLottery = await hre.ethers.getContractFactory("RedDragonSwapLottery");
    const lottery = await RedDragonSwapLottery.deploy(
      addresses.wrappedSonic,
      addresses.verifier
    );
    await lottery.deployed();
    addresses.lottery = lottery.address;
    console.log("✅ PaintSwap Lottery deployed to:", addresses.lottery);
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));

    // Step 5: Deploy RedDragon Token
    console.log("\n📦 Deploying RedDragon Token...");
    const RedDragon = await hre.ethers.getContractFactory("RedDragon");
    const redDragon = await RedDragon.deploy(
      addresses.jackpotVault,
      addresses.ve8020,  // Initially use ve8020 address, will update later
      addresses.burnAddress,
      addresses.wrappedSonic
    );
    await redDragon.deployed();
    addresses.redDragon = redDragon.address;
    console.log("✅ RedDragon Token deployed to:", addresses.redDragon);
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));

    // Step 6: Deploy Combined Ve8020FeeDistributor
    console.log("\n📦 Deploying combined Ve8020FeeDistributor...");
    const Ve8020FeeDistributor = await hre.ethers.getContractFactory("Ve8020FeeDistributor");
    const feeDistributor = await Ve8020FeeDistributor.deploy(
      addresses.ve8020,
      addresses.redDragon,
      addresses.wrappedSonic,
      addresses.router
    );
    await feeDistributor.deployed();
    addresses.ve8020FeeDistributor = feeDistributor.address;
    console.log("✅ Combined Ve8020FeeDistributor deployed to:", feeDistributor.address);
    fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));

    // Step 7: Configure Contracts
    console.log("\n🔧 Configuring contracts...");

    // Update RedDragon token with proper ve8020FeeDistributor address
    console.log("Setting ve8020 address in RedDragon token...");
    try {
      const setVe8020Tx = await redDragon.setVe8020Address(feeDistributor.address);
      await setVe8020Tx.wait();
      console.log("✅ ve8020 address set in RedDragon token");
    } catch (error) {
      console.error("❌ Failed to set ve8020 address:", error.message);
    }

    // Set JackpotVault to forward to lottery
    console.log("Setting JackpotVault to forward to lottery...");
    try {
      const setForwardTx = await jackpotVault.setForwardAddress(addresses.lottery);
      await setForwardTx.wait();
      console.log("✅ JackpotVault configured to forward to lottery");
    } catch (error) {
      console.error("❌ Failed to set forward address:", error.message);
    }

    // Set RedDragon token in JackpotVault
    console.log("Setting RedDragon token in JackpotVault...");
    try {
      const setTokenTx = await jackpotVault.setTokenAddress(addresses.redDragon);
      await setTokenTx.wait();
      console.log("✅ RedDragon token set in JackpotVault");
    } catch (error) {
      console.error("❌ Failed to set token in JackpotVault:", error.message);
    }

    // Set lottery address in RedDragon token
    console.log("Setting lottery address in RedDragon token...");
    try {
      const setLotteryTx = await redDragon.setLotteryAddress(addresses.lottery);
      await setLotteryTx.wait();
      console.log("✅ Lottery address set in RedDragon token");
    } catch (error) {
      console.error("❌ Failed to set lottery address:", error.message);
    }

    console.log("\n🎉 Deployment completed successfully!");
    console.log("\n📝 Contract addresses:");
    console.log("- ve8020 Token:", addresses.ve8020);
    console.log("- JackpotVault:", addresses.jackpotVault);
    console.log("- RedDragon Token:", addresses.redDragon);
    console.log("- PaintSwap Verifier:", addresses.verifier);
    console.log("- PaintSwap Lottery:", addresses.lottery);
    console.log("- Combined Ve8020FeeDistributor:", addresses.ve8020FeeDistributor);
    
    console.log("\n⚠️ Important Next Steps:");
    console.log("1. Verify all contracts on block explorer");
    console.log("2. Set up exchange pair for the RedDragon token");
    console.log("3. Test the combined fee distribution flow");
  } catch (error) {
    console.error("❌ Deployment error:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Script error:", error);
    process.exit(1);
  }); 