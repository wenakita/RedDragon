const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RedDragon Balancer Integration", function () {
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
    
    // Deploy Balancer Integration
    const RedDragonBalancerIntegration = await ethers.getContractFactory("RedDragonBalancerIntegration");
    balancerIntegration = await RedDragonBalancerIntegration.deploy(
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
      
      // Approve tokens for adding liquidity
      await dragonToken.approve(balancerIntegration.address, dragonLiquidityAmount);
      await pairedToken.approve(balancerIntegration.address, pairedTokenLiquidityAmount);
    });
    
    it("Should add initial liquidity", async function () {
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
    
    it("Should allow users to add more liquidity", async function () {
      // First add initial liquidity
      await balancerIntegration.addInitialLiquidity(dragonLiquidityAmount, pairedTokenLiquidityAmount);
      
      // User 1 adds liquidity
      const userDragonAmount = ethers.parseEther("100000");
      const userPairedAmount = ethers.parseEther("25000");
      
      await dragonToken.connect(user1).approve(balancerIntegration.address, userDragonAmount);
      await pairedToken.connect(user1).approve(balancerIntegration.address, userPairedAmount);
      
      const balanceBefore = await ethers.provider.getBalance(poolAddress);
      const tx = await balancerIntegration.connect(user1).addLiquidity(userDragonAmount, userPairedAmount);
      const receipt = await tx.wait();
      
      // Verify event was emitted
      const event = receipt.events.find(e => e.event === 'LiquidityAdded');
      expect(event).to.not.be.undefined;
      
      // Check user received BPT tokens
      const poolContract = await ethers.getContractAt("IERC20", poolAddress);
      const userBPTBalance = await poolContract.balanceOf(user1.address);
      expect(userBPTBalance).to.be.gt(0);
    });
    
    it("Should fail with zero amounts", async function () {
      await expect(balancerIntegration.addInitialLiquidity(0, pairedTokenLiquidityAmount))
        .to.be.revertedWith("Zero amounts");
      
      await expect(balancerIntegration.addInitialLiquidity(dragonLiquidityAmount, 0))
        .to.be.revertedWith("Zero amounts");
    });
  });
  
  describe("Removing Liquidity", function () {
    beforeEach(async function () {
      // Create pool and add initial liquidity
      await balancerIntegration.createPool(swapFeePercentage);
      await dragonToken.approve(balancerIntegration.address, dragonLiquidityAmount);
      await pairedToken.approve(balancerIntegration.address, pairedTokenLiquidityAmount);
      await balancerIntegration.addInitialLiquidity(dragonLiquidityAmount, pairedTokenLiquidityAmount);
      
      // Get pool contract
      poolContract = await ethers.getContractAt("IERC20", await balancerIntegration.poolAddress());
    });
    
    it("Should allow removing liquidity", async function () {
      // Get BPT balance
      const bptBalance = await poolContract.balanceOf(owner.address);
      expect(bptBalance).to.be.gt(0);
      
      // Approve BPT tokens for removal
      await poolContract.approve(balancerIntegration.address, bptBalance);
      
      // Check token balances before
      const dragonBefore = await dragonToken.balanceOf(owner.address);
      const pairedBefore = await pairedToken.balanceOf(owner.address);
      
      // Remove liquidity
      const tx = await balancerIntegration.removeLiquidity(bptBalance);
      const receipt = await tx.wait();
      
      // Verify event was emitted
      const event = receipt.events.find(e => e.event === 'LiquidityRemoved');
      expect(event).to.not.be.undefined;
      
      // Check received tokens
      const dragonAfter = await dragonToken.balanceOf(owner.address);
      const pairedAfter = await pairedToken.balanceOf(owner.address);
      
      expect(dragonAfter).to.be.gt(dragonBefore);
      expect(pairedAfter).to.be.gt(pairedBefore);
    });
  });
  
  describe("LP Burning", function () {
    beforeEach(async function () {
      // Create pool and add initial liquidity
      await balancerIntegration.createPool(swapFeePercentage);
      await dragonToken.approve(balancerIntegration.address, dragonLiquidityAmount);
      await pairedToken.approve(balancerIntegration.address, pairedTokenLiquidityAmount);
      await balancerIntegration.addInitialLiquidity(dragonLiquidityAmount, pairedTokenLiquidityAmount);
      
      // Get pool contract
      poolContract = await ethers.getContractAt("IERC20", await balancerIntegration.poolAddress());
    });
    
    it("Should burn LP tokens according to the recommended split", async function () {
      // Get BPT balance
      const bptBalance = await poolContract.balanceOf(owner.address);
      const halfBpt = bptBalance / 2n;
      
      // Approve BPT tokens for burning
      await poolContract.approve(balancerIntegration.address, halfBpt);
      
      // Check LP Burner balance before
      const burnerBptBefore = await poolContract.balanceOf(lpBurner.address);
      
      // Burn LP tokens
      const tx = await balancerIntegration.burnLPTokens(halfBpt);
      const receipt = await tx.wait();
      
      // Verify event was emitted
      const event = receipt.events.find(e => e.event === 'LPTokensBurned');
      expect(event).to.not.be.undefined;
      expect(event.args.amount).to.equal(halfBpt);
      
      // Check LP Burner received tokens
      const burnerBptAfter = await poolContract.balanceOf(lpBurner.address);
      expect(burnerBptAfter - burnerBptBefore).to.equal(halfBpt);
    });
  });
  
  describe("Fee Collection", function () {
    beforeEach(async function () {
      // Create pool and add initial liquidity
      await balancerIntegration.createPool(swapFeePercentage);
      await dragonToken.approve(balancerIntegration.address, dragonLiquidityAmount);
      await pairedToken.approve(balancerIntegration.address, pairedTokenLiquidityAmount);
      await balancerIntegration.addInitialLiquidity(dragonLiquidityAmount, pairedTokenLiquidityAmount);
    });
    
    it("Should collect and distribute fees", async function () {
      // Mock some trading to generate fees
      await balancerVault.mockGenerateFees(ethers.parseEther("100"), ethers.parseEther("25"));
      
      // Check balances before collecting fees
      const feeCollectorDragonBefore = await dragonToken.balanceOf(feeCollector.address);
      const feeCollectorPairedBefore = await pairedToken.balanceOf(feeCollector.address);
      
      // Collect fees
      const tx = await balancerIntegration.collectAndDistributeFees();
      const receipt = await tx.wait();
      
      // Verify event was emitted
      const event = receipt.events.find(e => e.event === 'FeesCollected');
      expect(event).to.not.be.undefined;
      
      // Check fee collector received tokens
      const feeCollectorDragonAfter = await dragonToken.balanceOf(feeCollector.address);
      const feeCollectorPairedAfter = await pairedToken.balanceOf(feeCollector.address);
      
      expect(feeCollectorDragonAfter).to.be.gt(feeCollectorDragonBefore);
      expect(feeCollectorPairedAfter).to.be.gt(feeCollectorPairedBefore);
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