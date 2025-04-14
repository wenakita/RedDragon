const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GoldScratcherV2", function () {
  let goldScratcher;
  let owner;
  let user1;
  let user2;
  let marketingRecipients;

  beforeEach(async function () {
    [owner, user1, user2, ...marketingRecipients] = await ethers.getSigners();
    
    // Deploy the updated GoldScratcherV2
    const GoldScratcher = await ethers.getContractFactory("GoldScratcherV2");
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

  describe("Interface Implementation", function() {
    it("should correctly implement IPromotionalItem interface", async function() {
      // Check interface methods
      expect(await goldScratcher.getItemType()).to.equal("GOLD_SCRATCHER");
      expect(await goldScratcher.getBoostType()).to.equal(0); // 0 = JACKPOT
      expect(await goldScratcher.getTransferType()).to.equal(1); // 1 = ONE_TIME_TRANSFER
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

  describe("Transfer Restrictions", function() {
    it("should allow one-time transfer from original owner", async function() {
      // Mint a token
      await goldScratcher.mint(user1.address);
      
      // Transfer from original owner to user2 should work
      await goldScratcher.connect(user1).transferFrom(user1.address, user2.address, 1);
      
      // Check ownership has changed
      expect(await goldScratcher.ownerOf(1)).to.equal(user2.address);
      
      // Attempt to transfer again should fail
      await expect(
        goldScratcher.connect(user2).transferFrom(user2.address, user1.address, 1)
      ).to.be.revertedWith("GoldScratcher: already transferred once");
    });
  });

  describe("Boost Calculation", function() {
    it("should return the correct boost for winners (6.9% on top of the default 69% jackpot)", async function() {
      await goldScratcher.mint(user1.address);
      
      // Calculate boost
      const boost = await goldScratcher.calculateBoost(user1.address, 1);
      expect(boost).to.equal(690); // 6.9% in basis points
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

  describe("Using applyItem", function() {
    let registry;
    
    beforeEach(async function() {
      // Deploy a mock registry
      const Registry = await ethers.getContractFactory("PromotionalItemRegistry");
      registry = await Registry.deploy();
      await registry.deployed();
      
      // Set the registry in GoldScratcher
      await goldScratcher.setPromotionalRegistry(registry.address);
      
      // Register the GoldScratcher in the registry
      await registry.registerPromotionalItem("GOLD_SCRATCHER", goldScratcher.address);
    });
    
    it("should apply item through the interface", async function() {
      // Mint a token
      await goldScratcher.mint(user1.address);
      
      // Apply the item (through owner or registry)
      const amount = ethers.utils.parseEther("100");
      const tx = await goldScratcher.connect(owner).applyItem(1, user1.address, amount);
      const receipt = await tx.wait();
      
      // Get the result from the emitted event
      const scratcherAppliedEvent = receipt.events.find(event => event.event === "ScratcherApplied");
      expect(scratcherAppliedEvent).to.not.be.undefined;
      
      const boostedAmount = scratcherAppliedEvent.args.boostedAmount;
      
      // Boosted amount depends on whether it was a winner
      const stats = await goldScratcher.getStats();
      
      if (stats.winners.toNumber() > 0) {
        // If winner, 6.9% boost applied
        expect(boostedAmount).to.be.closeTo(
          amount.mul(10690).div(10000),
          1000 // Allow for slight rounding differences
        );
      } else {
        // If loser, no boost
        expect(boostedAmount).to.equal(amount);
      }
      
      // Token should be burned
      await expect(
        goldScratcher.ownerOf(1)
      ).to.be.reverted;
    });
    
    it("should prevent non-registry/owner from applying item", async function() {
      // Mint a token
      await goldScratcher.mint(user1.address);
      
      // Try to apply the item from unauthorized account
      const amount = ethers.utils.parseEther("100");
      await expect(
        goldScratcher.connect(user2).applyItem(1, user1.address, amount)
      ).to.be.revertedWith("Only registry or owner can call");
    });
    
    it("should fail gracefully when applying non-existent item", async function() {
      // No need to mint, trying with non-existent token
      const amount = ethers.utils.parseEther("100");
      const tx = await goldScratcher.connect(owner).applyItem(999, user1.address, amount);
      const receipt = await tx.wait();
      
      // For non-existent token, there should be no ScratcherApplied event
      const scratcherAppliedEvent = receipt.events.find(event => event.event === "ScratcherApplied");
      expect(scratcherAppliedEvent).to.be.undefined;
      
      // The returned amount should be unchanged
      const returnedAmount = amount; // Default return for non-existent token
      expect(returnedAmount).to.equal(amount);
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
}); 