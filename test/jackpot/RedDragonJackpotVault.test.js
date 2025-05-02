const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DragonJackpotVault", function () {
  let jackpotVault;
  let wrappedSonic;
  let dragonToken;
  let lottery;
  let owner;
  let user1;
  let multisig;

  beforeEach(async function () {
    [owner, user1, multisig] = await ethers.getSigners();

    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    wrappedSonic = await MockERC20.deploy("Wrapped Sonic", "wS", ethers.utils.parseEther("1000000"));
    await wrappedSonic.deployed();

    dragonToken = await MockERC20.deploy("Dragon Token", "DRAGON", ethers.utils.parseEther("1000000"));
    await dragonToken.deployed();

    // Deploy mock lottery
    const MockERC20ForLottery = await ethers.getContractFactory("MockERC20");
    lottery = await MockERC20ForLottery.deploy("Mock Lottery", "LOTTERY", ethers.utils.parseEther("1000000"));
    await lottery.deployed();

    // Deploy jackpot vault
    const DragonJackpotVault = await ethers.getContractFactory("DragonJackpotVault");
    jackpotVault = await DragonJackpotVault.deploy(wrappedSonic.address, multisig.address);
    await jackpotVault.deployed();

    // Set token and forward addresses
    await jackpotVault.connect(multisig).setTokenAddress(dragonToken.address);
    await jackpotVault.connect(multisig).setForwardAddress(lottery.address);

    // Transfer some wS to the vault
    await wrappedSonic.transfer(jackpotVault.address, ethers.utils.parseEther("10000"));
  });

  describe("Initialization", function() {
    it("should initialize with correct values", async function() {
      expect(await jackpotVault.wrappedSonic()).to.equal(wrappedSonic.address);
      expect(await jackpotVault.dragonToken()).to.equal(dragonToken.address);
      expect(await jackpotVault.forwardAddress()).to.equal(lottery.address);
      expect(await jackpotVault.owner()).to.equal(multisig.address);
      
      // Initial statistics
      expect(await jackpotVault.totalReceived()).to.equal(0);
      expect(await jackpotVault.totalForwarded()).to.equal(0);
    });
  });

  describe("Token Forwarding", function() {
    it("should forward tokens to the lottery contract", async function() {
      // Get initial balances
      const initialVaultBalance = await wrappedSonic.balanceOf(jackpotVault.address);
      const initialLotteryBalance = await wrappedSonic.balanceOf(lottery.address);
      
      // Forward tokens
      await jackpotVault.connect(user1).receiveAndForward();
      
      // Check balances after forwarding
      const finalVaultBalance = await wrappedSonic.balanceOf(jackpotVault.address);
      const finalLotteryBalance = await wrappedSonic.balanceOf(lottery.address);
      
      // Vault should be empty
      expect(finalVaultBalance).to.equal(0);
      
      // Lottery should have received the tokens
      expect(finalLotteryBalance).to.equal(initialLotteryBalance.add(initialVaultBalance));
      
      // Check statistics were updated
      expect(await jackpotVault.totalReceived()).to.equal(initialVaultBalance);
      expect(await jackpotVault.totalForwarded()).to.equal(initialVaultBalance);
      expect(await jackpotVault.lastForwardTime()).to.be.gt(0);
    });
    
    it("should prevent forwarding when no tokens are available", async function() {
      // First forward all tokens
      await jackpotVault.connect(user1).receiveAndForward();
      
      // Try to forward again
      await expect(
        jackpotVault.connect(user1).receiveAndForward()
      ).to.be.revertedWith("No wS to forward");
    });
    
    it("should allow owner to manually trigger forwarding", async function() {
      // Trigger forward as owner
      await jackpotVault.connect(multisig).triggerForward();
      
      // Check tokens were forwarded
      expect(await wrappedSonic.balanceOf(jackpotVault.address)).to.equal(0);
      expect(await wrappedSonic.balanceOf(lottery.address)).to.equal(ethers.utils.parseEther("10000"));
    });
  });

  describe("Configuration", function() {
    it("should allow owner to set token address", async function() {
      const newToken = await (await ethers.getContractFactory("MockERC20")).deploy(
        "New Token", "NEW", ethers.utils.parseEther("1000000")
      );
      await newToken.deployed();
      
      await jackpotVault.connect(multisig).setTokenAddress(newToken.address);
      
      expect(await jackpotVault.dragonToken()).to.equal(newToken.address);
    });
    
    it("should not allow non-owner to set token address", async function() {
      await expect(
        jackpotVault.connect(user1).setTokenAddress(user1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    
    it("should allow owner to set forward address", async function() {
      const newForwardAddress = user1.address;
      
      await jackpotVault.connect(multisig).setForwardAddress(newForwardAddress);
      
      expect(await jackpotVault.forwardAddress()).to.equal(newForwardAddress);
    });
    
    it("should not allow setting zero addresses", async function() {
      await expect(
        jackpotVault.connect(multisig).setTokenAddress(ethers.constants.AddressZero)
      ).to.be.revertedWith("Token address cannot be zero");
      
      await expect(
        jackpotVault.connect(multisig).setForwardAddress(ethers.constants.AddressZero)
      ).to.be.revertedWith("Forward address cannot be zero");
    });
  });

  describe("Emergency Controls", function() {
    it("should allow owner to perform emergency withdrawal", async function() {
      const initialBalance = await wrappedSonic.balanceOf(multisig.address);
      const vaultBalance = await wrappedSonic.balanceOf(jackpotVault.address);
      
      // Emergency withdraw all tokens
      await jackpotVault.connect(multisig).emergencyWithdraw(multisig.address, vaultBalance);
      
      // Check balances
      expect(await wrappedSonic.balanceOf(jackpotVault.address)).to.equal(0);
      expect(await wrappedSonic.balanceOf(multisig.address)).to.equal(initialBalance.add(vaultBalance));
    });
    
    it("should allow partial emergency withdrawal", async function() {
      const initialBalance = await wrappedSonic.balanceOf(multisig.address);
      const withdrawAmount = ethers.utils.parseEther("5000"); // Half of the vault balance
      
      // Partial emergency withdraw
      await jackpotVault.connect(multisig).emergencyWithdraw(multisig.address, withdrawAmount);
      
      // Check balances
      expect(await wrappedSonic.balanceOf(jackpotVault.address)).to.equal(ethers.utils.parseEther("5000"));
      expect(await wrappedSonic.balanceOf(multisig.address)).to.equal(initialBalance.add(withdrawAmount));
    });
    
    it("should not allow non-owner to perform emergency withdrawal", async function() {
      await expect(
        jackpotVault.connect(user1).emergencyWithdraw(user1.address, ethers.utils.parseEther("1000"))
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    
    it("should not allow emergency withdrawal to zero address", async function() {
      await expect(
        jackpotVault.connect(multisig).emergencyWithdraw(
          ethers.constants.AddressZero, ethers.utils.parseEther("1000")
        )
      ).to.be.revertedWith("Cannot withdraw to zero address");
    });
  });

  describe("ETH Handling", function() {
    it("should accept ETH via receive function", async function() {
      // Send ETH to the vault
      const tx = {
        to: jackpotVault.address,
        value: ethers.utils.parseEther("1.0")
      };
      
      await owner.sendTransaction(tx);
      
      // Check the vault received the ETH
      const balance = await ethers.provider.getBalance(jackpotVault.address);
      expect(balance).to.equal(ethers.utils.parseEther("1.0"));
    });
  });
}); 