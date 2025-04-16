const { expect } = require("chai");
const { ethers } = require("hardhat");

// This test has been renamed to use GoldScratcher instead of GoldScratcherV2
// The code base only has GoldScratcher, not GoldScratcherV2
describe("GoldScratcher V2 Compatible Test", function () {
  let goldScratcher;
  let owner;
  let user1;
  let user2;
  let marketingRecipients;

  beforeEach(async function () {
    [owner, user1, user2, ...marketingRecipients] = await ethers.getSigners();
    
    // Use GoldScratcher instead of GoldScratcherV2
    const GoldScratcher = await ethers.getContractFactory("GoldScratcher");
    goldScratcher = await GoldScratcher.deploy(
      "Gold Scratcher",
      "GOLD",
      "https://api.reddragon.xyz/goldscratcher/",
      "unrevealed/",
      "winner/",
      "loser/"
    );
    await goldScratcher.deployed();
  });

  describe("Initialization", function() {
    it("should initialize with correct values", async function() {
      expect(await goldScratcher.name()).to.equal("Gold Scratcher");
      expect(await goldScratcher.symbol()).to.equal("GOLD");
      expect(await goldScratcher.MAX_SUPPLY()).to.equal(100);
      expect(await goldScratcher.SCRATCHER_BOOST()).to.equal(690);
      expect(await goldScratcher.remainingSupply()).to.equal(100);
    });
  });

  // We'll use a minimal subset of tests here to verify functionality
  // For complete coverage, refer to GoldScratcher.test.js
  describe("Interface Implementation", function() {
    it("should correctly implement IPromotionalItem interface", async function() {
      // Check interface methods
      expect(await goldScratcher.getItemType()).to.equal("GOLD_SCRATCHER");
      expect(await goldScratcher.getBoostType()).to.equal(0); // 0 = JACKPOT
      expect(await goldScratcher.getTransferType()).to.equal(1); // 1 = ONE_TIME_TRANSFER
    });
  });
}); 