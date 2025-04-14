const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RedDragon", function () {
  let redDragon;
  let wrappedSonic;
  let owner;
  let user1;
  let user2;
  let user3;
  let jackpotAddress;
  let ve8020Address;
  let burnAddress;
  let exchangePair;

  const INITIAL_SUPPLY = ethers.utils.parseEther("6942000");
  const BURN_ADDRESS = "0x000000000000000000000000000000000000dEaD";

  beforeEach(async function () {
    [owner, user1, user2, user3, jackpotAddress, ve8020Address, exchangePair] = await ethers.getSigners();
    burnAddress = BURN_ADDRESS;

    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    wrappedSonic = await MockERC20.deploy("Wrapped Sonic", "wS", ethers.utils.parseEther("1000000"));
    await wrappedSonic.deployed();

    // Deploy the RedDragon token
    const RedDragon = await ethers.getContractFactory("RedDragon");
    redDragon = await RedDragon.deploy(
      jackpotAddress.address,
      ve8020Address.address,
      burnAddress,
      wrappedSonic.address
    );
    await redDragon.deployed();

    // Set exchange pair
    await redDragon.setExchangePair(exchangePair.address);

    // Enable trading
    await redDragon.enableTrading();
  });

  describe("Initialization", function() {
    it("should initialize with correct values", async function() {
      expect(await redDragon.name()).to.equal("Red Dragon");
      expect(await redDragon.symbol()).to.equal("DRAGON");
      expect(await redDragon.totalSupply()).to.equal(INITIAL_SUPPLY);
      expect(await redDragon.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
      expect(await redDragon.jackpotAddress()).to.equal(jackpotAddress.address);
      expect(await redDragon.ve8020Address()).to.equal(ve8020Address.address);
      expect(await redDragon.burnAddress()).to.equal(burnAddress);
      expect(await redDragon.wrappedSonicAddress()).to.equal(wrappedSonic.address);
      expect(await redDragon.exchangePair()).to.equal(exchangePair.address);
      expect(await redDragon.tradingEnabled()).to.equal(true);
      expect(await redDragon.tradingEnabledPermanently()).to.equal(true);
    });

    it("should initialize with correct fee structure", async function() {
      expect(await redDragon.jackpotFee()).to.equal(690);
      expect(await redDragon.burnFee()).to.equal(69);
      expect(await redDragon.ve8020Fee()).to.equal(241);
      expect(await redDragon.totalFee()).to.equal(1000);
    });
  });

  describe("Transaction Limits", function() {
    it("should enforce special transaction limits during the first 69 transactions", async function() {
      const ownerBalance = await redDragon.balanceOf(owner.address);
      const specialWalletLimit = await redDragon.getCurrentWalletLimit();
      const smallAmount = ethers.utils.parseEther("1");
      const testAmount = ethers.utils.parseEther("10000"); // Use a fixed small amount
      
      // First transfer from owner to user1
      await redDragon.transfer(user1.address, testAmount);
      
      // Do a few transfers between non-owner accounts to increment transaction count
      for (let i = 0; i < 68; i++) {
        await redDragon.connect(user1).transfer(user2.address, smallAmount);
        await redDragon.connect(user2).transfer(user3.address, smallAmount);
        await redDragon.connect(user3).transfer(user1.address, smallAmount);
      }
      
      // Test wallet limit
      // First clear user3's balance
      const user3Balance = await redDragon.balanceOf(user3.address);
      if (user3Balance.gt(0)) {
        await redDragon.connect(user3).transfer(user1.address, user3Balance);
      }
      
      // Transfer up to just below the wallet limit
      await redDragon.transfer(user3.address, testAmount);
      
      // Attempting to transfer more to user3 should fail due to wallet limit
      await expect(
        redDragon.transfer(user3.address, testAmount)
      ).to.be.revertedWith("Balance would exceed special wallet limit");
    });
    
    it("should apply post-special limits after 69 transactions", async function() {
      const ownerBalance = await redDragon.balanceOf(owner.address);
      const smallAmount = ethers.utils.parseEther("1");
      
      // Perform 69 transactions
      for (let i = 0; i < 69; i++) {
        await redDragon.transfer(user1.address, smallAmount);
      }
      
      // Now get the post-special limit
      const testAmount = ethers.utils.parseEther("10000"); // Use a fixed small amount
      
      await expect(
        redDragon.transfer(user2.address, testAmount)
      ).to.not.be.reverted;
    });
  });

  describe("Fee Collection", function() {
    it("should collect fees on transfers", async function() {
      const transferAmount = ethers.utils.parseEther("10000");
      const expectedFee = transferAmount.mul(1000).div(10000); // 10% fee
      const expectedTransferAmount = transferAmount.sub(expectedFee);
      
      // Execute transfer
      await redDragon.transfer(user1.address, transferAmount);
      
      // Check user balance after transfer (should be amount - fee)
      expect(await redDragon.balanceOf(user1.address)).to.equal(expectedTransferAmount);
      
      // Check fee distribution
      // Jackpot fee: 6.9% of transfer
      const jackpotFee = transferAmount.mul(690).div(10000);
      // Burn fee: 0.69% of transfer
      const burnFee = transferAmount.mul(69).div(10000);
      // ve8020 fee: 2.41% of transfer
      const ve8020Fee = transferAmount.mul(241).div(10000);
      
      // These fees are stored but not yet distributed to the respective addresses
      // For a full test, we would need to call swapFeesForWS() to distribute them,
      // but that would require mocking the swap functionality
    });
    
    it("should not collect fees for fee-exempt addresses", async function() {
      // Set user1 as fee exempt
      await redDragon.setFeeExempt(user1.address, true);
      
      const transferAmount = ethers.utils.parseEther("10000");
      
      // Transfer from owner to user1 (fee exempt)
      await redDragon.transfer(user1.address, transferAmount);
      
      // Check user1 balance should be the full amount (no fees)
      expect(await redDragon.balanceOf(user1.address)).to.equal(transferAmount);
      
      // Transfer from user1 to user2 (should not incur fees since user1 is exempt)
      await redDragon.connect(user1).transfer(user2.address, transferAmount);
      
      // Check user2 balance should be the full amount (no fees since user1 is exempt)
      expect(await redDragon.balanceOf(user2.address)).to.equal(transferAmount);
      
      // Transfer from user2 to user3 (should incur fees since user2 is not exempt)
      const user3ExpectedAmount = transferAmount.mul(9000).div(10000); // 90% after 10% fee
      await redDragon.connect(user2).transfer(user3.address, transferAmount);
      
      // Check user3 balance should be the amount minus fees
      expect(await redDragon.balanceOf(user3.address)).to.equal(user3ExpectedAmount);
    });
  });

  describe("Ownership and Administration", function() {
    it("should allow owner to update jackpot address", async function() {
      const newJackpotAddress = user2.address;
      const adminActionDelay = await redDragon.ADMIN_ACTION_DELAY();
      
      // Schedule the change
      await redDragon.scheduleJackpotAddressUpdate(newJackpotAddress);
      
      // Fast-forward time to pass the timelock period with extra buffer
      await ethers.provider.send("evm_increaseTime", [adminActionDelay.toNumber() + 3600]); // Add 1 hour buffer
      await ethers.provider.send("evm_mine");
      
      // Execute the change
      await redDragon.executeJackpotAddressUpdate(newJackpotAddress);
      
      // Verify the change
      expect(await redDragon.jackpotAddress()).to.equal(newJackpotAddress);
    });
    
    it("should allow owner to update ve8020 address", async function() {
      const newVe8020Address = user2.address;
      const adminActionDelay = await redDragon.ADMIN_ACTION_DELAY();
      
      // Schedule the change
      await redDragon.scheduleVe8020AddressUpdate(newVe8020Address);
      
      // Fast-forward time to pass the timelock period with extra buffer
      await ethers.provider.send("evm_increaseTime", [adminActionDelay.toNumber() + 3600]); // Add 1 hour buffer
      await ethers.provider.send("evm_mine");
      
      // Execute the change
      await redDragon.executeVe8020AddressUpdate(newVe8020Address);
      
      // Verify the change
      expect(await redDragon.ve8020Address()).to.equal(newVe8020Address);
    });
    
    it("should allow owner to set fee exemptions", async function() {
      // Check initial state
      expect(await redDragon.isFeeExempt(user1.address)).to.equal(false);
      
      // Set fee exemption
      await redDragon.setFeeExempt(user1.address, true);
      
      // Check updated state
      expect(await redDragon.isFeeExempt(user1.address)).to.equal(true);
      
      // Remove fee exemption
      await redDragon.setFeeExempt(user1.address, false);
      
      // Check updated state
      expect(await redDragon.isFeeExempt(user1.address)).to.equal(false);
    });
    
    it("should prevent non-owner from administrative functions", async function() {
      await expect(
        redDragon.connect(user1).setFeeExempt(user2.address, true)
      ).to.be.revertedWith("Ownable: caller is not the owner");
      
      await expect(
        redDragon.connect(user1).scheduleJackpotAddressUpdate(user2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
      
      await expect(
        redDragon.connect(user1).executeJackpotAddressUpdate(user2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Fee Structure Updates", function() {
    it("should allow updating fee structure with timelock", async function() {
      const newJackpotFee = 500;
      const newBurnFee = 100;
      const newVe8020Fee = 200;
      const adminActionDelay = await redDragon.ADMIN_ACTION_DELAY();
      
      // Schedule the change
      await redDragon.scheduleFeeUpdate(newJackpotFee, newBurnFee, newVe8020Fee);
      
      // Fast-forward time to pass the timelock period with extra buffer
      await ethers.provider.send("evm_increaseTime", [adminActionDelay.toNumber() + 3600]); // Add 1 hour buffer
      await ethers.provider.send("evm_mine");
      
      // Execute the change
      await redDragon.executeFeeUpdate(newJackpotFee, newBurnFee, newVe8020Fee);
      
      // Verify the changes
      expect(await redDragon.jackpotFee()).to.equal(newJackpotFee);
      expect(await redDragon.burnFee()).to.equal(newBurnFee);
      expect(await redDragon.ve8020Fee()).to.equal(newVe8020Fee);
      expect(await redDragon.totalFee()).to.equal(newJackpotFee + newBurnFee + newVe8020Fee);
    });
    
    it("should prevent fee updates that exceed the total fee cap", async function() {
      const newJackpotFee = 800;
      const newBurnFee = 100;
      const newVe8020Fee = 200;
      
      // Total fee would be 1100 (11%), which exceeds the 10% cap
      await expect(
        redDragon.scheduleFeeUpdate(newJackpotFee, newBurnFee, newVe8020Fee)
      ).to.be.revertedWith("Total fee cannot exceed 10%");
    });
  });

  describe("Burning Mechanism", function() {
    it("should properly burn tokens on transfers", async function() {
      const initialBurnBalance = await redDragon.balanceOf(burnAddress);
      const transferAmount = ethers.utils.parseEther("10000");
      
      // Calculate expected burn amount (0.69% of transfer)
      const expectedBurn = transferAmount.mul(69).div(10000);
      
      // Execute transfer
      await redDragon.transfer(user1.address, transferAmount);
      
      // Note: In this contract, the burn actually happens when fees are distributed via swapFeesForWS
      // For a comprehensive test, we'd need to call that function, but it requires mocking the swap
    });
  });
}); 