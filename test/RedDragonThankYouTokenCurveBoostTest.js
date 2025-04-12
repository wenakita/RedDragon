const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RedDragonThankYouToken Curve Boost", function () {
  let owner;
  let recipient;
  let otherUser;
  let mockLottery;
  let thankYouToken;
  
  // The specific recipient address that should be hardcoded in the contract
  const RECIPIENT_ADDRESS = "0x3291B1aE6B74d59a4334bBA0257873Dda5d18115";

  beforeEach(async function () {
    // Get signers
    [owner, otherUser] = await ethers.getSigners();

    // For testing, create a mock address to impersonate the recipient
    await ethers.provider.send("hardhat_impersonateAccount", [RECIPIENT_ADDRESS]);
    recipient = await ethers.provider.getSigner(RECIPIENT_ADDRESS);
    
    // Fund the recipient account for transactions
    await owner.sendTransaction({
      to: RECIPIENT_ADDRESS,
      value: ethers.utils.parseEther("1.0")
    });
    
    // Deploy a mock lottery contract that supports boost calculation
    const MockLottery = await ethers.getContractFactory("MockRedDragonSwapLottery");
    mockLottery = await MockLottery.deploy(
      ethers.constants.AddressZero, // Mock wS token address
      ethers.constants.AddressZero  // Mock verifier address
    );
    
    // Create method signatures for PaintSwap VRF
    const methodSignatures = [
      "0x01e1d114", // requestRandomness()
      "0x13d4bc24"  // fulfillRandomness(bytes32,uint256[])
    ];
    
    // Deploy the thank you token
    const ThankYouToken = await ethers.getContractFactory("RedDragonThankYouToken");
    thankYouToken = await ThankYouToken.deploy(
      mockLottery.address,
      ethers.constants.AddressZero, // We won't use actual VRF for this test
      methodSignatures,
      "Thank you token with 0.69% boost"
    );
    
    // Configure lottery to use the thank you token
    await mockLottery.setThankYouToken(thankYouToken.address);
  });

  describe("Probability Boost in Lottery", function() {
    it("Should apply 0.69% boost to base probability", async function () {
      // Base probability of 5% (50 out of 1000)
      const baseProbability = 50;
      
      // First we need a token minted to the recipient
      // Since we can't use VRF in tests easily, we'll create a special mint function
      // for testing that mints directly to the recipient
      await mintTokenToRecipient();
      
      // Calculate probability with mock lottery's calculateProbability function
      // This would internally call the thank you token's calculateBoost
      const calculatedProbability = await mockLottery.calculateProbabilityWithBoosts(
        RECIPIENT_ADDRESS,
        baseProbability
      );
      
      // Expected probability: baseProbability * (1 + 69/10000) = baseProbability * 1.0069
      const expectedProbability = Math.floor(baseProbability * 1.0069);
      expect(calculatedProbability).to.equal(expectedProbability);
    });
    
    it("Should not apply boost to users without token", async function () {
      // Base probability of 5% (50 out of 1000)
      const baseProbability = 50;
      
      // Calculate probability without token
      const calculatedProbability = await mockLottery.calculateProbabilityWithBoosts(
        otherUser.address,
        baseProbability
      );
      
      // Expected probability should be unchanged
      expect(calculatedProbability).to.equal(baseProbability);
    });
    
    it("Should apply boost correctly for different base probabilities", async function () {
      // Various base probabilities to test
      const testCases = [
        { base: 10, expected: 10 }, // 1% probability (boost too small to see at this level)
        { base: 30, expected: 30 }, // 3% probability (boost too small)
        { base: 50, expected: 50 }, // 5% probability (boost rounds down to 0)
        { base: 100, expected: 101 }, // 10% probability (boost = 0.69 rounds to 1)
        { base: 500, expected: 503 } // 50% probability (boost = 3.45 rounds to 3)
      ];
      
      // First mint the token to the recipient
      await mintTokenToRecipient();
      
      // Test each case
      for (const testCase of testCases) {
        const calculatedProbability = await mockLottery.calculateProbabilityWithBoosts(
          RECIPIENT_ADDRESS,
          testCase.base
        );
        
        // For very small base values, the boost may be too small to reflect in the result
        // due to integer arithmetic
        expect(calculatedProbability).to.equal(testCase.expected);
      }
    });
    
    it("Should cap boosted probability at max allowed", async function () {
      // Base probability near maximum (95%)
      const baseProbability = 950;
      const MAX_PROBABILITY = 1000; // Assuming 100% is max
      
      // Mint token to recipient
      await mintTokenToRecipient();
      
      // Calculate probability with boost
      const calculatedProbability = await mockLottery.calculateProbabilityWithBoosts(
        RECIPIENT_ADDRESS,
        baseProbability
      );
      
      // Expected: baseProbability + boost, but capped at MAX_PROBABILITY
      const rawBoostedProbability = Math.floor(baseProbability * 1.0069);
      const expectedProbability = Math.min(rawBoostedProbability, MAX_PROBABILITY);
      
      expect(calculatedProbability).to.equal(expectedProbability);
      expect(calculatedProbability).to.be.at.most(MAX_PROBABILITY);
    });
  });
  
  // Helper function to mint token to recipient without using VRF
  async function mintTokenToRecipient() {
    // Mock the minting process by setting storage directly
    await ethers.provider.send("hardhat_setStorageAt", [
      thankYouToken.address,
      // Storage slot for hasMinted
      "0x4", // This may need adjustment based on contract storage layout
      "0x0000000000000000000000000000000000000000000000000000000000000001" // true
    ]);
    
    // Mint token directly (skipping VRF)
    const ABI = ["function mint() external"];
    const iface = new ethers.utils.Interface(ABI);
    const data = iface.encodeFunctionData("mint", []);
    
    // Send transaction to mint
    await owner.sendTransaction({
      to: thankYouToken.address,
      data: data
    });
    
    // Verify token was minted
    expect(await thankYouToken.balanceOf(RECIPIENT_ADDRESS)).to.equal(1);
  }
}); 