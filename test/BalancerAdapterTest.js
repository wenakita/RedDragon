const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Dragon Balancer Adapter Test", function () {
  // Contracts
  let dragonToken;
  let wrappedSonic;
  let balancerAdapter;
  let mockBalancerVault;
  let jackpotVault;
  let ve69LPFeeDistributor;

  // Signers
  let owner;
  let user1;
  let user2;

  // Constants
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const INITIAL_SUPPLY = ethers.utils.parseEther("1000000"); // 1 million tokens
  const POOL_ID = ethers.utils.formatBytes32String("DRAGON-wS-POOL-ID");
  
  // Helper function to create a mock Balancer Vault
  async function deployMockBalancerVault() {
    const MockBalancerVault = await ethers.getContractFactory("MockBalancerVault");
    const vault = await MockBalancerVault.deploy();
    await vault.deployed();
    
    // Setup pool tokens
    await vault.setupPool(
      POOL_ID,
      [dragonToken.address, wrappedSonic.address],
      [ethers.utils.parseEther("1000"), ethers.utils.parseEther("1000")],
      0
    );
    
    return vault;
  }

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2, jackpotVault, ve69LPFeeDistributor] = await ethers.getSigners();

    // Deploy Wrapped Sonic (wS) token
    const WrappedSonic = await ethers.getContractFactory("MockWrappedSonic");
    wrappedSonic = await WrappedSonic.deploy();
    await wrappedSonic.deployed();

    // Deploy Dragon token
    const DragonToken = await ethers.getContractFactory("DragonTokenV2");
    dragonToken = await DragonToken.deploy(
      "Dragon Token",
      "DRAGON",
      wrappedSonic.address,
      jackpotVault.address,
      ve69LPFeeDistributor.address,
      owner.address
    );
    await dragonToken.deployed();

    // Deploy Mock Balancer Vault
    mockBalancerVault = await deployMockBalancerVault();

    // Deploy Balancer Adapter
    const DragonBalancerAdapter = await ethers.getContractFactory("DragonBalancerAdapter");
    balancerAdapter = await DragonBalancerAdapter.deploy(
      mockBalancerVault.address,
      dragonToken.address,
      wrappedSonic.address,
      jackpotVault.address,
      ve69LPFeeDistributor.address,
      POOL_ID
    );
    await balancerAdapter.deployed();

    // Set the Balancer adapter in the Dragon token
    await dragonToken.setBalancerAdapter(balancerAdapter.address);

    // Mint initial supply to owner
    await dragonToken.mint(owner.address, INITIAL_SUPPLY);

    // Transfer some tokens to users for testing
    await wrappedSonic.transfer(user1.address, ethers.utils.parseEther("10000"));
    await dragonToken.transfer(user2.address, ethers.utils.parseEther("10000"));

    // Set up DragonToken in the mock vault
    await mockBalancerVault.mockSetReturnAmount(ethers.utils.parseEther("1000")); // 1:1 exchange rate
  });

  describe("Initialization", function () {
    it("should set the correct token addresses", async function () {
      expect(await balancerAdapter.dragonToken()).to.equal(dragonToken.address);
      expect(await balancerAdapter.wrappedSonic()).to.equal(wrappedSonic.address);
      expect(await balancerAdapter.jackpotVault()).to.equal(jackpotVault.address);
      expect(await balancerAdapter.ve69LPFeeDistributor()).to.equal(ve69LPFeeDistributor.address);
      expect(await balancerAdapter.dragonWSPoolId()).to.equal(POOL_ID);
    });

    it("should grant ADAPTER_ROLE to the adapter in Dragon token", async function () {
      const ADAPTER_ROLE = await dragonToken.ADAPTER_ROLE();
      expect(await dragonToken.hasRole(ADAPTER_ROLE, balancerAdapter.address)).to.be.true;
    });
  });

  describe("Swap wS to Dragon", function () {
    const swapAmount = ethers.utils.parseEther("100"); // 100 wS
    
    beforeEach(async function () {
      // Approve balancerAdapter to spend user1's wS
      await wrappedSonic.connect(user1).approve(balancerAdapter.address, swapAmount);
    });
    
    it("should swap wS for Dragon tokens with correct fee distribution", async function () {
      // Perform the swap
      await balancerAdapter.connect(user1).swapWSForDragon(
        swapAmount,
        0, // min amount out
        ethers.constants.MaxUint256 // deadline
      );
      
      // Check balances
      // The mock returns 1000 tokens, which will have fees applied
      const buyJackpotFee = ethers.utils.parseEther("1000").mul(690).div(10000);
      const buyVe69LPFee = ethers.utils.parseEther("1000").mul(241).div(10000);
      const buyBurnFee = ethers.utils.parseEther("1000").mul(69).div(10000);
      const finalAmount = ethers.utils.parseEther("1000").sub(buyJackpotFee).sub(buyVe69LPFee).sub(buyBurnFee);
      
      // User should receive tokens minus fees
      expect(await dragonToken.balanceOf(user1.address)).to.equal(finalAmount);
      
      // Check fee destinations received correct amounts
      expect(await dragonToken.balanceOf(jackpotVault.address)).to.equal(buyJackpotFee);
      expect(await dragonToken.balanceOf(ve69LPFeeDistributor.address)).to.equal(buyVe69LPFee);
      
      // Checking burn is more complex since it doesn't go to an address
      const totalSupply = await dragonToken.totalSupply();
      expect(totalSupply).to.equal(
        INITIAL_SUPPLY.sub(buyBurnFee) // Initial supply minus burned amount
      );
    });
  });
  
  describe("Swap Dragon to wS", function () {
    const swapAmount = ethers.utils.parseEther("100"); // 100 DRAGON
    
    beforeEach(async function () {
      // Approve balancerAdapter to spend user2's DRAGON
      await dragonToken.connect(user2).approve(balancerAdapter.address, swapAmount);
    });
    
    it("should swap Dragon for wS tokens with correct fee distribution", async function () {
      // Get initial balances
      const initialJackpotBalance = await dragonToken.balanceOf(jackpotVault.address);
      const initialVe69LPBalance = await dragonToken.balanceOf(ve69LPFeeDistributor.address);
      const initialTotalSupply = await dragonToken.totalSupply();
      
      // Perform the swap
      await balancerAdapter.connect(user2).swapDragonForWS(
        swapAmount,
        0, // min amount out
        ethers.constants.MaxUint256 // deadline
      );
      
      // Calculate fees
      const sellJackpotFee = swapAmount.mul(690).div(10000);
      const sellVe69LPFee = swapAmount.mul(241).div(10000);
      const sellBurnFee = swapAmount.mul(69).div(10000);
      const swapNetAmount = swapAmount.sub(sellJackpotFee).sub(sellVe69LPFee).sub(sellBurnFee);
      
      // User should receive wS tokens based on the swap
      expect(await wrappedSonic.balanceOf(user2.address)).to.equal(
        ethers.utils.parseEther("1000") // The mock returns 1000 tokens
      );
      
      // Check fee destinations received correct amounts
      expect(await dragonToken.balanceOf(jackpotVault.address)).to.equal(
        initialJackpotBalance.add(sellJackpotFee)
      );
      expect(await dragonToken.balanceOf(ve69LPFeeDistributor.address)).to.equal(
        initialVe69LPBalance.add(sellVe69LPFee)
      );
      
      // Verify burn
      expect(await dragonToken.totalSupply()).to.equal(
        initialTotalSupply.sub(sellBurnFee)
      );
    });
  });
  
  describe("Admin functions", function () {
    it("should update fee addresses correctly", async function () {
      const newJackpot = user1.address;
      const newVe69LP = user2.address;
      
      await balancerAdapter.updateFeeAddresses(newJackpot, newVe69LP);
      
      expect(await balancerAdapter.jackpotVault()).to.equal(newJackpot);
      expect(await balancerAdapter.ve69LPFeeDistributor()).to.equal(newVe69LP);
    });
    
    it("should update pool ID correctly", async function () {
      const newPoolId = ethers.utils.formatBytes32String("NEW-POOL-ID");
      
      await balancerAdapter.updatePoolId(newPoolId);
      
      expect(await balancerAdapter.dragonWSPoolId()).to.equal(newPoolId);
    });
    
    it("should rescue accidentally sent tokens", async function () {
      // Send some tokens directly to the adapter
      await dragonToken.transfer(balancerAdapter.address, ethers.utils.parseEther("100"));
      
      // Check initial balance
      const initialOwnerBalance = await dragonToken.balanceOf(owner.address);
      
      // Rescue tokens
      await balancerAdapter.rescueTokens(dragonToken.address, ethers.utils.parseEther("100"));
      
      // Check balances after rescue
      expect(await dragonToken.balanceOf(balancerAdapter.address)).to.equal(0);
      expect(await dragonToken.balanceOf(owner.address)).to.equal(
        initialOwnerBalance.add(ethers.utils.parseEther("100"))
      );
    });
  });
}); 