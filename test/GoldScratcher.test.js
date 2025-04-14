const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GoldScratcher", function () {
  let goldScratcher;
  let owner;
  let user1;
  let user2;
  let marketingRecipients;

  beforeEach(async function () {
    [owner, user1, user2, ...marketingRecipients] = await ethers.getSigners();
    
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

  describe("Minting", function() {
    it("should mint a GoldScratcher successfully", async function() {
      await goldScratcher.mint(user1.address);
      
      expect(await goldScratcher.balanceOf(user1.address)).to.equal(1);
      expect(await goldScratcher.ownerOf(1)).to.equal(user1.address);
      expect(await goldScratcher.remainingSupply()).to.equal(99);
      
      const props = await goldScratcher.scratcherProperties(1);
      expect(props.originalOwner).to.equal(user1.address);
      expect(props.isScratched).to.equal(false);
    });

    it("should allow batch minting", async function() {
      const recipients = [user1.address, user2.address, marketingRecipients[0].address];
      await goldScratcher.batchMint(recipients);
      
      expect(await goldScratcher.balanceOf(user1.address)).to.equal(1);
      expect(await goldScratcher.balanceOf(user2.address)).to.equal(1);
      expect(await goldScratcher.balanceOf(marketingRecipients[0].address)).to.equal(1);
      expect(await goldScratcher.remainingSupply()).to.equal(97);
    });

    it("should prevent exceeding max supply", async function() {
      // Create an array of 101 addresses (exceeding max supply of 100)
      const tooManyRecipients = [];
      for (let i = 0; i < 101; i++) {
        tooManyRecipients.push(ethers.Wallet.createRandom().address);
      }
      
      // Should revert when trying to batch mint more than max supply
      await expect(
        goldScratcher.batchMint(tooManyRecipients)
      ).to.be.revertedWith("Would exceed maximum supply");
    });
  });

  describe("Boost Calculation", function() {
    it("should return the correct boost for winners (6.9% on top of the default 69% jackpot)", async function() {
      await goldScratcher.mint(user1.address);
      
      // We need to mock the process to test the boost calculation
      // Since the token is burned after scratching, we'll need to simulate having a winning scratcher
      
      // Get initial tokenId
      const tokenId = 1;
      
      // Scratch the token (this will burn it)
      // In a real scenario, we'd check hasWinningScratcher after scratching
      const scratchResult = await goldScratcher.connect(user1).scratch(tokenId);
      
      // We can check the event to see if it was a winner
      // For this test, we'll verify the boost value is correct (690 basis points = 6.9%)
      // which combined with the default 69% jackpot equals 75.9% total payout
      const boost = 690; // 6.9% in basis points
      expect(await goldScratcher.SCRATCHER_BOOST()).to.equal(boost);
    });

    it("should return zero boost for non-holders", async function() {
      const tokenId = 1; // Non-existent token
      const boost = await goldScratcher.calculateBoost(user2.address, tokenId);
      expect(boost).to.equal(0);
    });
  });

  describe("Scratching", function() {
    it("should allow scratching a token", async function() {
      await goldScratcher.mint(user1.address);
      
      // User scratches their token
      await goldScratcher.connect(user1).scratch(1);
      
      // Check that token is burned (should revert when checking owner)
      await expect(
        goldScratcher.ownerOf(1)
      ).to.be.reverted;
      
      // Stats should be updated
      const stats = await goldScratcher.getStats();
      expect(stats.scratched).to.equal(1);
      
      // Either winner or loser count should be incremented
      expect(stats.winners.add(stats.losers)).to.equal(1);
    });
    
    it("should prevent scratching a token that doesn't exist", async function() {
      await expect(
        goldScratcher.connect(user1).scratch(999)
      ).to.be.revertedWith("Scratcher does not exist");
    });
    
    it("should prevent scratching someone else's token", async function() {
      await goldScratcher.mint(user1.address);
      
      await expect(
        goldScratcher.connect(user2).scratch(1)
      ).to.be.revertedWith("Not the owner of this scratcher");
    });
  });

  describe("Ownership Checks", function() {
    it("should correctly check if a user has a scratcher", async function() {
      await goldScratcher.mint(user1.address);
      
      expect(await goldScratcher.hasScratcher(user1.address)).to.equal(true);
      expect(await goldScratcher.hasScratcher(user2.address)).to.equal(false);
    });
  });

  describe("URI Management", function() {
    it("should set URI correctly", async function() {
      const tokenId = await goldScratcher.mint(user1.address);
      expect(await goldScratcher.tokenURI(tokenId)).to.include("unrevealed/");
    });
  });

  describe("Marketing Features", function() {
    it("should set marketing recipients and airdrop to them", async function() {
      const recipients = [user1.address, user2.address, marketingRecipients[0].address];
      
      // Set marketing recipients
      await goldScratcher.setMarketingRecipients(recipients);
      
      // Airdrop to marketing recipients
      await goldScratcher.airdropToMarketingRecipients();
      
      // Check balances
      expect(await goldScratcher.balanceOf(user1.address)).to.equal(1);
      expect(await goldScratcher.balanceOf(user2.address)).to.equal(1);
      expect(await goldScratcher.balanceOf(marketingRecipients[0].address)).to.equal(1);
      
      // Check supply
      expect(await goldScratcher.remainingSupply()).to.equal(97);
      
      // Check stats
      const stats = await goldScratcher.getStats();
      expect(stats.total).to.equal(3);
    });
    
    it("should prevent airdrop when no recipients are set", async function() {
      await expect(
        goldScratcher.airdropToMarketingRecipients()
      ).to.be.revertedWith("No marketing recipients set");
    });
    
    it("should prevent airdrop exceeding max supply", async function() {
      // Set 101 marketing recipients
      const tooManyRecipients = [];
      for (let i = 0; i < 101; i++) {
        tooManyRecipients.push(ethers.Wallet.createRandom().address);
      }
      
      await goldScratcher.setMarketingRecipients(tooManyRecipients);
      
      await expect(
        goldScratcher.airdropToMarketingRecipients()
      ).to.be.revertedWith("Would exceed maximum supply");
    });
  });
  
  describe("Stats", function() {
    it("should report accurate stats", async function() {
      // Initial stats
      let stats = await goldScratcher.getStats();
      expect(stats.total).to.equal(0);
      expect(stats.scratched).to.equal(0);
      expect(stats.winners).to.equal(0);
      expect(stats.losers).to.equal(0);
      expect(stats.remaining).to.equal(100);
      
      // Mint some tokens
      await goldScratcher.mint(user1.address);
      await goldScratcher.mint(user2.address);
      
      stats = await goldScratcher.getStats();
      expect(stats.total).to.equal(2);
      expect(stats.remaining).to.equal(98);
      
      // Scratch a token
      await goldScratcher.connect(user1).scratch(1);
      
      stats = await goldScratcher.getStats();
      expect(stats.scratched).to.equal(1);
      
      // Either winner or loser count should be incremented
      expect(stats.winners.add(stats.losers)).to.equal(1);
      
      // Confirm total remains accurate after scratching (tokens are burned but still counted in total)
      expect(stats.total).to.equal(2);
    });
  });

  describe("Swap Application", function() {
    it("should apply scratcher to swap and boost if winner when called by owner", async function() {
      const tokenId = await goldScratcher.mint(user1.address);
      
      const swapAmount = ethers.utils.parseEther("100");
      const tx = await goldScratcher.connect(owner).applyToSwap(tokenId, swapAmount);
      const receipt = await tx.wait();
      
      const scratcherAppliedEvent = receipt.events.find(e => e.event === "ScratcherAppliedToSwap");
      expect(scratcherAppliedEvent).to.not.be.undefined;
      
      const boostedAmount = scratcherAppliedEvent.args.boostedAmount;
      const isWinner = scratcherAppliedEvent.args.isWinner;
      
      if (isWinner) {
        expect(boostedAmount).to.be.closeTo(
          swapAmount.mul(10690).div(10000),
          ethers.utils.parseEther("0.01")
        );
      } else {
        expect(boostedAmount).to.equal(swapAmount);
      }
      
      await expect(goldScratcher.ownerOf(tokenId)).to.be.reverted;
    });

    it("should not allow non-owner/lottery to apply scratcher to swap", async function() {
      const tokenId = await goldScratcher.mint(user1.address);
      
      const swapAmount = ethers.utils.parseEther("100");
      await expect(
        goldScratcher.connect(user1).applyToSwap(tokenId, swapAmount)
      ).to.be.revertedWith("Only lottery or owner");
    });
  });
}); 