// SPDX-License-Identifier: MIT
const hre = require("hardhat");
const { ethers } = require("hardhat");
const helpers = require("./helpers");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Using account:", deployer.address);

    // Get contract addresses from deployment
    const tokenAddress = process.env.TOKEN_ADDRESS;
    if (!tokenAddress) {
        throw new Error("TOKEN_ADDRESS not set in .env");
    }

    const token = await ethers.getContractAt("RedDragon", tokenAddress);

    // Check current ownership
    console.log("\nChecking ownership status...");
    const owner = await token.owner();
    console.log("Current owner:", owner);
    console.log("Deployer address:", deployer.address);
    console.log("Is deployer owner:", owner.toLowerCase() === deployer.address.toLowerCase());

    // Check if trading is enabled
    const tradingEnabled = await token.tradingEnabled();
    console.log("\nTrading status:");
    console.log("Trading enabled:", tradingEnabled);
    console.log("Trading enabled permanently:", await token.tradingEnabledPermanently());

    // Check if ownership can be renounced
    if (owner.toLowerCase() === deployer.address.toLowerCase()) {
        console.log("\nOwnership can be renounced");
        console.log("To renounce ownership, run this script with RENOUNCE=true");
        
        if (process.env.RENOUNCE === "true") {
            console.log("\nRenouncing ownership...");
            const tx = await token.renounceOwnership();
            await tx.wait();
            console.log("Ownership renounced successfully");
            
            // Verify ownership was renounced
            const newOwner = await token.owner();
            console.log("New owner:", newOwner);
            console.log("Is owner zero address:", newOwner === ethers.constants.AddressZero);
        }
    } else {
        console.log("\nCannot renounce ownership - deployer is not the owner");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 