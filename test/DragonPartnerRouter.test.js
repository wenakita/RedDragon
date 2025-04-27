// SPDX-License-Identifier: MIT
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DragonPartnerRouter", function () {
  let DragonPartnerRouter;
  let router;
  let partnerRegistry;
  let shadowRouter;
  let quoter;
  let jackpot;
  let ve69LP;
  let booster;
  let redDragonToken;
  let partnerToken;
  let wrappedSonicToken;
  let owner;
  let user1;
  let user2;
  let partner1;
  let partner2;

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2, partner1, partner2] = await ethers.getSigners();

    // Deploy mock tokens and contracts
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    redDragonToken = await MockERC20.deploy("Red Dragon", "RDGS", 18);
    partnerToken = await MockERC20.deploy("X33 Token", "X33", 18);
    wrappedSonicToken = await MockERC20.deploy("Wrapped Sonic", "wS", 18);

    // Deploy mock contracts
    const MockRouter = await ethers.getContractFactory("MockShadowRouter");
    shadowRouter = await MockRouter.deploy();

    const MockQuoter = await ethers.getContractFactory("MockShadowQuoter");
    quoter = await MockQuoter.deploy();

    const MockJackpot = await ethers.getContractFactory("MockJackpot");
    jackpot = await MockJackpot.deploy();

    // Deploy ve69LP fee distributor
    ve69LP = await ethers.deployContract("MockFeeDistributor");

    // Deploy boost calculator
    const MockBooster = await ethers.getContractFactory("MockBooster");
    booster = await MockBooster.deploy();

    // Deploy partner registry
    const DragonPartnerRegistry = await ethers.getContractFactory("DragonPartnerRegistry");
    partnerRegistry = await DragonPartnerRegistry.deploy();

    // Deploy the router
    DragonPartnerRouter = await ethers.getContractFactory("DragonPartnerRouter");
    router = await DragonPartnerRouter.deploy(
      partnerRegistry.address,
      shadowRouter.address,
      quoter.address,
      jackpot.address,
      ve69LP.address,
      booster.address,
      redDragonToken.address,
      partnerToken.address,
      wrappedSonicToken.address
    );

    // Setup the registry
    await partnerRegistry.addPartner(partner1.address, "Partner 1", 5000, 200); // 50% fee share, 2% probability boost
    await partnerRegistry.addPartner(partner2.address, "Partner 2", 3000, 100); // 30% fee share, 1% probability boost

    // Authorize the router as distributor
    await partnerRegistry.setDistributorAuthorization(router.address, true);

    // Mint tokens to users
    await partnerToken.mint(user1.address, ethers.utils.parseEther("1000"));
    await partnerToken.mint(user2.address, ethers.utils.parseEther("1000"));

    // Approve tokens for router
    await partnerToken.connect(user1).approve(router.address, ethers.utils.parseEther("1000"));
    await partnerToken.connect(user2).approve(router.address, ethers.utils.parseEther("1000"));
  });

  describe("Initialization", function () {
    it("Should set the correct addresses and references", async function () {
      expect(await router.partnerRegistry()).to.equal(partnerRegistry.address);
      expect(await router.router()).to.equal(shadowRouter.address);
      expect(await router.quoter()).to.equal(quoter.address);
      expect(await router.jackpot()).to.equal(jackpot.address);
      expect(await router.ve69LP()).to.equal(ve69LP.address);
      expect(await router.booster()).to.equal(booster.address);
      expect(await router.redDragonToken()).to.equal(redDragonToken.address);
      expect(await router.partnerToken()).to.equal(partnerToken.address);
      expect(await router.wrappedSonicToken()).to.equal(wrappedSonicToken.address);
    });
  });

  describe("Partner-based swaps", function () {
    it("Should execute swaps through partners with correct fee sharing", async function () {
      // Setup return values for mocks
      await shadowRouter.setReturnAmount(ethers.utils.parseEther("100")); // 100 redDragon for output
      await quoter.setQuoteAmount(ethers.utils.parseEther("1")); // 1:1 ratio for price calculation

      const swapAmount = ethers.utils.parseEther("10");
      const minOutput = ethers.utils.parseEther("1");
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      // Partner ID 1 (partner1)
      const partnerId = 1;

      // Execute swap through a partner
      const tx = await router.connect(user1).swapPartnerTokenForRedDragonWithPartner(
        swapAmount,
        minOutput,
        deadline,
        partnerId
      );

      // Check events emitted
      await expect(tx).to.emit(router, "PartnerSwap")
        .withArgs(partner1.address, user1.address, partnerId, swapAmount, anyValue, anyValue);

      // Check that partner got their fee share
      const partnerFeeShould = swapAmount.mul(69).div(10000).mul(5000).div(10000);
      const partnerFeeRecord = await partnerRegistry.partners(partnerId);
      expect(partnerFeeRecord.totalFeesEarned).to.equal(partnerFeeShould);
    });

    it("Should execute direct swaps without partner", async function () {
      // Setup return values for mocks
      await shadowRouter.setReturnAmount(ethers.utils.parseEther("100")); // 100 redDragon for output
      await quoter.setQuoteAmount(ethers.utils.parseEther("1")); // 1:1 ratio for price calculation

      const swapAmount = ethers.utils.parseEther("10");
      const minOutput = ethers.utils.parseEther("1");
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      // Execute direct swap
      const tx = await router.connect(user1).swapPartnerTokenForRedDragon(
        swapAmount,
        minOutput,
        deadline
      );

      // Check events emitted
      await expect(tx).to.emit(router, "DirectSwap")
        .withArgs(user1.address, swapAmount, anyValue);
    });
  });

  describe("Price calculation", function () {
    it("Should calculate wrapped Sonic equivalent correctly", async function () {
      await quoter.setQuoteAmount(ethers.utils.parseEther("2")); // 1 partner token = 2 wS
      
      const amount = ethers.utils.parseEther("10");
      const result = await router.calculateWrappedSonicEquivalent(amount);
      
      expect(result).to.equal(ethers.utils.parseEther("20")); // 10 * 2 = 20 wS
    });
  });

  describe("Jackpot entry", function () {
    it("Should enter jackpot with correct boosted amount", async function () {
      // Setup mocks
      await shadowRouter.setReturnAmount(ethers.utils.parseEther("100")); // 100 redDragon for output
      await quoter.setQuoteAmount(ethers.utils.parseEther("1")); // 1:1 ratio
      await booster.setBoostMultiplier(12000); // 1.2x boost
      
      const swapAmount = ethers.utils.parseEther("10");
      const minOutput = ethers.utils.parseEther("1");
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      
      // Execute swap
      await router.connect(user1).swapPartnerTokenForRedDragon(
        swapAmount,
        minOutput,
        deadline
      );
      
      // Check entry to jackpot
      // Expected: 10 * probability adjustment * boost
      // 10 * (69/100) * 1.2 = 8.28 wS
      const expectedEntry = ethers.utils.parseEther("10")
        .mul(69).div(100)
        .mul(12000).div(10000);
      
      expect(await jackpot.getLastEntry()).to.equal(expectedEntry);
      expect(await jackpot.getLastUser()).to.equal(user1.address);
    });
  });

  describe("Admin functions", function () {
    it("Should update partner token successfully", async function () {
      // Deploy new token
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const newToken = await MockERC20.deploy("New Partner Token", "NPT", 18);
      
      // Update to new token
      await router.updatePartnerToken(newToken.address);
      
      // Check updated token
      expect(await router.partnerToken()).to.equal(newToken.address);
    });
    
    it("Should update price method successfully", async function () {
      // Initial setting should be CONTRACT_RATIOS (1)
      expect(await router.priceMethod()).to.equal(1);
      
      // Update to MANUAL (0)
      await router.setPriceMethod(0);
      expect(await router.priceMethod()).to.equal(0);
    });
  });
});

// Helper for event arg matching
function anyValue() {
  return true;
} 