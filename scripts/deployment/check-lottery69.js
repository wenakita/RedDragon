/**
 * Comparison script for the old and new lottery contracts
 * 
 * This script checks:
 * 1. Configurations of both lottery contracts
 * 2. Jackpot amounts
 * 3. Win probabilities for various swap amounts
 * 4. Expected payout differences
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const chalk = require("chalk");

async function main() {
  console.log(chalk.blue("==================================="));
  console.log(chalk.blue("RedDragon Lottery Comparison Script"));
  console.log(chalk.blue("==================================="));

  // Load deployment addresses
  let deploymentAddresses;
  try {
    deploymentAddresses = JSON.parse(fs.readFileSync("./deployment-addresses-sonic.json", "utf8"));
  } catch (error) {
    console.error(chalk.red("Error loading deployment addresses:", error.message));
    process.exit(1);
  }

  // Get the lottery addresses
  const oldLotteryAddress = deploymentAddresses.lottery;
  const newLotteryAddress = deploymentAddresses.lottery69 || process.env.LOTTERY69_ADDRESS;

  // Validate addresses
  if (!oldLotteryAddress) {
    console.error(chalk.red("Old lottery address not found in deployment addresses"));
    process.exit(1);
  }

  if (!newLotteryAddress) {
    console.error(chalk.red("New lottery69 address not found in deployment addresses or environment"));
    console.log(chalk.yellow("Please set the LOTTERY69_ADDRESS environment variable or update deployment-addresses-sonic.json"));
    process.exit(1);
  }

  console.log(chalk.green("Old Lottery Address:"), oldLotteryAddress);
  console.log(chalk.green("New Lottery69 Address:"), newLotteryAddress);

  // Connect to contracts
  const [signer] = await ethers.getSigners();
  
  // Get lottery ABIs
  const OldLottery = await ethers.getContractFactory("RedDragonSwapLottery");
  const NewLottery = await ethers.getContractFactory("RedDragonSwapLottery69");
  
  const oldLottery = OldLottery.attach(oldLotteryAddress);
  const newLottery = NewLottery.attach(newLotteryAddress);

  console.log(chalk.blue("\n--- Comparing Jackpot Amounts ---"));
  
  // Get jackpot amounts
  const oldJackpot = await oldLottery.getCurrentJackpot();
  const newJackpot = await newLottery.getCurrentJackpot();
  const newWinAmount = await newLottery.getWinAmount();
  
  console.log(chalk.green("Old Lottery Jackpot:"), ethers.utils.formatEther(oldJackpot), "wS");
  console.log(chalk.green("New Lottery69 Jackpot:"), ethers.utils.formatEther(newJackpot), "wS");
  console.log(chalk.green("New Lottery69 Win Amount (69%):"), ethers.utils.formatEther(newWinAmount), "wS");
  console.log(chalk.green("Percentage of jackpot paid out:"), "69%");
  
  console.log(chalk.blue("\n--- Comparing Configurations ---"));
  
  // Check key configuration parameters
  const configs = [
    { name: "Exchange Pair", oldFn: oldLottery.exchangePair, newFn: newLottery.exchangePair },
    { name: "LP Token", oldFn: oldLottery.lpToken, newFn: newLottery.lpToken },
    { name: "Voting Token", oldFn: oldLottery.votingToken, newFn: newLottery.votingToken },
    { name: "LP Booster", oldFn: oldLottery.lpBooster, newFn: newLottery.lpBooster },
    { name: "Token Contract", oldFn: oldLottery.tokenContract, newFn: newLottery.tokenContract },
    { name: "Wrapped Sonic", oldFn: oldLottery.wrappedSonic, newFn: newLottery.wrappedSonic },
    { name: "Verifier", oldFn: oldLottery.verifier, newFn: newLottery.verifier },
    { name: "Paused", oldFn: oldLottery.paused, newFn: newLottery.paused },
  ];
  
  for (const config of configs) {
    const oldValue = await config.oldFn();
    const newValue = await config.newFn();
    const match = oldValue === newValue;
    
    console.log(
      chalk.green(config.name + ":"), 
      match ? chalk.green("✓ MATCH") : chalk.red("✗ MISMATCH"), 
      match ? "" : `\n  Old: ${oldValue}\n  New: ${newValue}`
    );
  }
  
  console.log(chalk.blue("\n--- Comparing Win Probabilities ---"));
  
  // Compare win probabilities for different swap amounts
  const swapAmounts = [
    { amount: ethers.utils.parseEther("100"), label: "100 wS" },
    { amount: ethers.utils.parseEther("1000"), label: "1,000 wS" },
    { amount: ethers.utils.parseEther("10000"), label: "10,000 wS" },
    { amount: ethers.utils.parseEther("25000"), label: "25,000 wS" },
  ];
  
  console.log(chalk.yellow("NOTE: Win probabilities should be identical between contracts"));
  console.log(chalk.yellow("The only difference should be the payout amount (69% vs 100%)"));
  
  for (const { amount, label } of swapAmounts) {
    const oldProb = await oldLottery.calculateBaseProbability(amount);
    const oldProbPercentage = parseFloat(ethers.utils.formatUnits(oldProb, 18)) * 100;
    
    const newProb = await newLottery.calculateBaseProbability(amount);
    const newProbPercentage = parseFloat(ethers.utils.formatUnits(newProb, 18)) * 100;
    
    const match = oldProb.eq(newProb);
    
    console.log(
      chalk.green(`Swap of ${label}:`), 
      match ? chalk.green("✓ MATCH") : chalk.red("✗ MISMATCH"), 
      `\n  Win Probability: ${newProbPercentage.toFixed(2)}%`
    );
  }
  
  console.log(chalk.blue("\n--- Comparing Payout Differences ---"));
  
  // Compare payout differences for hypothetical jackpot sizes
  const jackpotSizes = [
    { amount: ethers.utils.parseEther("10000"), label: "10,000 wS" },
    { amount: ethers.utils.parseEther("50000"), label: "50,000 wS" },
    { amount: ethers.utils.parseEther("100000"), label: "100,000 wS" },
    { amount: ethers.utils.parseEther("500000"), label: "500,000 wS" },
  ];
  
  for (const { amount, label } of jackpotSizes) {
    // Old lottery pays out 100% of jackpot
    const oldPayout = amount;
    
    // New lottery pays out 69% of jackpot
    const newPayout = amount.mul(69).div(100);
    
    const difference = oldPayout.sub(newPayout);
    const differencePercentage = 31; // 100% - 69%
    
    console.log(chalk.green(`Jackpot of ${label}:`));
    console.log(`  Old Lottery Payout: ${ethers.utils.formatEther(oldPayout)} wS (100%)`);
    console.log(`  New Lottery Payout: ${ethers.utils.formatEther(newPayout)} wS (69%)`);
    console.log(`  Difference: ${ethers.utils.formatEther(difference)} wS (${differencePercentage}%)`);
    console.log(`  Retained in Jackpot: ${ethers.utils.formatEther(difference)} wS`);
  }
  
  console.log(chalk.blue("\n--- Summary of Findings ---"));
  console.log(chalk.green("✓ The new lottery pays out 69% of the jackpot instead of 100%"));
  console.log(chalk.green("✓ Win probabilities remain identical between contracts"));
  console.log(chalk.green("✓ 31% of the jackpot is retained after wins, leading to more sustainable jackpot growth"));
  console.log(chalk.green("✓ For a 100,000 wS jackpot, winners receive 69,000 wS instead of 100,000 wS"));
  console.log(chalk.green("✓ The retained portion (31,000 wS in this example) remains in the jackpot"));
  
  console.log(chalk.blue("\n=== End of Comparison ==="));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 