const { ethers } = require("hardhat");
const { SHADOW_FACTORY, SHADOW_ROUTER, WRAPPED_SONIC_ADDRESS } = require("../addresses.js");
const fs = require("fs");

async function main() {
    console.log("🔍 Verifying deployment configuration...");

    // Get network info
    const network = await ethers.provider.getNetwork();
    console.log("\n🌐 Network:", network.name, "(Chain ID:", network.chainId, ")");

    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log("\n🔑 Connected account:", deployer.address);

    try {
        // Load deployment addresses based on network
        const networkName = network.name === "unknown" ? "sonic" : network.name;
        const addressesFile = `deployment-addresses-${networkName}.json`;
        
        if (!fs.existsSync(addressesFile)) {
            throw new Error(`Deployment addresses file not found for ${networkName}`);
        }

        const addresses = JSON.parse(fs.readFileSync(addressesFile));
        
        console.log("\n📋 Contract Addresses:");
        console.log("- RedDragon Token:", addresses.redDragon);
        console.log("- Jackpot Vault:", addresses.jackpotVault);
        console.log("- PaintSwap Verifier:", addresses.verifier);
        console.log("- PaintSwap Lottery:", addresses.lottery);
        console.log("- Pair Address:", addresses.pair || "Not set");

        // Get contract instances
        const redDragon = await ethers.getContractFactory("RedDragon").attach(addresses.redDragon);
        const jackpotVault = await ethers.getContractAt("RedDragonJackpotVault", addresses.jackpotVault);
        const verifier = await ethers.getContractAt("RedDragonPaintSwapVerifier", addresses.verifier);
        const lottery = await ethers.getContractAt("RedDragonPaintSwap", addresses.lottery);

        // Check trading status
        console.log("\n📊 Checking trading status...");
        const tradingEnabled = await redDragon.tradingEnabled();
        const tradingEnabledPermanently = await redDragon.tradingEnabledPermanently();
        console.log("- Trading enabled:", tradingEnabled ? "✅ Yes" : "❌ No");
        console.log("- Trading enabled permanently:", tradingEnabledPermanently ? "✅ Yes" : "❌ No");

        // Check exchange pair
        console.log("\n📊 Checking exchange pair...");
        const exchangePair = await redDragon.exchangePair();
        console.log("- Exchange pair set:", exchangePair !== "0x0000000000000000000000000000000000000000" ? "✅ Yes" : "❌ No");
        if (exchangePair !== "0x0000000000000000000000000000000000000000") {
            console.log("- Pair address:", exchangePair);
        }

        // Check lottery connection
        console.log("\n📊 Checking lottery connection...");
        const lotteryAddress = await redDragon.lotteryContractAddress();
        console.log("- Lottery connected:", lotteryAddress !== "0x0000000000000000000000000000000000000000" ? "✅ Yes" : "❌ No");
        if (lotteryAddress !== "0x0000000000000000000000000000000000000000") {
            console.log("- Lottery address:", lotteryAddress);
        }

        // Check PaintSwap Verifier configuration
        console.log("\n📊 Checking PaintSwap Verifier...");
        const verifierOwner = await verifier.owner();
        console.log("- Owner:", verifierOwner);
        console.log("- Is deployer:", verifierOwner.toLowerCase() === deployer.address.toLowerCase() ? "✅ Yes" : "❌ No");

        // Check PaintSwap Lottery configuration
        console.log("\n📊 Checking PaintSwap Lottery...");
        const lotteryOwner = await lottery.owner();
        console.log("- Owner:", lotteryOwner);
        console.log("- Is deployer:", lotteryOwner.toLowerCase() === deployer.address.toLowerCase() ? "✅ Yes" : "❌ No");
        
        const tokenAddress = await lottery.token();
        console.log("- Token address:", tokenAddress);
        console.log("- Matches RedDragon:", tokenAddress.toLowerCase() === addresses.redDragon.toLowerCase() ? "✅ Yes" : "❌ No");
        
        const verifierAddress = await lottery.verifier();
        console.log("- Verifier address:", verifierAddress);
        console.log("- Matches PaintSwap Verifier:", verifierAddress.toLowerCase() === addresses.verifier.toLowerCase() ? "✅ Yes" : "❌ No");

        // Check Jackpot Vault
        console.log("\n📊 Checking Jackpot Vault...");
        const vaultOwner = await jackpotVault.owner();
        console.log("- Owner:", vaultOwner);
        console.log("- Is deployer:", vaultOwner.toLowerCase() === deployer.address.toLowerCase() ? "✅ Yes" : "❌ No");

        // Verify RedDragon contract
        const name = await redDragon.name();
        const symbol = await redDragon.symbol();
        const totalSupply = await redDragon.totalSupply();
        const owner = await redDragon.owner();

        console.log("\nRedDragon Contract Verification:");
        console.log("Name:", name);
        console.log("Symbol:", symbol);
        console.log("Total Supply:", ethers.utils.formatEther(totalSupply));
        console.log("Owner:", owner);

        // Verify initial state
        const wrappedSonic = await redDragon.wrappedSonic();
        const router = await redDragon.router();
        const factory = await redDragon.factory();

        console.log("\nInitial State Verification:");
        console.log("Wrapped Sonic:", wrappedSonic);
        console.log("Router:", router);
        console.log("Factory:", factory);

        // Verify all addresses match
        if (wrappedSonic !== WRAPPED_SONIC_ADDRESS) {
            throw new Error("Wrapped Sonic address mismatch");
        }
        if (router !== SHADOW_ROUTER) {
            throw new Error("Router address mismatch");
        }
        if (factory !== SHADOW_FACTORY) {
            throw new Error("Factory address mismatch");
        }

        console.log("\n✅ Deployment verification completed!");
    } catch (error) {
        console.error("❌ Error during verification:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 