const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("RedDragonBalancerIntegration", function () {
  let balancerIntegration;
  let lpBurner;
  let dragonToken;
  let pairedToken;
  let balancerVault;
  let weightedPoolFactory;
  let deployer;
  let user;
  
  before(async function () {
    [deployer, user] = await ethers.getSigners();
    
    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    dragonToken = await MockERC20.deploy("DRAGON Token", "DRAGON", ethers.parseEther("1000000000"));
    pairedToken = await MockERC20.deploy("Paired Token", "PAIRED", ethers.parseEther("1000000000"));
    
    await dragonToken.waitForDeployment();
    await pairedToken.waitForDeployment();
    
    // Deploy mock Balancer contracts
    const MockBalancerVault = await ethers.getContractFactory("MockBalancerVault");
    balancerVault = await MockBalancerVault.deploy();
    
    const MockWeightedPoolFactory = await ethers.getContractFactory("MockWeightedPoolFactory");
    weightedPoolFactory = await MockWeightedPoolFactory.deploy(balancerVault.getAddress());
    
    await balancerVault.waitForDeployment();
    await weightedPoolFactory.waitForDeployment();
    
    // Deploy LP Burner
    const RedDragonLPBurner = await ethers.getContractFactory("RedDragonLPBurner");
    lpBurner = await RedDragonLPBurner.deploy(await deployer.getAddress());
    await lpBurner.waitForDeployment();
    
    // Deploy Balancer Integration
    const RedDragonBalancerIntegration = await ethers.getContractFactory("RedDragonBalancerIntegration");
    balancerIntegration = await RedDragonBalancerIntegration.deploy(
      await balancerVault.getAddress(),
      await weightedPoolFactory.getAddress(),
      await dragonToken.getAddress(),
      await pairedToken.getAddress(),
      await lpBurner.getAddress()
    );
    await balancerIntegration.waitForDeployment();
    
    // Transfer tokens to user
    await dragonToken.transfer(await user.getAddress(), ethers.parseEther("10000000"));
    await pairedToken.transfer(await user.getAddress(), ethers.parseEther("2500000"));
  });
  
  it("should be deployed with correct initial values", async function () {
    expect(await balancerIntegration.balancerVault()).to.equal(await balancerVault.getAddress());
    expect(await balancerIntegration.weightedPoolFactory()).to.equal(await weightedPoolFactory.getAddress());
    expect(await balancerIntegration.dragonToken()).to.equal(await dragonToken.getAddress());
    expect(await balancerIntegration.pairedToken()).to.equal(await pairedToken.getAddress());
    expect(await balancerIntegration.lpBurner()).to.equal(await lpBurner.getAddress());
    expect(await balancerIntegration.poolName()).to.equal("DRAGON 80/20 Pool");
    expect(await balancerIntegration.poolSymbol()).to.equal("D80-S20");
  });
  
  it("should create a pool with 80/20 weights", async function () {
    // Create pool
    await balancerIntegration.createPool(25); // 0.25% fee
    
    const poolAddress = await balancerIntegration.poolAddress();
    expect(poolAddress).to.not.equal(ethers.ZeroAddress);
    
    // Pool ID should be set
    const poolId = await balancerIntegration.poolId();
    expect(poolId).to.not.equal("0x0000000000000000000000000000000000000000000000000000000000000000");
  });
  
  it("should allow owner to add initial liquidity", async function () {
    // Prepare liquidity amounts
    const dragonAmount = ethers.parseEther("5000000"); // 5M DRAGON
    const pairedAmount = ethers.parseEther("1250000"); // 1.25M paired token
    
    // Approve tokens
    await dragonToken.approve(await balancerIntegration.getAddress(), dragonAmount);
    await pairedToken.approve(await balancerIntegration.getAddress(), pairedAmount);
    
    // Add initial liquidity
    await balancerIntegration.addInitialLiquidity(dragonAmount, pairedAmount);
    
    // Check pool token balance
    const poolAddress = await balancerIntegration.poolAddress();
    const poolToken = await ethers.getContractAt("MockERC20", poolAddress);
    const lpBalance = await poolToken.balanceOf(await balancerIntegration.getAddress());
    
    expect(lpBalance).to.be.gt(0);
  });
  
  it("should allow users to add liquidity", async function () {
    // Connect as user
    const userBalancerIntegration = balancerIntegration.connect(user);
    
    // Prepare liquidity amounts
    const dragonAmount = ethers.parseEther("1000000"); // 1M DRAGON
    const pairedAmount = ethers.parseEther("250000"); // 250K paired token
    
    // Approve tokens
    await dragonToken.connect(user).approve(await balancerIntegration.getAddress(), dragonAmount);
    await pairedToken.connect(user).approve(await balancerIntegration.getAddress(), pairedAmount);
    
    // Add liquidity
    await userBalancerIntegration.addLiquidity(dragonAmount, pairedAmount);
    
    // Check pool token balance
    const poolAddress = await balancerIntegration.poolAddress();
    const poolToken = await ethers.getContractAt("MockERC20", poolAddress);
    const lpBalance = await poolToken.balanceOf(await user.getAddress());
    
    expect(lpBalance).to.be.gt(0);
  });
  
  it("should allow users to burn LP tokens", async function () {
    // Connect as user
    const userBalancerIntegration = balancerIntegration.connect(user);
    
    // Get pool token
    const poolAddress = await balancerIntegration.poolAddress();
    const poolToken = await ethers.getContractAt("MockERC20", poolAddress);
    
    // Get LP balance
    const lpBalance = await poolToken.balanceOf(await user.getAddress());
    const burnAmount = lpBalance / 2n; // Burn half
    
    // Approve LP tokens
    await poolToken.connect(user).approve(await balancerIntegration.getAddress(), burnAmount);
    
    // Burn LP tokens
    const tx = await userBalancerIntegration.burnPoolTokens(burnAmount);
    
    // Should emit PoolBurned event
    await expect(tx).to.emit(balancerIntegration, "PoolBurned");
  });
}); 