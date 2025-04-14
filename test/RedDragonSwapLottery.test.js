const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RedDragonSwapLottery", function () {
  let redDragonSwapLottery;
  let wrappedSonic;
  let owner;
  let user1;
  let user2;
  let exchangePair;

  beforeEach(async function () {
    [owner, user1, user2, exchangePair] = await ethers.getSigners();

    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    wrappedSonic = await MockERC20.deploy("Wrapped Sonic", "wS", ethers.utils.parseEther("1000000"));
    await wrappedSonic.deployed();

    // Deploy the lottery contract
    const MockRedDragonSwapLottery = await ethers.getContractFactory("MockRedDragonSwapLottery");
    redDragonSwapLottery = await MockRedDragonSwapLottery.deploy(wrappedSonic.address, ethers.constants.AddressZero);
    await redDragonSwapLottery.deployed();

    // Fund the lottery contract with wS for jackpots
    await wrappedSonic.transfer(redDragonSwapLottery.address, ethers.utils.parseEther("1000"));
  });

  describe("Initialization", function() {
    it("should initialize with correct values", async function() {
      expect(await redDragonSwapLottery.wrappedSonic()).to.equal(wrappedSonic.address);
      
      const jackpot = await redDragonSwapLottery.getCurrentJackpot();
      expect(jackpot).to.equal(0); // Initially 0 until we set it
      
      const stats = await redDragonSwapLottery.getStats();
      expect(stats.current).to.equal(0);
    });
  });

  describe("Jackpot Management", function() {
    it("should add to the jackpot correctly", async function() {
      const initialJackpot = await redDragonSwapLottery.jackpot();
      const addAmount = ethers.utils.parseEther("500");
      
      await redDragonSwapLottery.addToJackpot(addAmount);
      
      const newJackpot = await redDragonSwapLottery.jackpot();
      expect(newJackpot).to.equal(initialJackpot.add(addAmount));
    });
  });
}); 