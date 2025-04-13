// Script to test the $DRAGON Balancer 80/20 implementation
const { ethers } = require("hardhat");

async function main() {
  console.log("Testing $DRAGON Balancer 80/20 implementation...");
  
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  
  // Get current network
  const network = await ethers.provider.getNetwork();
  console.log(`Network: ${network.name} (chainId: ${network.chainId})`);
  
  // Deploy mock tokens for testing (these would be real tokens in production)
  console.log("Deploying mock tokens for testing...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const dragonToken = await MockERC20.deploy("DRAGON Token", "DRAGON", ethers.utils.parseEther("1000000000"));
  const pairedToken = await MockERC20.deploy("Paired Token (wSONC)", "wSONC", ethers.utils.parseEther("1000000000"));
  await dragonToken.deployed();
  await pairedToken.deployed();
  console.log(`Mock DRAGON token deployed to: ${dragonToken.address}`);
  console.log(`Mock paired token (wSONC) deployed to: ${pairedToken.address}`);
  
  // Deploy mock Balancer contracts (these would be actual Beethoven X contracts in production)
  console.log("Deploying mock Balancer contracts...");
  const MockBalancerVault = await ethers.getContractFactory("MockBalancerVault");
  const balancerVault = await MockBalancerVault.deploy();
  await balancerVault.deployed();
  
  const MockWeightedPoolFactory = await ethers.getContractFactory("MockWeightedPoolFactory");
  const weightedPoolFactory = await MockWeightedPoolFactory.deploy(balancerVault.address);
  await weightedPoolFactory.deployed();
  
  console.log(`Mock Balancer Vault deployed to: ${balancerVault.address}`);
  console.log(`Mock Weighted Pool Factory deployed to: ${weightedPoolFactory.address}`);
  
  // Deploy LP Burner
  console.log("Deploying LP Burner...");
  const RedDragonLPBurner = await ethers.getContractFactory("RedDragonLPBurner");
  const lpBurner = await RedDragonLPBurner.deploy(deployer.address); // Use deployer as fee collector for testing
  await lpBurner.deployed();
  console.log(`LP Burner deployed to: ${lpBurner.address}`);
  
  // Deploy Balancer Integration
  console.log("Deploying Balancer Integration...");
  const RedDragonBalancerIntegration = await ethers.getContractFactory("RedDragonBalancerIntegration");
  const balancerIntegration = await RedDragonBalancerIntegration.deploy(
    balancerVault.address,
    weightedPoolFactory.address,
    dragonToken.address,
    pairedToken.address,
    lpBurner.address
  );
  await balancerIntegration.deployed();
  console.log(`Balancer Integration deployed to: ${balancerIntegration.address}`);
  
  // Create 80/20 pool
  console.log("\nCreating 80/20 DRAGON-wSONC pool...");
  const createPoolTx = await balancerIntegration.createPool(25); // 0.25% swap fee
  const createPoolReceipt = await createPoolTx.wait();
  
  // Get pool address from event
  const poolCreatedEvent = createPoolReceipt.events.find(e => e.event === 'PoolCreated');
  const poolAddress = poolCreatedEvent.args.poolAddress;
  console.log(`Pool created at address: ${poolAddress}`);
  
  // Add initial liquidity
  console.log("\nAdding initial liquidity...");
  
  // Approve tokens
  const dragonLiquidityAmount = ethers.utils.parseEther("10000000"); // 10 million DRAGON
  const pairedTokenLiquidityAmount = ethers.utils.parseEther("2500000"); // 2.5 million paired token (80/20 ratio)
  
  await dragonToken.approve(balancerIntegration.address, dragonLiquidityAmount);
  await pairedToken.approve(balancerIntegration.address, pairedTokenLiquidityAmount);
  
  // Add liquidity
  const addLiquidityTx = await balancerIntegration.addInitialLiquidity(
    dragonLiquidityAmount,
    pairedTokenLiquidityAmount
  );
  const addLiquidityReceipt = await addLiquidityTx.wait();
  
  // Get LP amount from event
  const liquidityAddedEvent = addLiquidityReceipt.events.find(e => e.event === 'LiquidityAdded');
  const lpAmount = liquidityAddedEvent.args.lpAmount;
  console.log(`Added ${ethers.utils.formatEther(dragonLiquidityAmount)} DRAGON and ${ethers.utils.formatEther(pairedTokenLiquidityAmount)} wSONC`);
  console.log(`Received ${ethers.utils.formatEther(lpAmount)} LP tokens`);
  
  // Check pool balances
  console.log("\nPool balances:");
  const [tokens, balances] = await balancerIntegration.getPoolBalances();
  console.log(`${await dragonToken.symbol()}: ${ethers.utils.formatEther(balances[1])}`);
  console.log(`${await pairedToken.symbol()}: ${ethers.utils.formatEther(balances[0])}`);
  
  // Test burning LP tokens
  console.log("\nTesting LP token burning (20% burn, 80% to fee collector)...");
  
  // Approve LP tokens for burning
  const poolContract = await ethers.getContractAt("MockWeightedPool", poolAddress);
  const lpBurnAmount = ethers.utils.parseEther("1000"); // Burn 1000 LP tokens
  
  await poolContract.approve(balancerIntegration.address, lpBurnAmount);
  
  // Burn LP tokens
  const burnTx = await balancerIntegration.burnPoolTokens(lpBurnAmount);
  const burnReceipt = await burnTx.wait();
  
  // Get burn details from event
  const burnEvent = burnReceipt.events.find(e => e.event === 'PoolBurned');
  const burnedAmount = burnEvent.args.burnAmount;
  const feeCollectorAmount = burnEvent.args.feeCollectorAmount;
  
  console.log(`Burned ${ethers.utils.formatEther(burnedAmount)} LP tokens (${ethers.utils.formatEther(burnedAmount) / ethers.utils.formatEther(lpBurnAmount) * 100}%)`);
  console.log(`Sent ${ethers.utils.formatEther(feeCollectorAmount)} LP tokens to fee collector (${ethers.utils.formatEther(feeCollectorAmount) / ethers.utils.formatEther(lpBurnAmount) * 100}%)`);
  
  // Test removing liquidity
  console.log("\nTesting removal of liquidity...");
  
  // Approve LP tokens for removal
  const lpRemoveAmount = ethers.utils.parseEther("1000"); // Remove 1000 LP tokens
  await poolContract.approve(balancerIntegration.address, lpRemoveAmount);
  
  // Remove liquidity
  const removeTx = await balancerIntegration.removeLiquidity(lpRemoveAmount);
  const removeReceipt = await removeTx.wait();
  
  // Get removal details from event
  const removalEvent = removeReceipt.events.find(e => e.event === 'LiquidityRemoved');
  const dragonReceived = removalEvent.args.dragonAmount;
  const pairedTokenReceived = removalEvent.args.pairedTokenAmount;
  
  console.log(`Removed ${ethers.utils.formatEther(lpRemoveAmount)} LP tokens`);
  console.log(`Received ${ethers.utils.formatEther(dragonReceived)} DRAGON and ${ethers.utils.formatEther(pairedTokenReceived)} wSONC`);
  
  // Check pool balances after operations
  console.log("\nFinal pool balances:");
  const [finalTokens, finalBalances] = await balancerIntegration.getPoolBalances();
  console.log(`${await dragonToken.symbol()}: ${ethers.utils.formatEther(finalBalances[1])}`);
  console.log(`${await pairedToken.symbol()}: ${ethers.utils.formatEther(finalBalances[0])}`);
  
  // Summary
  console.log("\n=== Test Summary ===");
  console.log("1. Created 80/20 DRAGON-wSONC Balancer pool");
  console.log("2. Added initial liquidity");
  console.log("3. Burned LP tokens (20% permanent burn, 80% fee collector)");
  console.log("4. Removed some liquidity");
  console.log("\nAll operations completed successfully!");
  console.log("\nFor production deployment, use these contracts with actual Beethoven X addresses on Sonic chain.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 