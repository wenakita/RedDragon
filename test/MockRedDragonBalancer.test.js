const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Mock RedDragon Balancer Integration", function () {
  let owner, user1, user2;
  let dragonToken, pairedToken;
  let balancerVault, weightedPoolFactory;
  let lpBurner, balancerIntegration;
  let poolAddress;
  
  // Constants for testing
  const initialSupply = ethers.parseEther("1000000000"); // 1 billion tokens
  const dragonLiquidityAmount = ethers.parseEther("10000000"); // 10 million DRAGON
  const pairedTokenLiquidityAmount = ethers.parseEther("2500000"); // 2.5 million paired token (matches 80/20 ratio)
  const swapFeePercentage = 25; // 0.25%
  
  beforeEach(async function () {
    // Get signers
    [owner, user1, user2, feeCollector] = await ethers.getSigners();
    
    // Deploy mock ERC20 tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    dragonToken = await MockERC20.deploy("DRAGON Token", "DRAGON", initialSupply);
    pairedToken = await MockERC20.deploy("Paired Token", "PAIRED", initialSupply);
    
    // Deploy mock Balancer contracts
    const MockBalancerVault = await ethers.getContractFactory("MockBalancerVault");
    balancerVault = await MockBalancerVault.deploy();
    
    const MockWeightedPoolFactory = await ethers.getContractFactory("MockWeightedPoolFactory");
    weightedPoolFactory = await MockWeightedPoolFactory.deploy(balancerVault.address);
    
    // Deploy LP Burner
    const RedDragonLPBurner = await ethers.getContractFactory("RedDragonLPBurner");
    lpBurner = await RedDragonLPBurner.deploy(feeCollector.address);
    
    // Deploy Mock Balancer Integration
    const MockRedDragonBalancerIntegration = await ethers.getContractFactory("MockRedDragonBalancerIntegration");
    balancerIntegration = await MockRedDragonBalancerIntegration.deploy(
      balancerVault.address,
      weightedPoolFactory.address,
      dragonToken.address,
      pairedToken.address,
      lpBurner.address
    );
    
    // Transfer tokens to users for testing
    await dragonToken.transfer(user1.address, ethers.parseEther("1000000"));
    await pairedToken.transfer(user1.address, ethers.parseEther("1000000"));
    await dragonToken.transfer(user2.address, ethers.parseEther("1000000"));
    await pairedToken.transfer(user2.address, ethers.parseEther("1000000"));
  });
  
  describe("Pool Creation", function () {
    it("Should create an 80/20 weighted pool", async function () {
      const tx = await balancerIntegration.createPool(swapFeePercentage);
      const receipt = await tx.wait();
      
      // Get pool address from event
      const event = receipt.events.find(e => e.event === 'PoolCreated');
      expect(event).to.not.be.undefined;
      
      poolAddress = event.args.poolAddress;
      expect(poolAddress).to.not.equal(ethers.ZeroAddress);
      
      // Verify pool ID is set
      const poolId = await balancerIntegration.poolId();
      expect(poolId).to.not.equal("0x0000000000000000000000000000000000000000000000000000000000000000");
    });
    
    it("Should fail to create a pool with too high fee", async function () {
      await expect(balancerIntegration.createPool(350)).to.be.revertedWith("Fee too high");
    });
    
    it("Should fail to create a pool twice", async function () {
      await balancerIntegration.createPool(swapFeePercentage);
      await expect(balancerIntegration.createPool(swapFeePercentage)).to.be.revertedWith("Pool already created");
    });
  });
  
  describe("Adding Liquidity", function () {
    beforeEach(async function () {
      // Create pool before each test in this section
      const tx = await balancerIntegration.createPool(swapFeePercentage);
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'PoolCreated');
      poolAddress = event.args.poolAddress;
      
      // Mock deployment of pool token
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const poolToken = await MockERC20.deploy("Pool Token", "BPT", 0);
      
      // Mock the pool address in the balancer vault
      await balancerVault.registerPool(await balancerIntegration.poolId(), [pairedToken.address, dragonToken.address]);
      
      // Approve tokens for adding liquidity
      await dragonToken.approve(balancerIntegration.address, dragonLiquidityAmount);
      await pairedToken.approve(balancerIntegration.address, pairedTokenLiquidityAmount);
    });
    
    it("Should add initial liquidity", async function () {
      // Skip this test until mock contracts are fully implemented
      this.skip();
      
      // Add initial liquidity
      const tx = await balancerIntegration.addInitialLiquidity(dragonLiquidityAmount, pairedTokenLiquidityAmount);
      const receipt = await tx.wait();
      
      // Verify event was emitted
      const event = receipt.events.find(e => e.event === 'LiquidityAdded');
      expect(event).to.not.be.undefined;
      expect(event.args.dragonAmount).to.equal(dragonLiquidityAmount);
      expect(event.args.pairedTokenAmount).to.equal(pairedTokenLiquidityAmount);
      expect(event.args.lpAmount).to.be.gt(0);
    });
    
    it("Should fail with zero amounts", async function () {
      await expect(balancerIntegration.addInitialLiquidity(0, pairedTokenLiquidityAmount))
        .to.be.revertedWith("Zero amounts");
      
      await expect(balancerIntegration.addInitialLiquidity(dragonLiquidityAmount, 0))
        .to.be.revertedWith("Zero amounts");
    });
  });
  
  describe("Emergency Functions", function () {
    it("Should recover accidentally sent tokens", async function () {
      // Send tokens to contract
      const amount = ethers.parseEther("1000");
      await dragonToken.transfer(balancerIntegration.address, amount);
      
      // Verify tokens were sent
      const balanceBefore = await dragonToken.balanceOf(balancerIntegration.address);
      expect(balanceBefore).to.equal(amount);
      
      // Withdraw tokens
      await balancerIntegration.emergencyWithdraw(dragonToken.address, amount);
      
      // Verify tokens were recovered
      const balanceAfter = await dragonToken.balanceOf(balancerIntegration.address);
      expect(balanceAfter).to.equal(0);
    });
    
    it("Should only allow owner to call emergency functions", async function () {
      // Send tokens to contract
      const amount = ethers.parseEther("1000");
      await dragonToken.transfer(balancerIntegration.address, amount);
      
      // Try to withdraw as non-owner
      await expect(
        balancerIntegration.connect(user1).emergencyWithdraw(dragonToken.address, amount)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
}); 