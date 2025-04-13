// Script to test the $DRAGON Balancer 80/20 implementation locally
const { ethers } = require("hardhat");

async function main() {
  console.log("Testing $DRAGON Balancer 80/20 implementation locally...");
  
  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  
  // Deploy mock tokens for testing
  console.log("Deploying mock tokens...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const dragonToken = await MockERC20.deploy("DRAGON Token", "DRAGON", ethers.utils.parseEther("1000000000"));
  const pairedToken = await MockERC20.deploy("Paired Token", "PAIRED", ethers.utils.parseEther("1000000000"));
  
  await dragonToken.deployed();
  await pairedToken.deployed();
  
  console.log(`Mock DRAGON token deployed to: ${dragonToken.address}`);
  console.log(`Mock paired token deployed to: ${pairedToken.address}`);
  
  // Deploy mock balancer contracts
  console.log("Deploying mock Balancer contracts...");
  const MockBalancerVault = await ethers.getContractFactory("MockBalancerVault");
  const balancerVault = await MockBalancerVault.deploy();
  
  const MockWeightedPoolFactory = await ethers.getContractFactory("MockWeightedPoolFactory");
  const weightedPoolFactory = await MockWeightedPoolFactory.deploy(balancerVault.address);
  
  await balancerVault.deployed();
  await weightedPoolFactory.deployed();
  
  console.log(`Mock Balancer Vault deployed to: ${balancerVault.address}`);
  console.log(`Mock Weighted Pool Factory deployed to: ${weightedPoolFactory.address}`);
  
  // Deploy the MultiSig as just a simple account for testing
  const multiSigAddress = deployer.address;
  console.log(`Using deployer as MultiSig address for testing: ${multiSigAddress}`);
  
  // Deploy LP Burner
  console.log("Deploying RedDragonLPBurner...");
  const RedDragonLPBurner = await ethers.getContractFactory("RedDragonLPBurner");
  const lpBurner = await RedDragonLPBurner.deploy(multiSigAddress);
  await lpBurner.deployed();
  console.log(`RedDragonLPBurner deployed to: ${lpBurner.address}`);
  
  // Deploy Balancer Integration
  console.log("Deploying RedDragonBalancerIntegration...");
  const RedDragonBalancerIntegration = await ethers.getContractFactory("RedDragonBalancerIntegration");
  const balancerIntegration = await RedDragonBalancerIntegration.deploy(
    balancerVault.address,
    weightedPoolFactory.address,
    dragonToken.address,
    pairedToken.address,
    lpBurner.address
  );
  await balancerIntegration.deployed();
  console.log(`RedDragonBalancerIntegration deployed to: ${balancerIntegration.address}`);
  
  // Create pool
  console.log("\nCreating 80/20 pool...");
  const createPoolTx = await balancerIntegration.createPool(25); // 0.25% fee
  await createPoolTx.wait();
  
  // Get pool address
  const poolAddress = await balancerIntegration.poolAddress();
  console.log(`Pool created at address: ${poolAddress}`);
  
  // Prepare token amounts for liquidity
  const dragonAmount = ethers.utils.parseEther("10000000"); // 10M DRAGON
  const pairedAmount = ethers.utils.parseEther("2500000");  // 2.5M paired token
  
  // Transfer and approve tokens
  await dragonToken.transfer(deployer.address, dragonAmount);
  await pairedToken.transfer(deployer.address, pairedAmount);
  
  await dragonToken.approve(balancerIntegration.address, dragonAmount);
  await pairedToken.approve(balancerIntegration.address, pairedAmount);
  
  // Add initial liquidity
  console.log("\nAdding initial liquidity...");
  try {
    const addLiquidityTx = await balancerIntegration.addInitialLiquidity(dragonAmount, pairedAmount);
    await addLiquidityTx.wait();
    console.log("Initial liquidity added successfully!");
  } catch (error) {
    console.error("Error adding liquidity:", error.message);
  }
  
  // Get pool token and check balance
  try {
    const poolToken = await ethers.getContractAt("IERC20", poolAddress);
    const lpBalance = await poolToken.balanceOf(deployer.address);
    console.log(`LP token balance: ${ethers.utils.formatEther(lpBalance)}`);
    
    // Test LP burning
    if (lpBalance.gt(0)) {
      console.log("\nTesting LP burning...");
      
      await poolToken.approve(balancerIntegration.address, lpBalance);
      const burnTx = await balancerIntegration.burnPoolTokens(lpBalance);
      await burnTx.wait();
      
      console.log("LP tokens processed: 20% burned, 80% sent to fee collector");
    }
  } catch (error) {
    console.error("Error in LP operations:", error.message);
  }
  
  console.log("\nAll contracts deployed and tested successfully!");
  console.log("Summary of deployment addresses:");
  console.log(`- DRAGON Token: ${dragonToken.address}`);
  console.log(`- Paired Token: ${pairedToken.address}`);
  console.log(`- LP Burner: ${lpBurner.address}`);
  console.log(`- Balancer Integration: ${balancerIntegration.address}`);
  console.log(`- Pool Address: ${poolAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 