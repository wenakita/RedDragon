const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Dragon Contract", function () {
  let dragon;
  let mockWS;
  let owner;
  let user1;
  let user2;
  let jackpotAddress;
  let ve69LPAddress;
  let goldScratcherAddress;
  let exchangePair;
  let lotteryAddress;

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2, jackpotAddress, ve69LPAddress, goldScratcherAddress, exchangePair, lotteryAddress] = await ethers.getSigners();

    // Deploy mock wrapped Sonic token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockWS = await MockERC20.deploy("Wrapped Sonic", "wS", 18);
    await mockWS.deployed();
    
    // Deploy Dragon contract
    const Dragon = await ethers.getContractFactory("Dragon");
    dragon = await Dragon.deploy(
      "Dragon",
      "DRAGON",
      jackpotAddress.address,
      ve69LPAddress.address,
      mockWS.address
    );
    await dragon.deployed();

    // Set up Dragon contract
    await dragon.setGoldScratcherAddress(goldScratcherAddress.address);
    await dragon.setExchangePair(exchangePair.address);
    await dragon.setLotteryAddress(lotteryAddress.address);
    await dragon.setExcludedFromFees(owner.address, true);
  });

  describe("Initialization", function () {
    it("should initialize with correct values", async function () {
      expect(await dragon.name()).to.equal("Dragon");
      expect(await dragon.symbol()).to.equal("DRAGON");
      expect(await dragon.jackpotAddress()).to.equal(jackpotAddress.address);
      expect(await dragon.ve69LPAddress()).to.equal(ve69LPAddress.address);
      expect(await dragon.wrappedSonicAddress()).to.equal(mockWS.address);
      expect(await dragon.goldScratcherAddress()).to.equal(goldScratcherAddress.address);
      expect(await dragon.exchangePair()).to.equal(exchangePair.address);
      expect(await dragon.lotteryAddress()).to.equal(lotteryAddress.address);
    });

    it("should properly initialize flags", async function () {
      expect(await dragon.jackpotAddressInitialized()).to.equal(true);
      expect(await dragon.ve69LPAddressInitialized()).to.equal(true);
      expect(await dragon.wrappedSonicAddressInitialized()).to.equal(true);
      expect(await dragon.goldScratcherInitialized()).to.equal(true);
      expect(await dragon.areAddressesInitialized()).to.equal(true);
    });
  });

  describe("Fee Management", function () {
    it("should have correct default fees", async function () {
      const buyFees = await dragon.getBuyFees();
      expect(buyFees.jackpotFee).to.equal(690);
      expect(buyFees.ve69LPFee).to.equal(241);
      expect(buyFees.burnFee).to.equal(69);
      expect(buyFees.totalFee).to.equal(1000);

      const sellFees = await dragon.getSellFees();
      expect(sellFees.jackpotFee).to.equal(690);
      expect(sellFees.ve69LPFee).to.equal(241);
      expect(sellFees.burnFee).to.equal(69);
      expect(sellFees.totalFee).to.equal(1000);
    });

    it("should allow owner to update fees", async function () {
      await dragon.setBuyFees(500, 300, 100);
      const buyFees = await dragon.getBuyFees();
      expect(buyFees.jackpotFee).to.equal(500);
      expect(buyFees.ve69LPFee).to.equal(300);
      expect(buyFees.burnFee).to.equal(100);
      expect(buyFees.totalFee).to.equal(900);

      await dragon.setSellFees(400, 200, 100);
      const sellFees = await dragon.getSellFees();
      expect(sellFees.jackpotFee).to.equal(400);
      expect(sellFees.ve69LPFee).to.equal(200);
      expect(sellFees.burnFee).to.equal(100);
      expect(sellFees.totalFee).to.equal(700);
    });

    it("should not allow non-owner to update fees", async function () {
      await expect(
        dragon.connect(user1).setBuyFees(500, 300, 100)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      await expect(
        dragon.connect(user1).setSellFees(400, 200, 100)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should not allow fees exceeding 20%", async function () {
      await expect(
        dragon.setBuyFees(1500, 500, 100)
      ).to.be.revertedWith("Total fee cannot exceed 20%");

      await expect(
        dragon.setSellFees(1000, 1000, 100)
      ).to.be.revertedWith("Total fee cannot exceed 20%");
    });
  });

  describe("Fee Exclusion", function () {
    it("should correctly exclude addresses from fees", async function () {
      expect(await dragon.isExcludedFromFees(owner.address)).to.equal(true);
      expect(await dragon.isExcludedFromFees(user1.address)).to.equal(false);

      await dragon.setExcludedFromFees(user1.address, true);
      expect(await dragon.isExcludedFromFees(user1.address)).to.equal(true);

      await dragon.setExcludedFromFees(user1.address, false);
      expect(await dragon.isExcludedFromFees(user1.address)).to.equal(false);
    });

    it("should only allow owner to exclude addresses from fees", async function () {
      await expect(
        dragon.connect(user1).setExcludedFromFees(user2.address, true)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Transfers and Burning", function () {
    beforeEach(async function () {
      // Mint some tokens to owner
      await dragon.mint(owner.address, ethers.utils.parseEther("1000"));
    });

    it("should transfer tokens correctly", async function () {
      const amount = ethers.utils.parseEther("100");
      await dragon.transfer(user1.address, amount);
      expect(await dragon.balanceOf(user1.address)).to.equal(amount);
    });

    it("should burn 0.69% on transfer between non-excluded addresses", async function () {
      // Transfer from owner (excluded) to user1 (non-excluded)
      const initialAmount = ethers.utils.parseEther("100");
      await dragon.transfer(user1.address, initialAmount);
      
      // Transfer from user1 (non-excluded) to user2 (non-excluded)
      const transferAmount = ethers.utils.parseEther("50");
      await dragon.connect(user1).transfer(user2.address, transferAmount);
      
      // Calculate expected burn
      const burnAmount = transferAmount.mul(69).div(10000); // 0.69%
      const expectedReceived = transferAmount.sub(burnAmount);
      
      // Check balances
      expect(await dragon.balanceOf(user2.address)).to.equal(expectedReceived);
    });

    it("should not burn on transfer between excluded addresses", async function () {
      // Set user1 as excluded
      await dragon.setExcludedFromFees(user1.address, true);
      
      // Transfer from owner (excluded) to user1 (excluded)
      const initialAmount = ethers.utils.parseEther("100");
      await dragon.transfer(user1.address, initialAmount);
      
      // Transfer from user1 (excluded) to user2 (non-excluded)
      const transferAmount = ethers.utils.parseEther("50");
      await dragon.connect(user1).transfer(user2.address, transferAmount);
      
      // Check balances - should be exact amount
      expect(await dragon.balanceOf(user2.address)).to.equal(transferAmount);
    });

    it("should allow burning tokens", async function () {
      const burnAmount = ethers.utils.parseEther("10");
      const initialBalance = await dragon.balanceOf(owner.address);
      
      await dragon.burn(burnAmount);
      
      const finalBalance = await dragon.balanceOf(owner.address);
      expect(finalBalance).to.equal(initialBalance.sub(burnAmount));
    });
  });

  describe("Timelock Functionality", function () {
    it("should queue and execute actions", async function () {
      // Queue an action
      const actionType = "testAction";
      const data = ethers.utils.hexlify(ethers.utils.toUtf8Bytes("testData"));
      const actionId = await dragon.queueAction(actionType, data);
      
      // Check that the action is queued
      const pendingTime = await dragon.pendingActions(actionId);
      const delay = await dragon.ACTION_DELAY();
      expect(pendingTime).to.be.gt(0);
      
      // Advance time
      await ethers.provider.send("evm_increaseTime", [delay.toNumber()]);
      await ethers.provider.send("evm_mine");
      
      // Check that the action is ready
      expect(await dragon.canExecuteAction(actionId)).to.equal(true);
    });

    it("should allow cancelling queued actions", async function () {
      // Queue an action
      const actionType = "testAction";
      const data = ethers.utils.hexlify(ethers.utils.toUtf8Bytes("testData"));
      const actionId = await dragon.queueAction(actionType, data);
      
      // Cancel the action
      await dragon.cancelAction(actionId, "testing");
      
      // Check that the action is no longer queued
      const pendingTime = await dragon.pendingActions(actionId);
      expect(pendingTime).to.equal(0);
    });
  });

  describe("Address Update Functionality", function () {
    describe("First-time Setup", function () {
      it("should allow setting jackpot address directly for first time", async function () {
        // Deploy new Dragon contract
        const Dragon = await ethers.getContractFactory("Dragon");
        const newDragon = await Dragon.deploy(
          "Dragon",
          "DRAGON",
          ethers.constants.AddressZero, // Start with zero address to test initialization
          ve69LPAddress.address,
          mockWS.address
        );
        await newDragon.deployed();
        
        // We should be able to set jackpot address directly without timelock
        expect(await newDragon.jackpotAddressInitialized()).to.equal(false);
        await newDragon.setJackpotAddress(jackpotAddress.address);
        expect(await newDragon.jackpotAddress()).to.equal(jackpotAddress.address);
        expect(await newDragon.jackpotAddressInitialized()).to.equal(true);
      });

      it("should allow setting ve69LP address directly for first time", async function () {
        // Deploy new Dragon contract
        const Dragon = await ethers.getContractFactory("Dragon");
        const newDragon = await Dragon.deploy(
          "Dragon",
          "DRAGON",
          jackpotAddress.address,
          ethers.constants.AddressZero, // Start with zero address to test initialization
          mockWS.address
        );
        await newDragon.deployed();
        
        // We should be able to set ve69LP address directly without timelock
        expect(await newDragon.ve69LPAddressInitialized()).to.equal(false);
        await newDragon.setVe69LPAddress(ve69LPAddress.address);
        expect(await newDragon.ve69LPAddress()).to.equal(ve69LPAddress.address);
        expect(await newDragon.ve69LPAddressInitialized()).to.equal(true);
      });

      it("should allow setting wrappedSonic address directly for first time", async function () {
        // Deploy new Dragon contract
        const Dragon = await ethers.getContractFactory("Dragon");
        const newDragon = await Dragon.deploy(
          "Dragon",
          "DRAGON",
          jackpotAddress.address,
          ve69LPAddress.address,
          ethers.constants.AddressZero // Start with zero address to test initialization
        );
        await newDragon.deployed();
        
        // We should be able to set wrappedSonic address directly without timelock
        expect(await newDragon.wrappedSonicAddressInitialized()).to.equal(false);
        await newDragon.setWrappedSonicAddress(mockWS.address);
        expect(await newDragon.wrappedSonicAddress()).to.equal(mockWS.address);
        expect(await newDragon.wrappedSonicAddressInitialized()).to.equal(true);
      });
    });

    describe("Subsequent Updates", function () {
      it("should require timelock for subsequent jackpot address updates", async function () {
        // Set a new address for jackpot
        const newJackpotAddress = user1.address;
        
        // Since we've already initialized in beforeEach, this should queue an action
        await dragon.setJackpotAddress(newJackpotAddress);
        
        // The address shouldn't change yet
        expect(await dragon.jackpotAddress()).to.equal(jackpotAddress.address);
        
        // To properly test execution, we would need to extract the actionId and advance time
        // This is simplified here as timelock testing is covered in the timelock section
      });

      it("should require timelock for subsequent ve69LP address updates", async function () {
        // Set a new address for ve69LP
        const newVe69LPAddress = user1.address;
        
        // Since we've already initialized in beforeEach, this should queue an action
        await dragon.setVe69LPAddress(newVe69LPAddress);
        
        // The address shouldn't change yet
        expect(await dragon.ve69LPAddress()).to.equal(ve69LPAddress.address);
      });

      it("should require timelock for subsequent wrappedSonic address updates", async function () {
        // Set a new address for wrappedSonic
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const newMockWS = await MockERC20.deploy("New Wrapped Sonic", "newWS", 18);
        await newMockWS.deployed();
        
        // Since we've already initialized in beforeEach, this should queue an action
        await dragon.setWrappedSonicAddress(newMockWS.address);
        
        // The address shouldn't change yet
        expect(await dragon.wrappedSonicAddress()).to.equal(mockWS.address);
      });
    });
  });

  describe("Winning Scratcher", function () {
    it("should only allow goldScratcher to register winning scratchers", async function () {
      // Register winning scratcher from goldScratcher address
      await dragon.connect(goldScratcherAddress).registerWinningScratcher(1);
      expect(await dragon.winningScratcherIds(1)).to.equal(true);
      
      // Try to register from non-goldScratcher address
      await expect(
        dragon.connect(user1).registerWinningScratcher(2)
      ).to.be.revertedWith("Only Gold Scratcher contract can register winning scratchers");
    });
  });
}); 