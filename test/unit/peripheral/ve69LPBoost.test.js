const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ve69LPBoost", function () {
  let ve69LPToken, jackpot, booster;
  let owner, user1, user2, user3;
  
  // Test parameters
  const BOOST_PRECISION = 10000;
  const MAX_BOOST = 25000;
  const BASE_BOOST = 10000;
  
  before(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();
    
    // Deploy mock ve69LP token using the MockToken contract
    const MockToken = await ethers.getContractFactory("test/standalone-mocks/MockToken.sol:MockToken");
    ve69LPToken = await MockToken.deploy("ve69LP", "ve69LP", false);
    await ve69LPToken.deployed();
    
    // Deploy mock jackpot
    const MockJackpot = await ethers.getContractFactory("test/mocks/core/MockJackpot.sol:MockJackpot");
    jackpot = await MockJackpot.deploy();
    await jackpot.deployed();
    
    // Deploy ve69LPBoost
    const Ve69LPBoost = await ethers.getContractFactory("ve69LPBoost");
    booster = await Ve69LPBoost.deploy(ve69LPToken.address, jackpot.address);
    await booster.deployed();
    
    // Set up ve69LP balances for boost testing
    await ve69LPToken.mint(user1.address, ethers.utils.parseEther("1000"));  // 1% of supply
    await ve69LPToken.mint(user2.address, ethers.utils.parseEther("10000")); // 10% of supply
    await ve69LPToken.mint(user3.address, ethers.utils.parseEther("50000")); // 50% of supply
  });
  
  describe("Cubic Root Function", function () {
    it("should correctly calculate cubic root of 0", async function () {
      const result = await booster.cubicRoot(0);
      expect(result).to.equal(0);
    });
    
    it("should correctly calculate cubic root of BOOST_PRECISION (1.0)", async function () {
      const result = await booster.cubicRoot(BOOST_PRECISION);
      expect(result).to.equal(BOOST_PRECISION);
    });
    
    it("should correctly calculate cubic root of 0.1 in BOOST_PRECISION", async function () {
      const result = await booster.cubicRoot(Math.floor(BOOST_PRECISION / 10));
      // Result is approximately 0.46 in BOOST_PRECISION
      expect(result).to.be.gt(4500);
      expect(result).to.be.lt(4700);
    });
    
    it("should correctly calculate cubic root of 100.0 in BOOST_PRECISION", async function () {
      const result = await booster.cubicRoot(BOOST_PRECISION * 100);
      // Result is approximately 4.64 in BOOST_PRECISION
      expect(result).to.be.gt(46000);
      expect(result).to.be.lt(47000);
    });
  });
  
  describe("Boost Calculation", function () {
    it("should return base boost for user with no ve69LP", async function () {
      const emptyAddress = ethers.constants.AddressZero;
      const boost = await booster.calculateBoost(emptyAddress);
      expect(boost).to.equal(BASE_BOOST); // 100% = base boost
    });
    
    it("should calculate boost correctly for user1 (1% of ve69LP)", async function () {
      const boost = await booster.calculateBoost(user1.address);
      console.log("User1 boost (1% ve69LP):", boost.toString());
      expect(boost).to.be.gt(BASE_BOOST);
      expect(boost).to.be.lt(BASE_BOOST + 5000); // ~35% increase with cubic root
    });
    
    it("should calculate boost correctly for user2 (10% of ve69LP)", async function () {
      const boost = await booster.calculateBoost(user2.address);
      console.log("User2 boost (10% ve69LP):", boost.toString());
      expect(boost).to.be.gt(BASE_BOOST + 5000);
      expect(boost).to.be.lt(MAX_BOOST); // Less than 2.5x
    });
    
    it("should calculate boost correctly for user3 (50% of ve69LP)", async function () {
      const boost = await booster.calculateBoost(user3.address);
      console.log("User3 boost (50% ve69LP):", boost.toString());
      expect(boost).to.be.gt(BASE_BOOST + 10000);
      expect(boost).to.be.lt(MAX_BOOST); // Less than max 2.5x
    });
  });
  
  describe("Jackpot Entry With Boost", function () {
    it("should enter jackpot with boosted amount", async function () {
      const amount = ethers.utils.parseEther("100");
      
      // Get initial jackpot entry count
      const initialEntries = await jackpot.getTotalEntries();
      
      // Enter jackpot with boost
      await booster.enterJackpotWithBoost(user1.address, amount);
      
      // Check jackpot entry was created
      const newEntries = await jackpot.getTotalEntries();
      expect(newEntries).to.be.gt(initialEntries);
      
      // Check jackpot entry details
      const [entryUser, entryAmount] = await jackpot.getLastEntry();
      expect(entryUser).to.equal(user1.address);
      
      // Calculate expected entry with boost
      const user1Boost = await booster.calculateBoost(user1.address);
      const expectedAmount = amount.mul(user1Boost).div(BOOST_PRECISION);
      
      console.log("Entry amount:", ethers.utils.formatEther(entryAmount));
      console.log("Expected amount:", ethers.utils.formatEther(expectedAmount));
      
      // Check with tolerance for rounding
      const tolerance = ethers.utils.parseEther("0.01");
      expect(entryAmount).to.be.closeTo(expectedAmount, tolerance);
    });
    
    it("should fail when called by unauthorized address", async function () {
      const amount = ethers.utils.parseEther("100");
      
      // Try to call from user1 (not authorized)
      await expect(
        booster.connect(user1).enterJackpotWithBoost(user1.address, amount)
      ).to.be.revertedWith("Unauthorized caller");
    });
  });
  
  describe("Admin Functions", function () {
    it("should update jackpot address", async function () {
      const newJackpot = user1.address;
      await booster.setJackpot(newJackpot);
      expect(await booster.jackpot()).to.equal(newJackpot);
    });
    
    it("should update boost parameters", async function () {
      const newBaseBoost = 8000;  // 80%
      const newMaxBoost = 20000;  // 200%
      
      await booster.setBoostParameters(newBaseBoost, newMaxBoost);
      
      expect(await booster.baseBoost()).to.equal(newBaseBoost);
      expect(await booster.maxBoost()).to.equal(newMaxBoost);
      
      // Test boost calculation with new parameters
      const boost = await booster.calculateBoost(user1.address);
      expect(boost).to.be.gte(newBaseBoost);
      expect(boost).to.be.lte(newMaxBoost);
    });
    
    it("should fail when non-owner tries to update parameters", async function () {
      await expect(
        booster.connect(user1).setBoostParameters(5000, 15000)
      ).to.be.revertedWith("Ownable: caller is not the owner");
      
      await expect(
        booster.connect(user1).setJackpot(user2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
}); 