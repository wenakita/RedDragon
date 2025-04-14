const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RedDragonThankYouTokenMulti", function () {
  let thankYouToken;
  let lottery;
  let mockPaintSwapVRF;
  let owner;
  let recipient1;
  let recipient2;
  let user;

  const THANK_YOU_MESSAGE = "Thank you for your contribution to the RedDragon ecosystem";
  
  beforeEach(async function () {
    [owner, recipient1, recipient2, user] = await ethers.getSigners();

    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const wrappedSonic = await MockERC20.deploy("Wrapped Sonic", "wS", ethers.utils.parseEther("1000000"));
    await wrappedSonic.deployed();

    // Deploy mock PaintSwap VRF
    const MockPaintSwapVRF = await ethers.getContractFactory("MockPaintSwapVRF");
    mockPaintSwapVRF = await MockPaintSwapVRF.deploy();
    await mockPaintSwapVRF.deployed();

    // Deploy mock lottery
    const MockRedDragonSwapLottery = await ethers.getContractFactory("MockRedDragonSwapLottery");
    lottery = await MockRedDragonSwapLottery.deploy(wrappedSonic.address, mockPaintSwapVRF.address);
    await lottery.deployed();

    // Method signatures to commemorate
    const methodSignatures = [
      "0x12345678", // Example method signature
      "0x87654321"  // Example method signature
    ];

    // Deploy ThankYouToken
    const RedDragonThankYouTokenMulti = await ethers.getContractFactory("RedDragonThankYouTokenMulti");
    thankYouToken = await RedDragonThankYouTokenMulti.deploy(
      lottery.address,
      mockPaintSwapVRF.address,
      methodSignatures,
      THANK_YOU_MESSAGE
    );
    await thankYouToken.deployed();

    // Override recipients with our test addresses (this would normally be in the constructor,
    // but for testing purposes we need to use our test addresses)
    await thankYouToken.updateRecipients([recipient1.address, recipient2.address]);
  });

  describe("Initialization", function() {
    it("should initialize with correct values", async function() {
      expect(await thankYouToken.name()).to.equal("RedDragon Thank You Token");
      expect(await thankYouToken.symbol()).to.equal("RDTHANKS");
      expect(await thankYouToken.lottery()).to.equal(lottery.address);
      expect(await thankYouToken.paintSwapVRF()).to.equal(mockPaintSwapVRF.address);
      expect(await thankYouToken.thankYouMessage()).to.equal(THANK_YOU_MESSAGE);
      expect(await thankYouToken.hasMinted()).to.equal(false);
      
      // Check recipients
      expect(await thankYouToken.recipients(0)).to.equal(recipient1.address);
      expect(await thankYouToken.recipients(1)).to.equal(recipient2.address);
      
      // Check commemorated method signatures
      expect(await thankYouToken.commemoratedMethodSignatures(0)).to.equal("0x12345678");
      expect(await thankYouToken.commemoratedMethodSignatures(1)).to.equal("0x87654321");
    });
  });

  describe("VRF Minting", function() {
    it("should request randomness when starting mint with VRF", async function() {
      // Starting mint should request randomness from PaintSwap VRF
      const tx = await thankYouToken.startMintWithVRF();
      
      // Verify RandomnessRequested event was emitted
      const receipt = await tx.wait();
      const requestEvent = receipt.events.find(e => e.event === "RandomnessRequested");
      expect(requestEvent).to.not.be.undefined;
      
      // Get the request ID
      const requestId = requestEvent.args.requestId;
      
      // Check pending mint was created
      const pendingMint = await thankYouToken.pendingMints(requestId);
      expect(pendingMint.message).to.equal(THANK_YOU_MESSAGE);
    });
    
    it("should mint tokens when randomness is fulfilled", async function() {
      // Start minting process
      const tx = await thankYouToken.startMintWithVRF();
      const receipt = await tx.wait();
      const requestEvent = receipt.events.find(e => e.event === "RandomnessRequested");
      const requestId = requestEvent.args.requestId;
      
      // Simulate VRF callback
      const randomValues = [ethers.BigNumber.from("12345")];
      await mockPaintSwapVRF.fulfillRandomnessForContract(thankYouToken.address, requestId, randomValues);
      
      // Check tokens were minted
      expect(await thankYouToken.balanceOf(recipient1.address)).to.equal(1);
      expect(await thankYouToken.balanceOf(recipient2.address)).to.equal(1);
      expect(await thankYouToken.ownerOf(0)).to.equal(recipient1.address);
      expect(await thankYouToken.ownerOf(1)).to.equal(recipient2.address);
      
      // Check minting state
      expect(await thankYouToken.hasMinted()).to.equal(true);
    });
    
    it("should not allow minting twice", async function() {
      // First mint
      await thankYouToken.startMintWithVRF();
      
      // Try to mint again
      await expect(
        thankYouToken.startMintWithVRF()
      ).to.be.revertedWith("Token has already been minted");
    });
    
    it("should only allow VRF provider to fulfill randomness", async function() {
      // Start minting process
      const tx = await thankYouToken.startMintWithVRF();
      const receipt = await tx.wait();
      const requestEvent = receipt.events.find(e => e.event === "RandomnessRequested");
      const requestId = requestEvent.args.requestId;
      
      // Try to fulfill randomness directly (not from VRF provider)
      const randomValues = [ethers.BigNumber.from("12345")];
      await expect(
        thankYouToken.fulfillRandomness(requestId, randomValues)
      ).to.be.revertedWith("Only VRF provider can fulfill");
    });
  });

  describe("Manual Minting", function() {
    it("should allow manual minting in case of VRF failure", async function() {
      // Mint manually
      await thankYouToken.manualMintWithoutVRF();
      
      // Check tokens were minted
      expect(await thankYouToken.balanceOf(recipient1.address)).to.equal(1);
      expect(await thankYouToken.balanceOf(recipient2.address)).to.equal(1);
      expect(await thankYouToken.ownerOf(0)).to.equal(recipient1.address);
      expect(await thankYouToken.ownerOf(1)).to.equal(recipient2.address);
      
      // Check minting state
      expect(await thankYouToken.hasMinted()).to.equal(true);
    });
    
    it("should not allow manual minting if already minted", async function() {
      // First manual mint
      await thankYouToken.manualMintWithoutVRF();
      
      // Try to mint again
      await expect(
        thankYouToken.manualMintWithoutVRF()
      ).to.be.revertedWith("Token has already been minted");
    });
    
    it("should not allow non-owners to manually mint", async function() {
      await expect(
        thankYouToken.connect(user).manualMintWithoutVRF()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Metadata", function() {
    it("should allow owner to set base URI", async function() {
      const baseURI = "https://reddragon.com/nft/";
      await thankYouToken.setBaseURI(baseURI);
      
      // Mint tokens
      await thankYouToken.manualMintWithoutVRF();
      
      // Check token URI
      expect(await thankYouToken.tokenURI(0)).to.equal(baseURI + "0");
      expect(await thankYouToken.tokenURI(1)).to.equal(baseURI + "1");
    });
    
    it("should not allow setting token URI for non-existent tokens", async function() {
      await thankYouToken.setBaseURI("https://reddragon.com/nft/");
      
      // Token hasn't been minted yet
      await expect(
        thankYouToken.tokenURI(0)
      ).to.be.revertedWith("Token does not exist");
    });
  });

  describe("Boost Functionality", function() {
    it("should correctly check if an address has a thank you token", async function() {
      // Initially no one has tokens
      expect(await thankYouToken.hasThankYouToken(recipient1.address)).to.equal(false);
      expect(await thankYouToken.hasThankYouToken(recipient2.address)).to.equal(false);
      
      // Mint tokens
      await thankYouToken.manualMintWithoutVRF();
      
      // Now recipients should have tokens
      expect(await thankYouToken.hasThankYouToken(recipient1.address)).to.equal(true);
      expect(await thankYouToken.hasThankYouToken(recipient2.address)).to.equal(true);
      expect(await thankYouToken.hasThankYouToken(user.address)).to.equal(false);
    });
    
    it("should return the correct boost value", async function() {
      // Mint tokens
      await thankYouToken.manualMintWithoutVRF();
      
      // Check boost calculation
      expect(await thankYouToken.calculateBoost(recipient1.address)).to.equal(69); // 0.69% boost
      expect(await thankYouToken.calculateBoost(user.address)).to.equal(0); // No boost
    });
  });

  describe("Access Control", function() {
    it("should not allow non-owners to update recipients", async function() {
      await expect(
        thankYouToken.connect(user).updateRecipients([user.address])
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    
    it("should allow owner to update commemorated method signatures", async function() {
      const newSignatures = ["0xabcdef12", "0x34567890"];
      await thankYouToken.updateMethodSignatures(newSignatures);
      
      // Check updated signatures
      expect(await thankYouToken.commemoratedMethodSignatures(0)).to.equal("0xabcdef12");
      expect(await thankYouToken.commemoratedMethodSignatures(1)).to.equal("0x34567890");
    });
  });
}); 