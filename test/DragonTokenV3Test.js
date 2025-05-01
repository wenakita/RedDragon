const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DragonTokenV3 - Direct Balancer Integration", function () {
  // Contracts
  let dragonToken;
  let wrappedSonic;
  let mockBalancerVault;
  let jackpotVault;
  let ve69LPFeeDistributor;

  // Signers
  let owner;
  let user1;
  let user2;
  let normalUser;

  // Constants
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const INITIAL_SUPPLY = ethers.utils.parseEther("1000000"); // 1 million tokens
  const POOL_ID = ethers.utils.formatBytes32String("DRAGON-wS-POOL-ID");
  
  // Helper function to create mock wS token
  async function deployMockWrappedSonic() {
    const MockWrappedSonic = await ethers.getContractFactory("MockWrappedSonic");
    const token = await MockWrappedSonic.deploy();
    await token.deployed();
    return token;
  }
  
  // Helper function to create a mock Balancer Vault
  async function deployMockBalancerVault() {
    const MockBalancerVault = await ethers.getContractFactory("MockBalancerVault");
    const vault = await MockBalancerVault.deploy();
    await vault.deployed();
    return vault;
  }

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2, normalUser, jackpotVault, ve69LPFeeDistributor] = await ethers.getSigners();

    // Deploy Wrapped Sonic (wS) token
    wrappedSonic = await deployMockWrappedSonic();

    // Deploy Mock Balancer Vault
    mockBalancerVault = await deployMockBalancerVault();

    // Deploy Dragon token with direct Balancer integration
    const DragonToken = await ethers.getContractFactory("DragonTokenV3");
    dragonToken = await DragonToken.deploy(
      "Dragon Token",
      "DRAGON",
      wrappedSonic.address,
      jackpotVault.address,
      ve69LPFeeDistributor.address,
      mockBalancerVault.address,
      owner.address
    );
    await dragonToken.deployed();
    
    // Configure Balancer pool ID
    await dragonToken.updateBalancerConfig(
      mockBalancerVault.address,
      POOL_ID
    );

    // Mint initial supply to owner
    await dragonToken.mint(owner.address, INITIAL_SUPPLY);

    // Transfer some tokens to users for testing
    await dragonToken.transfer(user1.address, ethers.utils.parseEther("10000"));
    await dragonToken.transfer(user2.address, ethers.utils.parseEther("10000"));
    await dragonToken.transfer(normalUser.address, ethers.utils.parseEther("10000"));
    
    // Setup MockBalancerVault with token info
    await mockBalancerVault.setupPool(
      POOL_ID,
      [dragonToken.address, wrappedSonic.address],
      [ethers.utils.parseEther("100000"), ethers.utils.parseEther("100000")],
      0
    );
  });

  describe("Initialization", function () {
    it("should set the correct addresses", async function () {
      expect(await dragonToken.wrappedSonic()).to.equal(wrappedSonic.address);
      expect(await dragonToken.jackpotVault()).to.equal(jackpotVault.address);
      expect(await dragonToken.ve69LPFeeDistributor()).to.equal(ve69LPFeeDistributor.address);
      expect(await dragonToken.balancerVault()).to.equal(mockBalancerVault.address);
      expect(await dragonToken.dragonWSPoolId()).to.equal(POOL_ID);
    });

    it("should have the correct fee settings", async function () {
      const buyFees = await dragonToken.getBuyFees();
      expect(buyFees.jackpotFee).to.equal(690); // 6.9%
      expect(buyFees.ve69LPFee).to.equal(241); // 2.41%
      expect(buyFees.burnFee).to.equal(69); // 0.69%
      expect(buyFees.totalFee).to.equal(1000); // 10%
      
      const sellFees = await dragonToken.getSellFees();
      expect(sellFees.jackpotFee).to.equal(690); // 6.9%
      expect(sellFees.ve69LPFee).to.equal(241); // 2.41%
      expect(sellFees.burnFee).to.equal(69); // 0.69%
      expect(sellFees.totalFee).to.equal(1000); // 10%
    });
  });

  describe("Regular transfers", function () {
    it("should apply only burn fee for regular transfers", async function () {
      const transferAmount = ethers.utils.parseEther("1000");
      const burnFeePercentage = await dragonToken.BURN_PERCENTAGE();
      const expectedBurnFee = transferAmount.mul(burnFeePercentage).div(10000);
      const expectedReceivedAmount = transferAmount.sub(expectedBurnFee);
      
      const beforeBalance = await dragonToken.balanceOf(normalUser.address);
      
      // Transfer from user1 to user2
      await dragonToken.connect(user1).transfer(user2.address, transferAmount);
      
      // Check balances
      const user2Balance = await dragonToken.balanceOf(user2.address);
      expect(user2Balance).to.equal(
        ethers.utils.parseEther("10000").add(expectedReceivedAmount)
      );
      
      // Check total supply reduction from burn
      const expectedTotalSupply = INITIAL_SUPPLY.sub(expectedBurnFee);
      expect(await dragonToken.totalSupply()).to.be.at.most(expectedTotalSupply);
    });
  });

  describe("Balancer Integration - Buy DRAGON", function () {
    it("should correctly handle fees when tokens are transferred from Balancer Vault", async function () {
      const buyAmount = ethers.utils.parseEther("1000");
      
      // Calculate expected fees
      const jackpotFee = buyAmount.mul(690).div(10000); // 6.9%
      const ve69LPFee = buyAmount.mul(241).div(10000); // 2.41%
      const burnFee = buyAmount.mul(69).div(10000); // 0.69%
      const expectedReceivedAmount = buyAmount.sub(jackpotFee).sub(ve69LPFee).sub(burnFee);
      
      // Mock transfer from Balancer Vault to user
      await dragonToken.connect(owner).mint(mockBalancerVault.address, buyAmount);
      await dragonToken.connect(owner).setVRFConnector(owner.address); // So we can call afterSwap
      
      // User's balance before
      const balanceBefore = await dragonToken.balanceOf(user1.address);
      
      // Simulate Balancer Vault transferring tokens to user
      await dragonToken.connect(mockBalancerVault).transfer(user1.address, buyAmount);
      
      // Check fee distribution
      const jackpotBalance = await dragonToken.balanceOf(jackpotVault.address);
      const ve69LPBalance = await dragonToken.balanceOf(ve69LPFeeDistributor.address);
      const userBalance = await dragonToken.balanceOf(user1.address);
      
      expect(jackpotBalance).to.equal(jackpotFee);
      expect(ve69LPBalance).to.equal(ve69LPFee);
      expect(userBalance).to.equal(balanceBefore.add(expectedReceivedAmount));
      
      // Verify total supply decreased by burn amount
      const expectedSupply = INITIAL_SUPPLY.add(buyAmount).sub(burnFee);
      expect(await dragonToken.totalSupply()).to.be.at.most(expectedSupply);
    });
  });

  describe("Balancer Integration - Sell DRAGON", function () {
    it("should correctly handle fees when tokens are transferred to Balancer Vault", async function () {
      const sellAmount = ethers.utils.parseEther("1000");
      
      // Calculate expected fees
      const jackpotFee = sellAmount.mul(690).div(10000); // 6.9%
      const ve69LPFee = sellAmount.mul(241).div(10000); // 2.41%
      const burnFee = sellAmount.mul(69).div(10000); // 0.69%
      const expectedVaultAmount = sellAmount.sub(jackpotFee).sub(ve69LPFee).sub(burnFee);
      
      // User's and vault's balance before
      const balanceBefore = await dragonToken.balanceOf(user1.address);
      const vaultBalanceBefore = await dragonToken.balanceOf(mockBalancerVault.address);
      
      // User transfers tokens to Balancer Vault (sell)
      await dragonToken.connect(user1).transfer(mockBalancerVault.address, sellAmount);
      
      // Check fee distribution
      const jackpotBalance = await dragonToken.balanceOf(jackpotVault.address);
      const ve69LPBalance = await dragonToken.balanceOf(ve69LPFeeDistributor.address);
      const vaultBalance = await dragonToken.balanceOf(mockBalancerVault.address);
      
      expect(jackpotBalance).to.equal(jackpotFee);
      expect(ve69LPBalance).to.equal(ve69LPFee);
      expect(vaultBalance).to.equal(vaultBalanceBefore.add(expectedVaultAmount));
      
      // Verify total supply decreased by burn amount
      const expectedSupply = INITIAL_SUPPLY.sub(burnFee);
      expect(await dragonToken.totalSupply()).to.be.at.most(expectedSupply);
    });
  });

  describe("Admin functions", function () {
    it("should update fee addresses", async function () {
      const newJackpot = user1.address;
      const newVe69LP = user2.address;
      
      await dragonToken.connect(owner).updateFeeAddresses(newJackpot, newVe69LP);
      
      expect(await dragonToken.jackpotVault()).to.equal(newJackpot);
      expect(await dragonToken.ve69LPFeeDistributor()).to.equal(newVe69LP);
    });
    
    it("should update buy fees", async function () {
      await dragonToken.connect(owner).setBuyFees(500, 300, 100);
      
      const buyFees = await dragonToken.getBuyFees();
      expect(buyFees.jackpotFee).to.equal(500);
      expect(buyFees.ve69LPFee).to.equal(300);
      expect(buyFees.burnFee).to.equal(100);
      expect(buyFees.totalFee).to.equal(900);
    });
    
    it("should update sell fees", async function () {
      await dragonToken.connect(owner).setSellFees(500, 300, 100);
      
      const sellFees = await dragonToken.getSellFees();
      expect(sellFees.jackpotFee).to.equal(500);
      expect(sellFees.ve69LPFee).to.equal(300);
      expect(sellFees.burnFee).to.equal(100);
      expect(sellFees.totalFee).to.equal(900);
    });
    
    it("should update Balancer configuration", async function () {
      const newPool = ethers.utils.formatBytes32String("NEW-POOL-ID");
      await dragonToken.connect(owner).updateBalancerConfig(normalUser.address, newPool);
      
      expect(await dragonToken.balancerVault()).to.equal(normalUser.address);
      expect(await dragonToken.dragonWSPoolId()).to.equal(newPool);
    });
  });
}); 