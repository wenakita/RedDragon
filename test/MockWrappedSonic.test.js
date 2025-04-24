const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MockWrappedSonic", function () {
  let mockWrappedSonic;
  let owner;
  let user;
  
  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    
    // Deploy the MockWrappedSonic contract
    const MockWrappedSonic = await ethers.getContractFactory("MockWrappedSonic");
    mockWrappedSonic = await MockWrappedSonic.deploy();
    await mockWrappedSonic.deployed();
  });
  
  describe("Basic functionality", function () {
    it("should have correct name and symbol", async function () {
      expect(await mockWrappedSonic.name()).to.equal("Wrapped Sonic");
      expect(await mockWrappedSonic.symbol()).to.equal("WSONIC");
    });
    
    it("should allow minting tokens", async function () {
      const amount = ethers.utils.parseEther("100");
      await mockWrappedSonic.mint(user.address, amount);
      
      expect(await mockWrappedSonic.balanceOf(user.address)).to.equal(amount);
    });
  });
  
  describe("Deposit functionality", function () {
    it("should create WSONIC tokens when depositing Sonic", async function () {
      const depositAmount = ethers.utils.parseEther("1.0");
      
      // Initial balance should be 0
      expect(await mockWrappedSonic.balanceOf(user.address)).to.equal(0);
      
      // Deposit Sonic and get WSONIC
      await mockWrappedSonic.connect(user).deposit({ value: depositAmount });
      
      // Should have received equivalent WSONIC tokens
      expect(await mockWrappedSonic.balanceOf(user.address)).to.equal(depositAmount);
    });
    
    it("should receive Sonic via direct transfer (receive function)", async function () {
      const depositAmount = ethers.utils.parseEther("2.0");
      
      // Send ETH directly to contract address
      await user.sendTransaction({
        to: mockWrappedSonic.address,
        value: depositAmount
      });
      
      // Should have received equivalent WSONIC tokens
      expect(await mockWrappedSonic.balanceOf(user.address)).to.equal(depositAmount);
    });
  });
  
  describe("Withdraw functionality", function () {
    it("should allow withdrawing Sonic by burning WSONIC", async function () {
      const depositAmount = ethers.utils.parseEther("5.0");
      const withdrawAmount = ethers.utils.parseEther("3.0");
      
      // First deposit some Sonic
      await mockWrappedSonic.connect(user).deposit({ value: depositAmount });
      
      // Check initial balances
      expect(await mockWrappedSonic.balanceOf(user.address)).to.equal(depositAmount);
      const initialSonicBalance = await ethers.provider.getBalance(user.address);
      
      // Withdraw some Sonic
      const withdrawTx = await mockWrappedSonic.connect(user).withdraw(withdrawAmount);
      const receipt = await withdrawTx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
      
      // Check final balances
      expect(await mockWrappedSonic.balanceOf(user.address)).to.equal(depositAmount.sub(withdrawAmount));
      
      // Calculate expected Sonic balance after withdrawal
      const expectedBalance = initialSonicBalance.add(withdrawAmount).sub(gasUsed);
      expect(await ethers.provider.getBalance(user.address)).to.be.closeTo(
        expectedBalance,
        ethers.utils.parseEther("0.01") // Allow small difference due to gas estimation
      );
    });
    
    it("should revert when trying to withdraw more than balance", async function () {
      const depositAmount = ethers.utils.parseEther("1.0");
      const withdrawAmount = ethers.utils.parseEther("2.0");
      
      // Deposit some Sonic
      await mockWrappedSonic.connect(user).deposit({ value: depositAmount });
      
      // Try to withdraw more than deposited
      await expect(
        mockWrappedSonic.connect(user).withdraw(withdrawAmount)
      ).to.be.reverted;
    });
  });
  
  describe("Integration with Dragon contract", function () {
    it("should be compatible with the Dragon contract's requirements", async function () {
      // This test verifies that MockWrappedSonic implements the interfaces needed for Dragon
      
      // Verify it's an ERC20 token with transfer and approve methods
      const amount = ethers.utils.parseEther("10");
      await mockWrappedSonic.mint(owner.address, amount);
      
      // Try basic ERC20 operations
      await mockWrappedSonic.approve(user.address, amount);
      await mockWrappedSonic.transfer(user.address, amount);
      
      expect(await mockWrappedSonic.balanceOf(user.address)).to.equal(amount);
      
      // Verify that the contract can receive and hold native currency (Sonic)
      const depositAmount = ethers.utils.parseEther("5.0");
      await owner.sendTransaction({
        to: mockWrappedSonic.address,
        value: depositAmount
      });
      
      // Contract balance should match the deposited amount
      expect(await ethers.provider.getBalance(mockWrappedSonic.address)).to.equal(depositAmount);
    });
  });
}); 