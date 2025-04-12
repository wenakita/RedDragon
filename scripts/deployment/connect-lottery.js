const hre = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("🔗 Connecting PaintSwap Lottery to RedDragon token...");

    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("\n🔑 Connected account:", deployer.address);

    try {
        // Load deployment addresses
        const addresses = JSON.parse(fs.readFileSync('deployment-addresses.json'));
        
        console.log("\n📋 Contract Addresses:");
        console.log("- RedDragon Token:", addresses.redDragon);
        console.log("- PaintSwap Lottery:", addresses.lottery);

        // Get contract instances
        const redDragon = await hre.ethers.getContractAt("RedDragon", addresses.redDragon);
        const lottery = await hre.ethers.getContractAt("RedDragonPaintSwap", addresses.lottery);

        // Check current lottery address
        const currentLotteryAddress = await redDragon.lotteryContractAddress();
        if (currentLotteryAddress !== "0x0000000000000000000000000000000000000000") {
            console.log("\n⚠️ Warning: Lottery is already connected");
            console.log("- Current lottery address:", currentLotteryAddress);
            console.log("- New lottery address:", addresses.lottery);
            
            if (currentLotteryAddress.toLowerCase() === addresses.lottery.toLowerCase()) {
                console.log("\n✅ Lottery is already connected correctly");
                process.exit(0);
            }
            
            console.log("\n⚠️ Different lottery address detected");
            console.log("Type 'CONFIRM' to proceed with reconnection:");
            
            const readline = require('readline').createInterface({
                input: process.stdin,
                output: process.stdout
            });

            readline.question('> ', async (answer) => {
                if (answer !== 'CONFIRM') {
                    console.log("❌ Lottery connection cancelled");
                    process.exit(0);
                }

                readline.close();
                await connectLottery(redDragon, addresses.lottery);
            });
        } else {
            await connectLottery(redDragon, addresses.lottery);
        }
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

async function connectLottery(redDragon, lotteryAddress) {
    try {
        console.log("\n🔄 Connecting lottery...");
        const tx = await redDragon.setLotteryAddress(lotteryAddress);
        await tx.wait();
        
        // Verify connection
        const newLotteryAddress = await redDragon.lotteryContractAddress();
        if (newLotteryAddress.toLowerCase() === lotteryAddress.toLowerCase()) {
            console.log("\n✅ Lottery successfully connected!");
        } else {
            console.error("❌ Error: Lottery connection failed");
            process.exit(1);
        }
    } catch (error) {
        console.error("❌ Error connecting lottery:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 