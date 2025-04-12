const hre = require("hardhat");

async function main() {
    console.log("🐉 Starting RedDragon Contracts Deployment...");

    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("\n👤 Deploying contracts with account:", deployer.address);

    // Deploy RedDragon token
    console.log("\n📦 1. Deploying RedDragon Token...");
    const RedDragon = await hre.ethers.getContractFactory("RedDragon");
    const redDragon = await RedDragon.deploy(
        process.env.JACKPOT_VAULT_ADDRESS || deployer.address, // jackpotAddress
        process.env.LIQUIDITY_ADDRESS || deployer.address, // liquidityAddress
        process.env.BURN_ADDRESS || "0x000000000000000000000000000000000000dEaD", // burnAddress
        process.env.DEVELOPMENT_ADDRESS || deployer.address, // developmentAddress
        "0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38" // wrappedSonicAddress
    );
    
    // Wait for deployment to complete
    await redDragon.waitForDeployment();
    const redDragonAddress = await redDragon.getAddress();
    console.log("✅ RedDragon Token deployed to:", redDragonAddress);

    // Deploy PaintSwap Verifier
    console.log("\n📦 2. Deploying PaintSwap Verifier...");
    const RedDragonPaintSwapVerifier = await hre.ethers.getContractFactory("RedDragonPaintSwapVerifier");
    const verifier = await RedDragonPaintSwapVerifier.deploy();
    
    // Wait for deployment to complete
    await verifier.waitForDeployment();
    const verifierAddress = await verifier.getAddress();
    console.log("✅ PaintSwap Verifier deployed to:", verifierAddress);

    // Deploy PaintSwap Lottery
    console.log("\n📦 3. Deploying PaintSwap Lottery...");
    const RedDragonPaintSwap = await hre.ethers.getContractFactory("RedDragonSwapLottery");
    const lottery = await RedDragonPaintSwap.deploy(
        process.env.WRAPPED_SONIC_ADDRESS, // wS address
        verifierAddress                     // verifier address
    );
    
    // Wait for deployment to complete
    await lottery.waitForDeployment();
    const lotteryAddress = await lottery.getAddress();
    console.log("✅ PaintSwap Lottery deployed to:", lotteryAddress);

    // Set lottery address in token
    console.log("\n🔧 Setting lottery address in token...");
    try {
        const tx = await redDragon.setLotteryAddress(lotteryAddress);
        await tx.wait();
        console.log("✅ Lottery address set in token");
    } catch (error) {
        console.error("❌ Failed to set lottery address:", error.message);
        throw error;
    }

    // Save deployment addresses
    const addresses = {
        redDragon: redDragonAddress,
        jackpotVault: process.env.JACKPOT_VAULT_ADDRESS || deployer.address,
        liquidityVault: process.env.LIQUIDITY_ADDRESS || deployer.address,
        developmentVault: process.env.DEVELOPMENT_ADDRESS || deployer.address,
        burnAddress: process.env.BURN_ADDRESS || "0x000000000000000000000000000000000000dEaD",
        wrappedSonic: "0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38",
        verifier: verifierAddress,
        lottery: lotteryAddress,
        router: "0x1D368773735ee1E678950B7A97bcA2CafB330CDc",
        factory: "0x2dA25E7446A70D7be65fd4c053948BEcAA6374c8"
    };

    const fs = require('fs');
    fs.writeFileSync('deployment-addresses-sonic.json', JSON.stringify(addresses, null, 2));

    console.log("\n🎉 Deployment completed successfully!");
    console.log("\n📝 Contract addresses:");
    console.log("- RedDragon Token:", redDragonAddress);
    console.log("- PaintSwap Verifier:", verifierAddress);
    console.log("- PaintSwap Lottery:", lotteryAddress);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 