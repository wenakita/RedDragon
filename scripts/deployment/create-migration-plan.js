const hre = require("hardhat");
const fs = require('fs');
require("dotenv").config();

/**
 * Create migration plan for token holders
 * This script generates information for helping users migrate from old token to new token
 */
async function main() {
  console.log("📝 Creating migration plan for token holders...");

  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("\n👤 Using account:", deployer.address);
    
    // Load deployment addresses
    const oldDeploymentFile = "deployment-addresses-sonic.json";
    const newDeploymentFile = "deployment-addresses-sonic-new.json";
    
    let oldAddresses = {};
    let newAddresses = {};
    
    try {
      if (fs.existsSync(oldDeploymentFile)) {
        oldAddresses = JSON.parse(fs.readFileSync(oldDeploymentFile));
        console.log("📝 Loaded old deployment addresses");
      } else {
        console.error("❌ Old deployment addresses file not found");
        return;
      }
      
      if (fs.existsSync(newDeploymentFile)) {
        newAddresses = JSON.parse(fs.readFileSync(newDeploymentFile));
        console.log("📝 Loaded new deployment addresses");
      } else {
        console.error("❌ New deployment addresses file not found");
        console.log("👉 Please run complete-reddragon-redeployment.js first");
        return;
      }
    } catch (error) {
      console.error("❌ Error loading deployment addresses:", error);
      return;
    }
    
    // Connect to contracts
    console.log("\n🔄 Connecting to deployed contracts...");
    
    // Old RedDragon token
    const oldRedDragon = await hre.ethers.getContractAt("RedDragon", oldAddresses.redDragon);
    console.log("- Connected to old RedDragon token:", oldAddresses.redDragon);
    
    // New RedDragon token
    const newRedDragon = await hre.ethers.getContractAt("RedDragon", newAddresses.redDragon);
    console.log("- Connected to new RedDragon token:", newAddresses.redDragon);
    
    // Old Lottery
    const oldLottery = await hre.ethers.getContractAt("RedDragonSwapLottery", oldAddresses.lottery);
    console.log("- Connected to old lottery:", oldAddresses.lottery);
    
    // New Lottery
    const newLottery = await hre.ethers.getContractAt("RedDragonSwapLottery", newAddresses.lottery);
    console.log("- Connected to new lottery:", newAddresses.lottery);
    
    // Get token information
    console.log("\n📊 Gathering token information...");
    
    // Old token info
    const oldName = await oldRedDragon.name();
    const oldSymbol = await oldRedDragon.symbol();
    const oldTotalSupply = await oldRedDragon.totalSupply();
    const oldDecimals = await oldRedDragon.decimals();
    
    console.log("Old token:");
    console.log(`- Name: ${oldName}`);
    console.log(`- Symbol: ${oldSymbol}`);
    console.log(`- Total supply: ${hre.ethers.utils.formatUnits(oldTotalSupply, oldDecimals)}`);
    console.log(`- Decimals: ${oldDecimals}`);
    
    // New token info
    const newName = await newRedDragon.name();
    const newSymbol = await newRedDragon.symbol();
    const newTotalSupply = await newRedDragon.totalSupply();
    const newDecimals = await newRedDragon.decimals();
    
    console.log("\nNew token:");
    console.log(`- Name: ${newName}`);
    console.log(`- Symbol: ${newSymbol}`);
    console.log(`- Total supply: ${hre.ethers.utils.formatUnits(newTotalSupply, newDecimals)}`);
    console.log(`- Decimals: ${newDecimals}`);
    
    // Get jackpot information
    console.log("\n💰 Gathering jackpot information...");
    
    const oldJackpot = await oldLottery.jackpot();
    const newJackpot = await newLottery.jackpot();
    
    console.log(`Old jackpot: ${hre.ethers.utils.formatEther(oldJackpot)} wS`);
    console.log(`New jackpot: ${hre.ethers.utils.formatEther(newJackpot)} wS`);
    
    // Create migration guide
    console.log("\n📋 Creating migration guide...");
    
    const migrationGuide = {
      oldToken: {
        name: oldName,
        symbol: oldSymbol,
        address: oldAddresses.redDragon,
        totalSupply: oldTotalSupply.toString(),
        decimals: oldDecimals
      },
      newToken: {
        name: newName,
        symbol: newSymbol,
        address: newAddresses.redDragon,
        totalSupply: newTotalSupply.toString(),
        decimals: newDecimals
      },
      oldLottery: {
        address: oldAddresses.lottery,
        jackpot: oldJackpot.toString()
      },
      newLottery: {
        address: newAddresses.lottery,
        jackpot: newJackpot.toString()
      },
      oldJackpotVault: oldAddresses.jackpotVault,
      newJackpotVault: newAddresses.jackpotVault,
      migrationRatio: "1:1", // Default 1:1 ratio
      migrationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      migrationSteps: [
        "Approve the migration contract to spend your old tokens",
        "Call the migrate function on the migration contract",
        "Receive new tokens at a 1:1 ratio",
        "Start using the new token with improved vault system"
      ],
      benefits: [
        "Dedicated vaults for fee management",
        "Transparent jackpot distribution",
        "Improved security measures",
        "Multisig governance for critical operations"
      ]
    };
    
    // Save migration guide
    const migrationFile = "migration-plan.json";
    fs.writeFileSync(migrationFile, JSON.stringify(migrationGuide, null, 2));
    console.log(`✅ Migration guide saved to ${migrationFile}`);
    
    // Create markdown version for documentation
    const markdownContent = `# RedDragon Token Migration Guide

## Overview

This guide will help you migrate from the old RedDragon token to the new RedDragon token with improved features and security.

## Token Information

### Old Token
- **Name:** ${oldName}
- **Symbol:** ${oldSymbol}
- **Address:** \`${oldAddresses.redDragon}\`
- **Total Supply:** ${hre.ethers.utils.formatUnits(oldTotalSupply, oldDecimals)}
- **Decimals:** ${oldDecimals}

### New Token
- **Name:** ${newName}
- **Symbol:** ${newSymbol}
- **Address:** \`${newAddresses.redDragon}\`
- **Total Supply:** ${hre.ethers.utils.formatUnits(newTotalSupply, newDecimals)}
- **Decimals:** ${newDecimals}

## Migration Details

- **Migration Ratio:** 1:1
- **Migration Deadline:** ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}

## Migration Steps

1. Approve the migration contract to spend your old tokens
2. Call the migrate function on the migration contract
3. Receive new tokens at a 1:1 ratio
4. Start using the new token with improved vault system

## Benefits of Migration

- Dedicated vaults for fee management
- Transparent jackpot distribution
- Improved security measures
- Multisig governance for critical operations

## Contract Addresses

### Old System
- **RedDragon Token:** \`${oldAddresses.redDragon}\`
- **Lottery:** \`${oldAddresses.lottery}\`
- **Jackpot Vault:** \`${oldAddresses.jackpotVault}\`

### New System
- **RedDragon Token:** \`${newAddresses.redDragon}\`
- **Lottery:** \`${newAddresses.lottery}\`
- **Jackpot Vault:** \`${newAddresses.jackpotVault}\`
- **Liquidity Vault:** \`${newAddresses.liquidityVault}\`
- **Development Vault:** \`${newAddresses.developmentVault}\`
- **MultiSig:** \`${newAddresses.multiSig}\`

## Need Help?

If you need assistance with the migration process, please reach out to the team on:
- **Telegram:** [RedDragon Community](https://t.me/sonicreddragon)
- **Twitter:** [@sonicreddragon](https://x.com/sonicreddragon)
`;
    
    // Save markdown migration guide
    const markdownFile = "MIGRATION-GUIDE.md";
    fs.writeFileSync(markdownFile, markdownContent);
    console.log(`✅ Markdown migration guide saved to ${markdownFile}`);
    
    console.log("\n🎉 Migration plan creation completed!");
    console.log("\n⚠️ Important Next Steps:");
    console.log("1. Deploy the migration contract");
    console.log("2. Distribute the migration guide to all token holders");
    console.log("3. Set a firm deadline for migration");
    
  } catch (error) {
    console.error("❌ Error creating migration plan:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Script error:", error);
    process.exit(1);
  }); 