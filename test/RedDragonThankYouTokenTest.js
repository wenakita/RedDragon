const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RedDragonThankYouToken", function () {
  let owner;
  let otherUser;
  let thankYouToken;
  let thankYouMessage;
  let methodSignatures;
  
  // The specific recipient address that should be hardcoded in the contract
  const RECIPIENT_ADDRESS = "0x3291B1aE6B74d59a4334bBA0257873Dda5d18115";

  beforeEach(async function () {
    // Get signers
    [owner, otherUser] = await ethers.getSigners();
    
    // Create method signatures for the PaintSwap VRF integration
    // These are the key method signatures from the VRF integration
    methodSignatures = [
      // requestRandomness() - First 4 bytes of keccak256("requestRandomness()")
      "0x01e1d114",
      // fulfillRandomness(bytes32,uint256[]) - First 4 bytes of keccak256("fulfillRandomness(bytes32,uint256[])")
      "0x13d4bc24"
    ];
    
    // Thank you message focusing on methodology
    thankYouMessage = "Thank you for providing PaintSwap VRF integration method. This token grants a 0.69% boost.";
    
    // Deploy SimpleThankYouToken - our simplified test implementation
    const ThankYouToken = await ethers.getContractFactory("SimpleThankYouToken", owner);
    thankYouToken = await ThankYouToken.deploy(thankYouMessage, methodSignatures);
  });

  describe("Basic Properties", function() {
    it("Should store the correct recipient address", async function () {
      expect(await thankYouToken.RECIPIENT()).to.equal(RECIPIENT_ADDRESS);
    });

    it("Should store the correct thank you message", async function () {
      expect(await thankYouToken.thankYouMessage()).to.equal(thankYouMessage);
    });
    
    it("Should commemorate the VRF method signatures", async function () {
      // Verify the method signatures are stored correctly
      expect(await thankYouToken.getCommemorationCount()).to.equal(2);
      expect(await thankYouToken.commemoratedMethodSignatures(0)).to.equal(methodSignatures[0]);
      expect(await thankYouToken.commemoratedMethodSignatures(1)).to.equal(methodSignatures[1]);
    });

    it("Should not be minted initially", async function () {
      expect(await thankYouToken.hasMinted()).to.equal(false);
    });
    
    it("Should have the correct boost amount", async function () {
      expect(await thankYouToken.THANK_YOU_BOOST()).to.equal(69); // 0.69% boost as 69/10000
      expect(await thankYouToken.BOOST_PRECISION()).to.equal(10000);
    });
  });

  describe("Token Minting", function() {
    it("Should allow minting the token", async function () {
      await thankYouToken.mint();
      
      // Verify token was minted
      expect(await thankYouToken.hasMinted()).to.equal(true);
      expect(await thankYouToken.balanceOf(RECIPIENT_ADDRESS)).to.equal(1);
    });
    
    it("Should not allow minting twice", async function () {
      await thankYouToken.mint();
      await expect(thankYouToken.mint()).to.be.revertedWith("Token already minted");
    });
  });

  describe("Boost Functionality", function() {
    it("Should provide 0.69% boost to token holder", async function () {
      // First mint the token to the recipient
      await thankYouToken.mint();
      
      // Check the boost
      const boost = await thankYouToken.calculateBoost(RECIPIENT_ADDRESS);
      expect(boost).to.equal(69); // 0.69% as 69/10000
    });

    it("Should return 0 boost for non-token holder", async function () {
      const boost = await thankYouToken.calculateBoost(otherUser.address);
      expect(boost).to.equal(0);
    });
  });

  describe("Ownership Verification", function() {
    it("Should verify if an address has a thank you token", async function () {
      // First mint the token
      await thankYouToken.mint();
      
      // Check token ownership
      expect(await thankYouToken.hasThankYouToken(RECIPIENT_ADDRESS)).to.equal(true);
      expect(await thankYouToken.hasThankYouToken(otherUser.address)).to.equal(false);
    });
    
    it("Should mint the token specifically to the recipient", async function () {
      await thankYouToken.mint();
      
      // Verify token goes to correct address
      expect(await thankYouToken.ownerOf(0)).to.equal(RECIPIENT_ADDRESS);
    });
  });
}); 