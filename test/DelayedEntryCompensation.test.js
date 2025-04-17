const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DelayedEntryCompensation", function () {
  let DelayedEntryCompensation, compensation;
  let owner, user1, user2, user3;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy the compensation contract
    DelayedEntryCompensation = await ethers.getContractFactory("DelayedEntryCompensation");
    compensation = await DelayedEntryCompensation.deploy();
    await compensation.deployed();
  });

  describe("Basic Functionality", function () {
    it("should have correct name and symbol", async function () {
      expect(await compensation.name()).to.equal("Whitelist Dragon");
      expect(await compensation.symbol()).to.equal("WHITEDRAGON");
    });

    it("should allow the owner to register delayed entries and mint tokens", async function () {
      const swapAmount = ethers.utils.parseEther("10");
      
      // Register a delayed entry
      await expect(compensation.registerDelayedEntry(user1.address, swapAmount))
        .to.emit(compensation, "DelayedEntryRegistered")
        .withArgs(user1.address, swapAmount, 0, 1);
      
      // Verify token was minted to user1
      expect(await compensation.ownerOf(1)).to.equal(user1.address);
      
      // Verify entry details
      const entry = await compensation.getEntryDetails(0);
      expect(entry.user).to.equal(user1.address);
      expect(entry.swapAmount).to.equal(swapAmount);
      expect(entry.redeemed).to.be.false;
    });

    it("should not allow non-owners to register entries", async function () {
      await expect(
        compensation.connect(user1).registerDelayedEntry(user2.address, ethers.utils.parseEther("5"))
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should track entries correctly by user", async function () {
      // Register multiple entries for the same user
      await compensation.registerDelayedEntry(user1.address, ethers.utils.parseEther("5"));
      await compensation.registerDelayedEntry(user1.address, ethers.utils.parseEther("10"));
      await compensation.registerDelayedEntry(user2.address, ethers.utils.parseEther("15"));
      
      // Check user entries
      const user1Entries = await compensation.getUserEntries(user1.address);
      expect(user1Entries.length).to.equal(2);
      expect(user1Entries[0]).to.equal(0);
      expect(user1Entries[1]).to.equal(1);
      
      const user2Entries = await compensation.getUserEntries(user2.address);
      expect(user2Entries.length).to.equal(1);
      expect(user2Entries[0]).to.equal(2);
    });
  });

  describe("Whitelist Functionality", function () {
    beforeEach(async function () {
      // Register entries for testing
      await compensation.registerDelayedEntry(user1.address, ethers.utils.parseEther("10"));
      await compensation.registerDelayedEntry(user2.address, ethers.utils.parseEther("20"));
    });

    it("should add users to whitelist when claiming compensation", async function () {
      const swapAmount = ethers.utils.parseEther("10");
      
      // Before claiming, user should not be whitelisted
      let whitelist = await compensation.checkWhitelist(user1.address);
      expect(whitelist.isWhitelisted).to.be.false;
      expect(whitelist.amount).to.equal(0);
      
      // Claim compensation
      await expect(compensation.connect(user1).claimCompensation(1))
        .to.emit(compensation, "AddedToWhitelist")
        .withArgs(user1.address, swapAmount);
      
      // Verify user is now whitelisted
      whitelist = await compensation.checkWhitelist(user1.address);
      expect(whitelist.isWhitelisted).to.be.true;
      expect(whitelist.amount).to.equal(swapAmount);
      
      // Verify entry is marked as redeemed
      const entry = await compensation.getEntryDetails(0);
      expect(entry.redeemed).to.be.true;
      
      // Verify redemption status
      expect(await compensation.redemptionStatus(1)).to.be.true;
    });
    
    it("should not allow claiming someone else's ticket", async function () {
      await expect(
        compensation.connect(user2).claimCompensation(1)
      ).to.be.revertedWith("Not token owner");
    });
    
    it("should not allow claiming the same ticket twice", async function () {
      // Claim once
      await compensation.connect(user1).claimCompensation(1);
      
      // Try to claim again
      await expect(
        compensation.connect(user1).claimCompensation(1)
      ).to.be.revertedWith("Already redeemed");
    });
    
    it("should accumulate whitelist amounts when multiple tickets are claimed", async function () {
      // Register a second entry for user1
      const amount1 = ethers.utils.parseEther("10");
      const amount2 = ethers.utils.parseEther("15");
      await compensation.registerDelayedEntry(user1.address, amount2);
      
      // Claim first ticket
      await compensation.connect(user1).claimCompensation(1);
      
      // Check whitelist after first claim
      let whitelist = await compensation.checkWhitelist(user1.address);
      expect(whitelist.isWhitelisted).to.be.true;
      expect(whitelist.amount).to.equal(amount1);
      
      // Claim second ticket
      await compensation.connect(user1).claimCompensation(3);
      
      // Check whitelist after second claim
      whitelist = await compensation.checkWhitelist(user1.address);
      expect(whitelist.isWhitelisted).to.be.true;
      expect(whitelist.amount).to.equal(amount1.add(amount2));
    });
    
    it("should allow owner to manually add addresses to whitelist", async function () {
      const manualAmount = ethers.utils.parseEther("50");
      
      // Add user3 to whitelist manually
      await expect(compensation.addToWhitelist(user3.address, manualAmount))
        .to.emit(compensation, "AddedToWhitelist")
        .withArgs(user3.address, manualAmount);
      
      // Check whitelist status
      const whitelist = await compensation.checkWhitelist(user3.address);
      expect(whitelist.isWhitelisted).to.be.true;
      expect(whitelist.amount).to.equal(manualAmount);
    });
    
    it("should allow owner to remove addresses from whitelist", async function () {
      // First add to whitelist
      await compensation.addToWhitelist(user3.address, ethers.utils.parseEther("50"));
      
      // Now remove from whitelist
      await compensation.removeFromWhitelist(user3.address);
      
      // Check whitelist status
      const whitelist = await compensation.checkWhitelist(user3.address);
      expect(whitelist.isWhitelisted).to.be.false;
      // Amount should still be there for historical purposes
      expect(whitelist.amount).to.equal(ethers.utils.parseEther("50"));
    });
    
    it("should track total whitelist count", async function () {
      // Initially no whitelisted addresses
      expect(await compensation.getWhitelistCount()).to.equal(0);
      
      // Claim compensation to get whitelisted
      await compensation.connect(user1).claimCompensation(1);
      await compensation.connect(user2).claimCompensation(2);
      
      // Check count
      expect(await compensation.getWhitelistCount()).to.equal(2);
      
      // Add one more manually
      await compensation.addToWhitelist(user3.address, ethers.utils.parseEther("5"));
      
      // This doesn't increase the count since it's tracked through redeemed entries
      // For a production implementation, the count should be tracked separately
      expect(await compensation.getWhitelistCount()).to.equal(2);
    });
  });

  describe("Token Functionality", function () {
    beforeEach(async function () {
      // Register some entries
      await compensation.registerDelayedEntry(user1.address, ethers.utils.parseEther("10"));
      await compensation.registerDelayedEntry(user1.address, ethers.utils.parseEther("20"));
    });
    
    it("should allow token transfers", async function () {
      // Transfer token from user1 to user3
      await compensation.connect(user1).transferFrom(user1.address, user3.address, 1);
      
      // Verify ownership change
      expect(await compensation.ownerOf(1)).to.equal(user3.address);
    });
    
    it("should track token balances correctly", async function () {
      expect(await compensation.balanceOf(user1.address)).to.equal(2);
      expect(await compensation.balanceOf(user2.address)).to.equal(0);
      
      // Transfer a token
      await compensation.connect(user1).transferFrom(user1.address, user2.address, 1);
      
      // Check updated balances
      expect(await compensation.balanceOf(user1.address)).to.equal(1);
      expect(await compensation.balanceOf(user2.address)).to.equal(1);
    });
    
    it("should allow the owner to set the base URI", async function () {
      // Set a new base URI
      const newBaseURI = "https://new-uri.example/";
      await compensation.setBaseURI(newBaseURI);
      
      // Get token URI and verify it uses the new base URI
      // Note: This assumes the tokenURI function follows the ERC721 standard pattern
      const tokenId = 1;
      const tokenURI = await compensation.tokenURI(tokenId);
      expect(tokenURI).to.equal(`${newBaseURI}${tokenId}`);
    });

    it("should have the correct initial base URI", async function () {
      // Get token URI and verify it uses the correct base URI
      const tokenId = 1;
      const tokenURI = await compensation.tokenURI(tokenId);
      expect(tokenURI).to.equal(`https://sonicreddragon.io/white/${tokenId}`);
    });
  });

  describe("Integration Scenarios", function () {
    it("should handle a complete lifecycle with token transfer and whitelist", async function () {
      // 1. Register an entry
      const swapAmount = ethers.utils.parseEther("50");
      await compensation.registerDelayedEntry(user1.address, swapAmount);
      
      // 2. Verify entry and token
      expect(await compensation.ownerOf(1)).to.equal(user1.address);
      const entry = await compensation.getEntryDetails(0);
      expect(entry.swapAmount).to.equal(swapAmount);
      
      // 3. Transfer token to another user
      await compensation.connect(user1).transferFrom(user1.address, user2.address, 1);
      expect(await compensation.ownerOf(1)).to.equal(user2.address);
      
      // 4. New owner claims compensation and gets whitelisted
      await compensation.connect(user2).claimCompensation(1);
      
      // 5. Verify whitelist status
      const whitelist = await compensation.checkWhitelist(user2.address);
      expect(whitelist.isWhitelisted).to.be.true;
      expect(whitelist.amount).to.equal(swapAmount);
      
      // 6. Verify the original owner is not whitelisted
      const whitelist1 = await compensation.checkWhitelist(user1.address);
      expect(whitelist1.isWhitelisted).to.be.false;
      
      // 7. Verify redemption status
      expect(await compensation.redemptionStatus(1)).to.be.true;
      const updatedEntry = await compensation.getEntryDetails(0);
      expect(updatedEntry.redeemed).to.be.true;
    });
  });
}); 