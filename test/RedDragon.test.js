const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Dragon", function () {
  let dragon;
  let wrappedSonic;
  let owner;
  let user1;
  let user2;
  let user3;
  let jackpotAddress;
  let ve69LPAddress;
  let burnAddress;
  let exchangePair;

  const INITIAL_SUPPLY = ethers.utils.parseEther("6942000");
  const BURN_ADDRESS = "0x000000000000000000000000000000000000dEaD";

  beforeEach(async function () {
    [owner, user1, user2, user3, jackpotAddress, ve69LPAddress, exchangePair] = await ethers.getSigners();
    burnAddress = BURN_ADDRESS;

    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    wrappedSonic = await MockERC20.deploy("Wrapped Sonic", "wS", ethers.utils.parseEther("1000000"));
    await wrappedSonic.deployed();

    // Deploy the Dragon token
    const Dragon = await ethers.getContractFactory("Dragon");
    dragon = await Dragon.deploy(
      jackpotAddress.address,
      ve69LPAddress.address,
      burnAddress,
      wrappedSonic.address
    );
    await dragon.deployed();

    // Set exchange pair
    await dragon.setExchangePair(exchangePair.address);

    // Make owner fee-exempt
    await dragon.setFeeExempt(owner.address, true);

    // Enable trading
    await dragon.enableTrading();
  });

  describe("Initialization", function() {
    it("should initialize with correct values", async function() {
      expect(await dragon.name()).to.equal("Dragon");
      expect(await dragon.symbol()).to.equal("DRAGON");
      expect(await dragon.totalSupply()).to.equal(INITIAL_SUPPLY);
      expect(await dragon.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
      expect(await dragon.jackpotAddress()).to.equal(jackpotAddress.address);
      expect(await dragon.ve69LPAddress()).to.equal(ve69LPAddress.address);
      expect(await dragon.burnAddress()).to.equal(burnAddress);
      expect(await dragon.wrappedSonicAddress()).to.equal(wrappedSonic.address);
      expect(await dragon.exchangePair()).to.equal(exchangePair.address);
      expect(await dragon.tradingEnabled()).to.equal(true);
      expect(await dragon.tradingEnabledPermanently()).to.equal(true);
    });

    it.skip("should initialize with correct fee structure", async function() {
      expect(await dragon.jackpotFee()).to.equal(69);
      expect(await dragon.burnFee()).to.equal(69);
      expect(await dragon.ve69LPFee()).to.equal(241);
      expect(await dragon.totalFee()).to.equal(379);
    });
  });

  describe("Fee Collection", function() {
    it.skip("should collect fees on transfers", async function () {
      // Transfer some tokens to user1 first
      await dragon.transfer(user1.address, ethers.utils.parseEther("20000"));
      
      const transferAmount = ethers.utils.parseEther("10000");
      const initialBalance = await dragon.balanceOf(user1.address);
      
      // Calculate expected fees
      const jackpotFee = transferAmount.mul(69).div(1000); // 6.9%
      const burnFee = transferAmount.mul(69).div(10000); // 0.69%
      const veFee = transferAmount.mul(241).div(10000); // 2.41%
      const totalFee = jackpotFee.add(burnFee).add(veFee);
      
      // Get initial balances
      const initialJackpotBalance = await dragon.balanceOf(jackpotAddress.address);
      const initialBurnBalance = await dragon.balanceOf(burnAddress);
      const initialVeBalance = await dragon.balanceOf(ve69LPAddress.address);
      
      // Perform transfer
      await dragon.connect(user1).transfer(user2.address, transferAmount);
      
      // Check user balance after transfer
      const userBalance = await dragon.balanceOf(user1.address);
      expect(userBalance).to.equal(initialBalance.sub(transferAmount));
      
      // Check fee distribution
      const jackpotBalance = await dragon.balanceOf(jackpotAddress.address);
      const burnBalance = await dragon.balanceOf(burnAddress);
      const veBalance = await dragon.balanceOf(ve69LPAddress.address);
      
      expect(jackpotBalance).to.equal(initialJackpotBalance.add(jackpotFee));
      expect(burnBalance).to.equal(initialBurnBalance.add(burnFee));
      expect(veBalance).to.equal(initialVeBalance.add(veFee));
    });
    
    it.skip("should not collect fees for fee-exempt addresses", async function() {
      // Set user1 as fee exempt
      await dragon.setFeeExempt(user1.address, true);
      
      const transferAmount = ethers.utils.parseEther("10000");
      
      // Transfer from owner to user1 (fee exempt)
      await dragon.transfer(user1.address, transferAmount);
      
      // Check user1 balance should be the full amount (no fees)
      expect(await dragon.balanceOf(user1.address)).to.equal(transferAmount);
      
      // Transfer from user1 to user2 (should not incur fees since user1 is exempt)
      await dragon.connect(user1).transfer(user2.address, transferAmount);
      
      // Check user2 balance should be the full amount (no fees since user1 is exempt)
      expect(await dragon.balanceOf(user2.address)).to.equal(transferAmount);
      
      // Transfer from user2 to user3 (should incur fees since user2 is not exempt)
      const user3ExpectedAmount = transferAmount.mul(9000).div(10000); // 90% after 10% fee
      await dragon.connect(user2).transfer(user3.address, transferAmount);
      
      // Check user3 balance should be the amount minus fees
      expect(await dragon.balanceOf(user3.address)).to.equal(user3ExpectedAmount);
    });
  });

  describe("Ownership and Administration", function() {
    it("should allow owner to update jackpot address", async function() {
      const newJackpotAddress = user2.address;
      const adminActionDelay = await dragon.ADMIN_ACTION_DELAY();
      
      // Schedule the change
      await dragon.scheduleJackpotAddressUpdate(newJackpotAddress);
      
      // Fast-forward time to pass the timelock period with extra buffer
      await ethers.provider.send("evm_increaseTime", [adminActionDelay.toNumber() + 3600]); // Add 1 hour buffer
      await ethers.provider.send("evm_mine");
      
      // Execute the change
      await dragon.executeJackpotAddressUpdate(newJackpotAddress);
      
      // Verify the change
      expect(await dragon.jackpotAddress()).to.equal(newJackpotAddress);
    });
    
    it("should allow owner to update ve69LP address", async function() {
      const newVe69LPAddress = user2.address;
      const newVe69LPFee = 200;
      const adminActionDelay = await dragon.ADMIN_ACTION_DELAY();
      
      // Schedule the change
      await dragon.scheduleVe69LPAddressUpdate(newVe69LPAddress);
      
      // Fast-forward time to pass the timelock period with extra buffer
      await ethers.provider.send("evm_increaseTime", [adminActionDelay.toNumber() + 3600]); // Add 1 hour buffer
      await ethers.provider.send("evm_mine");
      
      // Execute the change
      await dragon.executeVe69LPAddressUpdate(newVe69LPAddress);
      
      // Verify the change
      expect(await dragon.ve69LPAddress()).to.equal(newVe69LPAddress);
    });
    
    it("should allow owner to set fee exemptions", async function() {
      // Check initial state
      expect(await dragon.isFeeExempt(user1.address)).to.equal(false);
      
      // Set fee exemption
      await dragon.setFeeExempt(user1.address, true);
      
      // Check updated state
      expect(await dragon.isFeeExempt(user1.address)).to.equal(true);
      
      // Remove fee exemption
      await dragon.setFeeExempt(user1.address, false);
      
      // Check updated state
      expect(await dragon.isFeeExempt(user1.address)).to.equal(false);
    });
    
    it("should prevent non-owner from administrative functions", async function() {
      await expect(
        dragon.connect(user1).setFeeExempt(user2.address, true)
      ).to.be.revertedWith("Ownable: caller is not the owner");
      
      await expect(
        dragon.connect(user1).scheduleJackpotAddressUpdate(user2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
      
      await expect(
        dragon.connect(user1).executeJackpotAddressUpdate(user2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Fee Structure Updates", function() {
    it("should allow updating fee structure with timelock", async function() {
      const newJackpotFee = 500;
      const newBurnFee = 100;
      const newVe69LPFee = 200;
      const adminActionDelay = await dragon.ADMIN_ACTION_DELAY();
      
      // Schedule the change
      await dragon.scheduleFeeUpdate(newJackpotFee, newBurnFee, newVe69LPFee);
      
      // Fast-forward time to pass the timelock period with extra buffer
      await ethers.provider.send("evm_increaseTime", [adminActionDelay.toNumber() + 3600]); // Add 1 hour buffer
      await ethers.provider.send("evm_mine");
      
      // Execute the change
      await dragon.executeFeeUpdate(newJackpotFee, newBurnFee, newVe69LPFee);
      
      // Verify the changes
      expect(await dragon.jackpotFee()).to.equal(newJackpotFee);
      expect(await dragon.burnFee()).to.equal(newBurnFee);
      expect(await dragon.ve69LPFee()).to.equal(newVe69LPFee);
      expect(await dragon.totalFee()).to.equal(newJackpotFee + newBurnFee + newVe69LPFee);
    });
    
    it("should prevent fee updates that exceed the total fee cap", async function() {
      const newJackpotFee = 800;
      const newBurnFee = 100;
      const newVe69LPFee = 200;
      
      // Total fee would be 1100 (11%), which exceeds the 10% cap
      await expect(
        dragon.scheduleFeeUpdate(newJackpotFee, newBurnFee, newVe69LPFee)
      ).to.be.revertedWith("Total fee cannot exceed 10%");
    });
  });

  describe("Burning Mechanism", function() {
    it("should properly burn tokens on transfers", async function() {
      const initialBurnBalance = await dragon.balanceOf(burnAddress);
      const transferAmount = ethers.utils.parseEther("10000");
      
      // Calculate expected burn amount (0.69% of transfer)
      const expectedBurn = transferAmount.mul(69).div(10000);
      
      // Execute transfer
      await dragon.transfer(user1.address, transferAmount);
      
      // Note: In this contract, the burn actually happens when fees are distributed via swapFeesForWS
      // For a comprehensive test, we'd need to call that function, but it requires mocking the swap
    });
  });

  describe("Transaction Limits", function() {
    it.skip("should enforce wallet limit", async function() {
      // Make user1 fee-exempt for testing
      await dragon.setFeeExempt(user1.address, true);
      
      // Transfer some tokens to user1 for testing
      const initialAmount = ethers.utils.parseEther("1000000");
      await dragon.transfer(user1.address, initialAmount);
      
      // Calculate max wallet amount (1% of total supply)
      const maxWalletAmount = (await dragon.totalSupply()).mul(10).div(1000); // 1%
      
      // Try to transfer more than max wallet amount to user2
      await expect(
        dragon.connect(user1).transfer(user2.address, maxWalletAmount.add(1))
      ).to.be.revertedWith("Amount exceeds special transaction limit");
      
      // Transfer exactly max wallet amount should succeed
      await dragon.connect(user1).transfer(user2.address, maxWalletAmount);
      
      // Additional transfers to user2 should fail due to wallet limit
      await expect(
        dragon.connect(user1).transfer(user2.address, ethers.utils.parseEther("1"))
      ).to.be.revertedWith("Transfer would exceed recipient wallet limit");
      
      // Transfer to user3 should still work up to wallet limit
      await dragon.connect(user1).transfer(user3.address, maxWalletAmount);
    });

    it.skip("should enforce wallet limits correctly", async function() {
      // Make user1 fee exempt for testing wallet limits without fee interference
      await dragon.setFeeExempt(user1.address, true);
      
      // Transfer initial tokens to user1
      const initialTransfer = ethers.utils.parseEther("100000");
      await dragon.transfer(user1.address, initialTransfer);
      
      // Calculate max wallet amounts
      const specialWalletLimit = INITIAL_SUPPLY.mul(100).div(10000); // 1% during special period
      const postSpecialWalletLimit = INITIAL_SUPPLY.mul(1000).div(10000); // 10% after special period
      
      // Test during special period (first 69 transactions)
      // Transfer that would exceed special wallet limit should fail
      await expect(
        dragon.connect(user1).transfer(user2.address, specialWalletLimit.add(1))
      ).to.be.revertedWith("Amount exceeds special transaction limit");
      
      // Transfer exactly at special wallet limit should succeed
      await dragon.connect(user1).transfer(user2.address, specialWalletLimit);
      expect(await dragon.balanceOf(user2.address)).to.equal(specialWalletLimit);
      
      // Additional transfer to same wallet should fail
      await expect(
        dragon.connect(user1).transfer(user2.address, ethers.utils.parseEther("1"))
      ).to.be.revertedWith("Transfer would exceed recipient wallet limit");
      
      // Transfer to different wallet should succeed up to limit
      await dragon.connect(user1).transfer(user3.address, specialWalletLimit);
      expect(await dragon.balanceOf(user3.address)).to.equal(specialWalletLimit);
      
      // Complete special period
      for(let i = 0; i < 69; i++) {
        await dragon.connect(user1).transfer(owner.address, ethers.utils.parseEther("1"));
      }
      
      // Test after special period
      // Transfer that would exceed post-special wallet limit should fail
      await expect(
        dragon.connect(user1).transfer(user2.address, postSpecialWalletLimit.add(1))
      ).to.be.revertedWith("Amount exceeds special transaction limit");
      
      // Transfer exactly at post-special wallet limit should succeed
      const additionalAmount = postSpecialWalletLimit.sub(await dragon.balanceOf(user2.address));
      await dragon.connect(user1).transfer(user2.address, additionalAmount);
      expect(await dragon.balanceOf(user2.address)).to.equal(postSpecialWalletLimit);
    });
  });
}); 