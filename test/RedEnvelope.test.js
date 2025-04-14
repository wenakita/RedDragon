const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RedEnvelope", function () {
  let redEnvelope;
  let owner;
  let user1;
  let user2;
  let user3;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy RedEnvelope contract
    const RedEnvelope = await ethers.getContractFactory("RedEnvelope");
    redEnvelope = await RedEnvelope.deploy(
      "Red Dragon Red Envelope",
      "RDENV",
      "https://api.reddragon.xyz/redenvelope/"
    );
    await redEnvelope.deployed();
  });

  describe("Initialization", function() {
    it("should initialize with correct values", async function() {
      expect(await redEnvelope.name()).to.equal("Red Dragon Red Envelope");
      expect(await redEnvelope.symbol()).to.equal("RDENV");
      
      // Mint a token to test URI
      await redEnvelope.mint(user1.address, 1);
      expect(await redEnvelope.tokenURI(1)).to.equal("https://api.reddragon.xyz/redenvelope/1");
    });
  });

  describe("Minting", function() {
    it("should allow owner to mint envelopes", async function() {
      // Mint a common envelope (rarity 1)
      await redEnvelope.mint(user1.address, 1);
      
      // Check token ownership
      expect(await redEnvelope.ownerOf(1)).to.equal(user1.address);
      expect(await redEnvelope.balanceOf(user1.address)).to.equal(1);
      
      // Check envelope properties
      const props = await redEnvelope.envelopeProperties(1);
      expect(props.rarity).to.equal(1);
      expect(props.isEarlyAdopter).to.equal(false);
      expect(props.usageCount).to.equal(0);
    });

    it("should not allow non-owner to mint", async function() {
      await expect(
        redEnvelope.connect(user1).mint(user2.address, 1)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should not allow minting with invalid rarity", async function() {
      await expect(
        redEnvelope.mint(user1.address, 0)
      ).to.be.revertedWith("Invalid rarity");
      
      await expect(
        redEnvelope.mint(user1.address, 6)
      ).to.be.revertedWith("Invalid rarity");
    });
  });

  describe("Community Contributions", function() {
    it("should allow owner to record contributions", async function() {
      await redEnvelope.recordContribution(user1.address, 1000);
      expect(await redEnvelope.userContributions(user1.address)).to.equal(1000);
      expect(await redEnvelope.totalCommunityContributions()).to.equal(1000);
    });

    it("should not allow non-owner to record contributions", async function() {
      await expect(
        redEnvelope.connect(user1).recordContribution(user2.address, 1000)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Boost Calculation", function() {
    beforeEach(async function() {
      // Mint envelopes to test with
      await redEnvelope.mint(user1.address, 1); // Common
      await redEnvelope.mintWithEarlyAdopter(user2.address, 3, true);  // Rare + early adopter
      await redEnvelope.recordContribution(user2.address, 1000);
    });

    it("should correctly check red envelope ownership", async function() {
      expect(await redEnvelope.hasRedEnvelope(user1.address)).to.be.true;
      expect(await redEnvelope.hasRedEnvelope(user3.address)).to.be.false;
    });

    it("should calculate boost based on rarity", async function() {
      // Common envelope (rarity 1) should give 1.25x boost (100 + 25 = 125)
      expect(await redEnvelope.calculateBoost(user1.address)).to.equal(125);

      // Rare envelope (rarity 3) should give 1.75x boost (100 + 3*25 = 175) + 50 for early adopter = 225
      expect(await redEnvelope.calculateBoost(user2.address)).to.equal(225);
    });

    it("should return base boost for non-holders", async function() {
      expect(await redEnvelope.calculateBoost(user3.address)).to.equal(100);
    });
  });

  describe("Special Recipients", function() {
    it("should allow owner to mint special envelopes", async function() {
      const tx = await redEnvelope.mintSpecialEnvelopes(5); // Legendary rarity
      const receipt = await tx.wait();
      
      // Check that special envelopes were minted
      const specialRecipients = [
        "0x3291B1aE6B74d59a4334bBA0257873Dda5d18115",
        "0xD2AfB6Acb56f35AFB861114c74703c53Fe6217bd",
        "0x7e021Ec4c9aaaA433402683B4faFc0699179796b"
      ];
      
      for (let i = 0; i < specialRecipients.length; i++) {
        const tokenId = i + 1;
        expect(await redEnvelope.ownerOf(tokenId)).to.equal(specialRecipients[i]);
        
        const props = await redEnvelope.envelopeProperties(tokenId);
        expect(props.rarity).to.equal(5);
        expect(props.isEarlyAdopter).to.equal(true);
      }
    });

    it("should not allow non-owner to mint special envelopes", async function() {
      await expect(
        redEnvelope.connect(user1).mintSpecialEnvelopes(5)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Token URI", function() {
    it("should allow owner to update base URI", async function() {
      const newURI = "https://new-api.reddragon.xyz/redenvelope/";
      await redEnvelope.setBaseTokenURI(newURI);
      
      // Mint a token to test URI
      await redEnvelope.mint(user1.address, 1);
      expect(await redEnvelope.tokenURI(1)).to.equal(newURI + "1");
    });

    it("should not allow non-owner to update base URI", async function() {
      await expect(
        redEnvelope.connect(user1).setBaseTokenURI("new-uri")
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
}); 